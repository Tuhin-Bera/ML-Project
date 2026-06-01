"use client";

import { useId } from "react";
import type { PlantInfoFocus, PlantInfoSections } from "@/types/plant-info";
import { customTopicLabel } from "@/lib/custom-question";
import { resolveDisplayBlocks, type PlantDisplayBlock } from "@/lib/plant-display";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  focus: PlantInfoFocus;
  focusLabel: string | null;
  customQuestion?: string | null;
  sections: PlantInfoSections;
  degraded: boolean;
  warning: string | null;
  highlights: string[];
  /** The model identifier returned by the API, e.g. "llama3-70b-8192" */
  model?: string | null;
};

type Tone = "positive" | "caution" | "neutral";

// ─── Style helpers ────────────────────────────────────────────────────────────

function toneClasses(tone: Tone): string {
  switch (tone) {
    case "positive":
      return "border-emerald-900/40 bg-emerald-950/15";
    case "caution":
      return "border-amber-900/40 bg-amber-950/15";
    default:
      return "border-violet-900/40 bg-violet-950/10";
  }
}

function toneTitleClass(tone: Tone): string {
  switch (tone) {
    case "positive":
      return "text-emerald-400";
    case "caution":
      return "text-amber-400";
    default:
      return "text-violet-300";
  }
}

function toneNumClass(tone: Tone): string {
  switch (tone) {
    case "positive":
      return "text-emerald-500";
    case "caution":
      return "text-amber-500";
    default:
      return "text-violet-400";
  }
}

/** Derive a short human-readable model label from the raw model string. */
function modelLabel(model: string | null | undefined): string {
  if (!model || model === "fallback-template") return "Draft";
  // Strip common prefixes/suffixes for readability
  return model
    .replace(/^(accounts\/[^/]+\/models\/)?/, "")
    .replace(/-\d{8}$/, "")          // date suffix e.g. -20250514
    .replace(/-latest$/, "")
    .replace(/^claude-/, "Claude ")
    .replace(/^llama3?-/, "Llama ")
    .replace(/^gemma2?-/, "Gemma ")
    .replace(/^mixtral-/, "Mixtral ")
    .replace(/-\d+b(-.*)?$/, (m) => m.replace(/-/, " ")) // "70b-8192" → " 70b"
    .trim();
}

// ─── BulletList ───────────────────────────────────────────────────────────────

function BulletList({
  items,
  tone,
  labelledBy,
}: {
  items: string[];
  tone: Tone;
  labelledBy?: string;
}) {
  const numColor = toneNumClass(tone);
  return (
    <ul className="mt-3 space-y-2.5" aria-labelledby={labelledBy}>
      {items.map((x, i) => (
        <li key={`${i}-${x.slice(0, 24)}`} className="flex gap-3 text-zinc-300">
          <span aria-hidden="true" className={`shrink-0 font-semibold tabular-nums ${numColor}`}>
            {i + 1}.
          </span>
          <span className="leading-relaxed">{x}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── RenderBlock ──────────────────────────────────────────────────────────────

/**
 * Renders one display block. `visibleIndex` is the 1-based count of blocks
 * that have actually rendered content — so numbering never has gaps.
 */
function RenderBlock({
  block,
  sections,
  visibleIndex,
}: {
  block: PlantDisplayBlock;
  sections: PlantInfoSections;
  visibleIndex: number;
}) {
  const headingId = useId();
  const num = visibleIndex;

  // ── paragraph ──
  if (block.kind === "paragraph") {
    const raw = sections[block.field as keyof PlantInfoSections];
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!text) return null;

    const isDisclaimer = block.field === "disclaimer";
    const isHero = block.emphasis === "hero";
    const isShortAnswer = block.field === "overview";
    const isSteps = block.field === "traditional_or_cultural_notes";

    const wrapperClass = isDisclaimer
      ? "rounded-lg border border-zinc-700/70 bg-zinc-900/50 p-4"
      : isHero
        ? "rounded-xl border border-emerald-800/40 bg-gradient-to-br from-emerald-950/30 to-zinc-950/60 p-6 shadow-sm"
        : isShortAnswer
          ? "rounded-xl border border-violet-800/35 bg-violet-950/15 p-5"
          : isSteps
            ? "rounded-xl border border-sky-900/35 bg-sky-950/15 p-5"
            : "rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-5";

    const headingClass = isDisclaimer
      ? "text-zinc-500"
      : isHero
        ? "text-emerald-400/95"
        : isShortAnswer
          ? "text-violet-300"
          : isSteps
            ? "text-sky-300"
            : "text-emerald-400/95";

    const bodyClass = isDisclaimer
      ? "text-xs text-zinc-400"
      : isHero
        ? "text-[15px] leading-7 text-zinc-100"
        : isShortAnswer
          ? "text-sm font-medium text-zinc-200"
          : "text-sm text-zinc-300";

    return (
      <section aria-labelledby={headingId} className={wrapperClass}>
        <h3 id={headingId} className={`text-xs font-semibold uppercase tracking-wider ${headingClass}`}>
          {num}. {block.title}
        </h3>
        <p className={`mt-3 leading-relaxed whitespace-pre-wrap ${bodyClass}`}>{text}</p>
      </section>
    );
  }

  // ── bullets ──
  if (block.kind === "bullets") {
    // block.field must reference an array field on sections
    const raw = sections[block.field as keyof PlantInfoSections];
    const items = Array.isArray(raw) ? raw.filter((s) => typeof s === "string" && s.trim()) : [];
    if (!items.length) return null;
    return (
      <section aria-labelledby={headingId} className={`rounded-xl border p-5 ${toneClasses(block.tone)}`}>
        <h3
          id={headingId}
          className={`text-xs font-semibold uppercase tracking-wider ${toneTitleClass(block.tone)}`}
        >
          {num}. {block.title}
        </h3>
        <BulletList items={items} tone={block.tone} labelledBy={headingId} />
      </section>
    );
  }

  // ── split_bullets ──
  if (block.kind === "split_bullets") {
    const left = sections.advantages.filter((s) => s.trim());
    const right = sections.disadvantages.filter((s) => s.trim());
    if (!left.length && !right.length) return null;

    const leftId = `${headingId}-left`;
    const rightId = `${headingId}-right`;

    return (
      <section aria-label={`${block.left.title} and ${block.right.title}`} className="grid gap-4 lg:grid-cols-2">
        {left.length > 0 && (
          <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/15 p-5">
            <h3
              id={leftId}
              className="text-xs font-semibold uppercase tracking-wider text-emerald-400"
            >
              {num}a. {block.left.title}
            </h3>
            <BulletList items={left} tone="positive" labelledBy={leftId} />
          </div>
        )}
        {right.length > 0 && (
          <div className="rounded-xl border border-amber-900/40 bg-amber-950/15 p-5">
            <h3
              id={rightId}
              className="text-xs font-semibold uppercase tracking-wider text-amber-400"
            >
              {/* Keep {num}b only when both columns are present */}
              {left.length > 0 ? `${num}b` : num}. {block.right.title}
            </h3>
            <BulletList items={right} tone="caution" labelledBy={rightId} />
          </div>
        )}
      </section>
    );
  }

  // ── bullet_merge ──
  if (block.kind === "bullet_merge") {
    const merged = [
      ...sections.advantages.filter((s) => s.trim()),
      ...sections.disadvantages.filter((s) => s.trim()),
    ];
    if (!merged.length) return null;
    return (
      <section
        aria-labelledby={headingId}
        className="rounded-xl border border-zinc-700/60 bg-zinc-900/40 p-5"
      >
        <h3
          id={headingId}
          className="text-xs font-semibold uppercase tracking-wider text-zinc-300"
        >
          {num}. {block.title}
        </h3>
        <BulletList items={merged} tone="neutral" labelledBy={headingId} />
      </section>
    );
  }

  return null;
}

// ─── VisibleBlockList ─────────────────────────────────────────────────────────

/**
 * Renders all blocks, passing each a gap-free visible index.
 * Because RenderBlock may return null (empty field), we track the running
 * count of actually-rendered blocks via a ref-like pattern using a plain
 * counter that increments only inside the render pass.
 *
 * React doesn't let us conditionally call hooks, so we pre-render into
 * a keyed element array and let React reconcile — the counter only
 * increments when a block is non-null, handled via the wrapper below.
 */
function VisibleBlockList({
  blocks,
  sections,
}: {
  blocks: PlantDisplayBlock[];
  sections: PlantInfoSections;
}) {
  // We determine visibility by peeking at whether the block would produce
  // content, then pass the correct sequential index.
  let visibleCount = 0;

  return (
    <>
      {blocks.map((block, i) => {
        // Peek: will this block render anything?
        const wouldRender = blockHasContent(block, sections);
        if (wouldRender) visibleCount += 1;
        const idx = visibleCount; // capture current value
        return (
          <RenderBlock
            key={`${block.kind}-${i}`}
            block={block}
            sections={sections}
            visibleIndex={idx}
          />
        );
      })}
    </>
  );
}

/** Cheap content check that mirrors the null-return conditions in RenderBlock. */
function blockHasContent(block: PlantDisplayBlock, sections: PlantInfoSections): boolean {
  if (block.kind === "paragraph") {
    const raw = sections[block.field as keyof PlantInfoSections];
    return typeof raw === "string" && raw.trim().length > 0;
  }
  if (block.kind === "bullets") {
    const raw = sections[block.field as keyof PlantInfoSections];
    return Array.isArray(raw) && raw.some((s) => typeof s === "string" && s.trim().length > 0);
  }
  if (block.kind === "split_bullets") {
    return (
      sections.advantages.some((s) => s.trim()) ||
      sections.disadvantages.some((s) => s.trim())
    );
  }
  if (block.kind === "bullet_merge") {
    return (
      sections.advantages.some((s) => s.trim()) ||
      sections.disadvantages.some((s) => s.trim())
    );
  }
  return false;
}

// ─── PlantWriteUp ─────────────────────────────────────────────────────────────

export function PlantWriteUp({
  focus,
  focusLabel,
  customQuestion,
  sections,
  degraded,
  warning,
  highlights,
  model,
}: Props) {
  const { layout, blocks } = resolveDisplayBlocks(focus, sections, customQuestion ?? undefined);
  const isCustom = focus === "custom";
  const reportId = useId();

  // Badge label: use the actual model name when live, "Draft report" when degraded
  const sourceBadgeLabel = degraded ? "Draft report" : modelLabel(model);

  return (
    <article
      aria-labelledby={reportId}
      className={`rounded-2xl border p-6 shadow-lg ${
        isCustom
          ? degraded
            ? "border-violet-800/40 bg-gradient-to-b from-violet-950/20 via-zinc-950/95 to-zinc-950"
            : "border-violet-700/35 bg-gradient-to-b from-violet-950/15 via-zinc-950/90 to-zinc-950"
          : degraded
            ? "border-blue-800/40 bg-gradient-to-b from-blue-950/25 via-zinc-950/90 to-zinc-950"
            : "border-zinc-700/60 bg-zinc-950/80"
      }`}
    >
      {/* ── Header ── */}
      <header className="border-b border-zinc-800/80 pb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          {isCustom ? "Custom Q&A" : "Plant write-up"}
        </p>
        <h2 id={reportId} className="mt-1 text-lg font-semibold text-zinc-100">
          {layout.reportTitle}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">{layout.subtitle}</p>

        {/* Custom question callout */}
        {isCustom && customQuestion?.trim() ? (
          <div className="mt-4 rounded-xl border border-violet-700/40 bg-violet-950/25 px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400/90">
              Your question
            </p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-violet-50/95">
              {customQuestion.trim()}
            </p>
          </div>
        ) : null}

        {/* Badge row */}
        <div className="mt-4 flex flex-wrap gap-2" role="list" aria-label="Report metadata">
          {!isCustom && focusLabel ? (
            <span
              role="listitem"
              className="rounded-full border border-emerald-700/50 bg-emerald-950/50 px-3 py-1 text-xs font-medium text-emerald-200"
            >
              Answering: {focusLabel}
            </span>
          ) : null}

          {isCustom && customQuestion?.trim() ? (
            <span
              role="listitem"
              className="rounded-full border border-violet-600/45 bg-violet-950/40 px-3 py-1 text-xs font-medium text-violet-100"
            >
              Topic: {customTopicLabel(customQuestion)}
            </span>
          ) : null}

          <span
            role="listitem"
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              degraded
                ? "border-blue-600/50 bg-blue-950/40 text-blue-100"
                : "border-zinc-600 bg-zinc-900 text-zinc-400"
            }`}
          >
            {sourceBadgeLabel}
          </span>
        </div>

        {/* Warning */}
        {warning ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-blue-900/50 bg-blue-950/25 px-4 py-2.5 text-xs leading-relaxed text-blue-100/90"
          >
            {warning}
          </p>
        ) : null}
      </header>

      {/* ── Highlights ── */}
      {highlights.length > 0 ? (
        <section
          aria-label={isCustom ? "Key takeaways" : "At a glance"}
          className="mt-5 rounded-xl border border-zinc-700/50 bg-zinc-900/30 px-4 py-4"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {isCustom ? "Key takeaways" : "At a glance"}
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
            {highlights.map((x, i) => (
              <li key={`hl-${i}`} className="flex gap-2">
                <span aria-hidden="true" className="text-emerald-400">▸</span>
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Blocks ── */}
      <div className="mt-5 space-y-4">
        <VisibleBlockList blocks={blocks} sections={sections} />
      </div>
    </article>
  );
}