/** Structured plant description returned by /api/plant-info (Groq). */
export type PlantInfoSections = {
  overview: string;
  advantages: string[];
  disadvantages: string[];
  uses_and_care_tips: string;
  traditional_or_cultural_notes: string;
  identification_and_safety: string;
  disclaimer: string;
};

export type PlantInfoFocus =
  | "balanced"
  | "gardening"
  | "ecology"
  | "cultural"
  | "concise"
  | "custom";

export type WebSearchProvider = "serpapi" | "google_cse" | null;

export type WebSearchHit = {
  title: string;
  snippet: string;
  url: string;
};

export type PlantInfoWebSearch = {
  requested: boolean;
  used: boolean;
  provider: WebSearchProvider;
  results: WebSearchHit[];
  /** Why search was skipped (e.g. no API keys). */
  note?: string;
};

export type PlantInfoResponse = {
  text: string;
  sections: PlantInfoSections | null;
  focus: PlantInfoFocus;
  /** Present when focus is "custom" — the user's own question */
  customQuestion?: string;
  focusLabel?: string;
  model?: string;
  degraded?: boolean;
  degradedReason?: "provider_unavailable" | "missing_api_key";
  warning?: string;
  /** Quick bullets shown in draft-mode UI */
  highlights?: string[];
  webSearch: PlantInfoWebSearch;
  /**
   * Only present when focus === "custom".
   * "short" = one-shot factual answer (concise Q&A);
   * "full"  = multi-section detailed report.
   */
  answerMode?: "short" | "full";
};
