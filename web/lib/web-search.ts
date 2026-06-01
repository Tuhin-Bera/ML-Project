/**
 * Optional web context for Gemini (replaces fragile Google HTML scraping from Colab).
 * Prefer SerpAPI (same idea as pip `google-search-results`) or Google Programmable Search.
 */

import type { WebSearchHit } from "@/types/plant-info";

export type WebSearchOutcome = {
  provider: "serpapi" | "google_cse" | null;
  results: WebSearchHit[];
};

function normalizeHttpUrl(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

async function serpApiSearch(
  query: string,
  apiKey: string,
  num: number,
): Promise<WebSearchHit[]> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("num", String(Math.min(Math.max(num, 1), 10)));

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`SerpAPI HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    organic_results?: Array<{ title?: string; snippet?: string; link?: string }>;
    error?: string;
  };
  if (data.error) throw new Error(data.error);
  const organic = data.organic_results ?? [];
  return organic.slice(0, num)
    .map((r) => ({
      title: (r.title ?? "Untitled").trim() || "Untitled",
      snippet: (r.snippet ?? "").trim(),
      url: normalizeHttpUrl(r.link),
    }))
    .filter((r) => r.url.length > 0);
}

async function googleCseSearch(
  query: string,
  apiKey: string,
  cx: string,
  num: number,
): Promise<WebSearchHit[]> {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(Math.min(Math.max(num, 1), 10)));

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Google CSE HTTP ${res.status} ${err.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    items?: Array<{ title?: string; snippet?: string; link?: string }>;
  };
  const items = data.items ?? [];
  return items.map((r) => ({
    title: (r.title ?? "Untitled").trim() || "Untitled",
    snippet: (r.snippet ?? "").trim(),
    url: normalizeHttpUrl(r.link),
  })).filter((r) => r.url.length > 0);
}

export function formatSearchContext(results: WebSearchHit[]): string {
  if (!results.length) return "";
  const lines = [
    "Here are relevant web search snippets (may be incomplete or wrong; do not treat as medical advice):",
    "",
  ];
  results.forEach((r, i) => {
    lines.push(`${i + 1}. ${r.title}`);
    lines.push(`   ${r.snippet || "(no snippet)"}`);
    lines.push(`   URL: ${r.url}`);
    lines.push("");
  });
  return lines.join("\n");
}

/**
 * Run web search using the first available provider in env.
 */
export async function webSearchPlantContext(
  plantName: string,
  maxResults: number,
): Promise<WebSearchOutcome> {
  const q = `${plantName} plant botany uses cultivation toxicity ornamental`;

  const serp = process.env.SERPAPI_API_KEY?.trim();
  if (serp) {
    const results = await serpApiSearch(q, serp, maxResults);
    return { provider: "serpapi", results };
  }

  const cseKey = process.env.GOOGLE_CSE_API_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_ID?.trim();
  if (cseKey && cx) {
    const results = await googleCseSearch(q, cseKey, cx, maxResults);
    return { provider: "google_cse", results };
  }

  return { provider: null, results: [] };
}
