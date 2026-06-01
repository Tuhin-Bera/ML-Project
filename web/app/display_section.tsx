"use client";

import { useId } from "react";
import type { PlantInfoFocus, PlantInfoSections } from "@/types/plant-info";
import { customTopicLabel, detectCustomQuestionTopic } from "@/lib/custom-question";
import { resolveDisplayBlocks, type PlantDisplayBlock } from "@/lib/plant-display";

// ─── Density helpers ──────────────────────────────────────────────────────────

function totalWords(sections: PlantInfoSections): number {
  return [
    sections.overview,
    sections.uses_and_care_tips,
    sections.traditional_or_cultural_notes,
    sections.identification_and_safety,
    ...sections.advantages,
    ...sections.disadvantages,
  ]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}

type Density = "compact" | "standard" | "rich";

function getDensity(sections: PlantInfoSections): Density {
  const words = totalWords(sections);
  if (words < 120) return "compact";
  if (words < 350) return "standard";
  return "rich";
}

// ─── Tone helpers ─────────────────────────────────────────────────────────────

type Tone = "positive" | "caution" | "neutral";

function toneBorderBg(tone: Tone): string {
  switch (tone) {
    case "positive": return "border-emerald-900/40 bg-emerald-950/15";
    case "caution":  return "border-amber-900/40 bg-amber-950/15";
    default:         return "border-violet-900/40 bg-violet-950/10";
  }
}
function toneTitleColor(tone: Tone): string {
  switch (tone) {
    case "positive": return "text-emerald-400";
    case "caution":  return "text-amber-400";
    default:         return "text-violet-300";
  }
}
function toneNumColor(tone: Tone): string {
  switch (tone) {
    case "positive": return "text-emerald-500";
    case "caution":  return "text-amber-500";
    default:         return "text-violet-400";
  }
}
function toneDotColor(tone: Tone): string {
  switch (tone) {
    case "positive": return "bg-emerald-400";
    case "caution":  return "bg-amber-400";
    default:         return "bg-violet-400";
  }
}

/** Derive a short human-readable model label. */
function modelLabel(model: string | null | undefined): string {
  if (!model || model === "fallback-template") return "Draft";
  return model
    .replace(/^(accounts\/[^/]+\/models\/)?/, "")
    .replace(/-\d{8}$/, "")
    .replace(/-latest$/, "")
    .replace(/^claude-/, "Claude ")
    .replace(/^llama3?-/, "Llama ")
    .replace(/^gemma2?-/, "Gemma ")
    .replace(/^mixtral-/, "Mixtral ")
    .replace(/-\d+b(-.*)?$/, (m) => m.replace(/-/, " "))
    .trim();
}

// ─── DegradedBadge ────────────────────────────────────────────────────────────

function DegradedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-900/30 px-2.5 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-700/40">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
      Draft
    </span>
  );
}

// ─── ModelBadge ───────────────────────────────────────────────────────────────

function ModelBadge({ model, degraded }: { model?: string | null; degraded: boolean }) {
  const label = degraded ? "Draft report" : modelLabel(model);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        degraded
          ? "border-blue-700/40 bg-blue-950/30 text-blue-300"
          : "border-zinc-700/60 bg-zinc-900 text-zinc-400"
      }`}
    >
      {!degraded && (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

// ─── AnswerModeBadge ──────────────────────────────────────────────────────────

function AnswerModeBadge({ mode }: { mode: "short" | "full" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
      mode === "short"
        ? "border-sky-700/40 bg-sky-950/30 text-sky-300"
        : "border-violet-700/40 bg-violet-950/30 text-violet-300"
    }`}>
      {mode === "short" ? "⚡ Quick answer" : "📋 Full report"}
    </span>
  );
}

// ─── HighlightStrip ───────────────────────────────────────────────────────────

function HighlightStrip({
  highlights,
  isCustom,
}: {
  highlights: string[];
  isCustom: boolean;
}) {
  if (!highlights.length) return null;
  return (
    <section
      aria-label={isCustom ? "Key takeaways" : "At a glance"}
      className="rounded-xl border border-zinc-700/50 bg-zinc-900/30 px-4 py-4"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {isCustom ? "Key takeaways" : "At a glance"}
      </h3>
      <ul className="mt-2.5 space-y-1.5 text-sm text-zinc-300">
        {highlights.map((x, i) => (
          <li key={`hl-${i}`} className="flex gap-2">
            <span aria-hidden="true" className="text-emerald-400 shrink-0">▸</span>
            <span className="leading-relaxed">{x}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── DisclaimerBlock ──────────────────────────────────────────────────────────

function DisclaimerBlock({ text }: { text: string }) {
  if (!text?.trim()) return null;
  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/40 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
        Important notice
      </p>
      <p className="text-xs italic leading-relaxed text-zinc-400">{text}</p>
    </div>
  );
}

// ─── BulletList ───────────────────────────────────────────────────────────────

function BulletList({
  items,
  tone,
  density,
  labelledBy,
  variant = "numbered",
}: {
  items: string[];
  tone: Tone;
  density: Density;
  labelledBy?: string;
  variant?: "numbered" | "dot" | "check" | "arrow";
}) {
  if (!items.length) return null;

  // Compact mode: pill chips
  if (density === "compact") {
    return (
      <div className="flex flex-wrap gap-2" role="list" aria-labelledby={labelledBy}>
        {items.map((item, i) => (
          <span
            key={i}
            role="listitem"
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
              tone === "positive"
                ? "bg-emerald-900/50 text-emerald-200 ring-emerald-700/40"
                : tone === "caution"
                  ? "bg-amber-900/40 text-amber-200 ring-amber-700/30"
                  : "bg-violet-900/40 text-violet-200 ring-violet-700/30"
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    );
  }

  // Standard / rich: styled list with variant markers
  const numColor = toneNumColor(tone);
  const dotColor = toneDotColor(tone);

  return (
    <ul className="mt-3 space-y-2.5" aria-labelledby={labelledBy}>
      {items.map((x, i) => (
        <li key={`${i}-${x.slice(0, 24)}`} className="flex gap-3 text-zinc-300">
          {variant === "numbered" && (
            <span aria-hidden="true" className={`shrink-0 font-bold tabular-nums text-sm min-w-[1.25rem] ${numColor}`}>
              {i + 1}.
            </span>
          )}
          {variant === "dot" && (
            <span aria-hidden="true" className={`mt-[7px] shrink-0 h-2 w-2 rounded-full ${dotColor}`} />
          )}
          {variant === "check" && (
            <span aria-hidden="true" className={`shrink-0 text-sm font-bold ${numColor}`}>✓</span>
          )}
          {variant === "arrow" && (
            <span aria-hidden="true" className={`shrink-0 text-sm font-bold ${numColor}`}>▸</span>
          )}
          <span className="leading-relaxed text-sm">{x}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── SectionCard (paragraph blocks) ──────────────────────────────────────────

function SectionCard({
  title,
  content,
  num,
  emphasis,
  headingId,
}: {
  title: string;
  content: string;
  num: number;
  emphasis?: "hero" | "normal";
  headingId: string;
}) {
  if (!content.trim()) return null;

  const isDisclaimer = title.toLowerCase().includes("notice");
  const isHero = emphasis === "hero";

  const wrapperClass = isDisclaimer
    ? "rounded-lg border border-zinc-700/70 bg-zinc-900/50 px-4 py-3"
    : isHero
      ? "rounded-xl border border-emerald-800/40 bg-gradient-to-br from-emerald-950/30 to-zinc-950/60 p-6 shadow-sm"
      : "rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-5";

  const headingClass = isDisclaimer
    ? "text-zinc-500"
    : isHero
      ? "text-emerald-400/95"
      : "text-zinc-400";

  const bodyClass = isDisclaimer
    ? "text-xs italic text-zinc-400"
    : isHero
      ? "text-[15px] leading-7 text-zinc-100"
      : "text-sm leading-relaxed text-zinc-300";

  return (
    <section aria-labelledby={headingId} className={wrapperClass}>
      <h3
        id={headingId}
        className={`text-xs font-semibold uppercase tracking-wider ${headingClass}`}
      >
        {num}. {title}
      </h3>
      <p className={`mt-3 whitespace-pre-wrap ${bodyClass}`}>{content}</p>
    </section>
  );
}

// ─── BulletCard (bullet / bullets blocks) ────────────────────────────────────

function BulletCard({
  title,
  items,
  tone,
  num,
  density,
  headingId,
  variant = "numbered",
}: {
  title: string;
  items: string[];
  tone: Tone;
  num: number;
  density: Density;
  headingId: string;
  variant?: "numbered" | "dot" | "check" | "arrow";
}) {
  if (!items.length) return null;
  return (
    <section
      aria-labelledby={headingId}
      className={`rounded-xl border p-5 ${toneBorderBg(tone)}`}
    >
      <h3
        id={headingId}
        className={`text-xs font-semibold uppercase tracking-wider ${toneTitleColor(tone)}`}
      >
        {num}. {title}
      </h3>
      <BulletList items={items} tone={tone} density={density} labelledBy={headingId} variant={variant} />
    </section>
  );
}

// ─── SplitBulletCard ──────────────────────────────────────────────────────────

function SplitBulletCard({
  leftTitle,
  rightTitle,
  leftItems,
  rightItems,
  num,
  density,
  headingId,
}: {
  leftTitle: string;
  rightTitle: string;
  leftItems: string[];
  rightItems: string[];
  num: number;
  density: Density;
  headingId: string;
}) {
  if (!leftItems.length && !rightItems.length) return null;
  const leftId = `${headingId}-left`;
  const rightId = `${headingId}-right`;

  return (
    <section
      aria-label={`${leftTitle} and ${rightTitle}`}
      className={`grid gap-4 ${leftItems.length && rightItems.length ? "lg:grid-cols-2" : ""}`}
    >
      {leftItems.length > 0 && (
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/15 p-5">
          <h3
            id={leftId}
            className="text-xs font-semibold uppercase tracking-wider text-emerald-400"
          >
            {num}a. {leftTitle}
          </h3>
          <BulletList items={leftItems} tone="positive" density={density} labelledBy={leftId} variant="check" />
        </div>
      )}
      {rightItems.length > 0 && (
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/15 p-5">
          <h3
            id={rightId}
            className="text-xs font-semibold uppercase tracking-wider text-amber-400"
          >
            {leftItems.length > 0 ? `${num}b` : num}. {rightTitle}
          </h3>
          <BulletList items={rightItems} tone="caution" density={density} labelledBy={rightId} variant="dot" />
        </div>
      )}
    </section>
  );
}

// ─── MergedBulletCard (concise "key points") ──────────────────────────────────

function MergedBulletCard({
  title,
  advantages,
  disadvantages,
  num,
  density,
  headingId,
}: {
  title: string;
  advantages: string[];
  disadvantages: string[];
  num: number;
  density: Density;
  headingId: string;
}) {
  const dotColor = toneDotColor("neutral");
  if (!advantages.length && !disadvantages.length) return null;

  if (density === "compact") {
    return (
      <section aria-labelledby={headingId} className="rounded-xl border border-zinc-700/60 bg-zinc-900/40 p-5">
        <h3
          id={headingId}
          className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3"
        >
          {num}. {title}
        </h3>
        <div className="flex flex-wrap gap-2" role="list">
          {advantages.map((a, i) => (
            <span key={`pro-${i}`} role="listitem" className="rounded-full bg-emerald-900/50 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-700/40">{a}</span>
          ))}
          {disadvantages.map((d, i) => (
            <span key={`con-${i}`} role="listitem" className="rounded-full bg-rose-900/40 px-3 py-1 text-xs font-medium text-rose-200 ring-1 ring-rose-700/30">{d}</span>
          ))}
        </div>
      </section>
    );
  }

  const merged = [...advantages, ...disadvantages];
  return (
    <section aria-labelledby={headingId} className="rounded-xl border border-zinc-700/60 bg-zinc-900/40 p-5">
      <h3
        id={headingId}
        className="text-xs font-semibold uppercase tracking-wider text-zinc-300"
      >
        {num}. {title}
      </h3>
      <ul className="mt-3 space-y-2.5">
        {merged.map((x, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span aria-hidden="true" className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
            <span className="text-sm leading-relaxed text-zinc-300">{x}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── CustomShortAnswerLayout ──────────────────────────────────────────────────
// Compact layout for short factual questions: hero answer + two bullet columns

function CustomShortAnswerLayout({
  sections,
  question,
  reportId,
}: {
  sections: PlantInfoSections;
  question: string;
  reportId: string;
}) {
  const topic = detectCustomQuestionTopic(question);
  const hasFacts = sections.advantages.length > 0;
  const hasCaveats = sections.disadvantages.length > 0;
  const hasContext = sections.uses_and_care_tips.trim().length > 0;
  const hasVerify = sections.identification_and_safety.trim().length > 0;
  const factId = `${reportId}-facts`;
  const caveatId = `${reportId}-caveats`;

  return (
    <div className="mt-6 space-y-4">
      {/* Hero answer card */}
      <div className="rounded-xl border border-sky-800/50 bg-gradient-to-br from-sky-950/40 via-zinc-950/80 to-zinc-950 p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wider text-sky-400/80 mb-2">
          Answer
        </p>
        <p className="text-[15px] leading-7 font-medium text-zinc-100">
          {sections.overview}
        </p>
      </div>

      {/* Facts + Caveats side by side */}
      {(hasFacts || hasCaveats) && (
        <div className={`grid gap-3 ${hasFacts && hasCaveats ? "sm:grid-cols-2" : ""}`}>
          {hasFacts && (
            <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/15 p-4">
              <h3 id={factId} className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-3">
                {topic === "safety" ? "Risk factors" : topic === "care" ? "Key facts" : "Supporting evidence"}
              </h3>
              <ul className="space-y-2">
                {sections.advantages.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <span className="mt-[6px] h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hasCaveats && (
            <div className="rounded-xl border border-amber-900/40 bg-amber-950/15 p-4">
              <h3 id={caveatId} className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-3">
                Caveats & limits
              </h3>
              <ul className="space-y-2">
                {sections.disadvantages.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <span className="mt-[6px] h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Brief extra context */}
      {hasContext && (
        <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
            More context
          </p>
          <p className="text-sm leading-relaxed text-zinc-300">{sections.uses_and_care_tips}</p>
        </div>
      )}

      {/* Verification note (compact) */}
      {hasVerify && (
        <p className="flex items-start gap-2 rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-4 py-2.5 text-xs text-zinc-500 leading-relaxed">
          <span className="shrink-0 mt-0.5">🔍</span>
          <span>{sections.identification_and_safety}</span>
        </p>
      )}

      {/* Disclaimer (smallest) */}
      {sections.disclaimer.trim() && (
        <p className="text-[11px] italic text-zinc-600 px-1 leading-relaxed">
          {sections.disclaimer}
        </p>
      )}
    </div>
  );
}

// ─── CustomFullAnswerLayout ───────────────────────────────────────────────────
// Rich multi-section layout for deep-dive questions

function CustomFullAnswerLayout({
  sections,
  density,
  reportId,
}: {
  sections: PlantInfoSections;
  density: Density;
  reportId: string;
}) {
  let n = 0;
  const next = () => ++n;

  const factsId = `${reportId}-facts`;
  const caveatsId = `${reportId}-caveats`;
  const detailId = `${reportId}-detail`;
  const stepsId = `${reportId}-steps`;
  const verifyId = `${reportId}-verify`;

  const hasFacts = sections.advantages.length > 0;
  const hasCaveats = sections.disadvantages.length > 0;
  const hasDetail = sections.uses_and_care_tips.trim().length > 0;
  const hasSteps = sections.traditional_or_cultural_notes.trim().length > 0;
  const hasVerify = sections.identification_and_safety.trim().length > 0;

  return (
    <div className="mt-6 space-y-4">
      {/* Section 1: Direct answer */}
      <section aria-labelledby={`${reportId}-overview`} className="rounded-xl border border-violet-800/40 bg-gradient-to-br from-violet-950/30 via-zinc-950/80 to-zinc-950 p-6 shadow-sm">
        <h3 id={`${reportId}-overview`} className="text-xs font-semibold uppercase tracking-wider text-violet-400 mb-3">
          {next()}. Direct answer
        </h3>
        <p className="text-[15px] leading-7 text-zinc-100 whitespace-pre-wrap">
          {sections.overview}
        </p>
      </section>

      {/* Section 2: Detailed response */}
      {hasDetail && (
        <section aria-labelledby={detailId} className="rounded-xl border border-emerald-800/35 bg-zinc-950/50 p-6">
          <h3 id={detailId} className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-3">
            {next()}. In-depth response
          </h3>
          <p className="text-sm leading-7 text-zinc-200 whitespace-pre-wrap">
            {sections.uses_and_care_tips}
          </p>
        </section>
      )}

      {/* Section 3+4: Facts & Caveats */}
      {(hasFacts || hasCaveats) && (
        <div className={`grid gap-4 ${hasFacts && hasCaveats ? "lg:grid-cols-2" : ""}`}>
          {hasFacts && (
            <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/15 p-5">
              <h3 id={factsId} className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
                {next()}. Supporting facts
              </h3>
              <ul className="mt-3 space-y-3">
                {sections.advantages.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                    <span className="shrink-0 mt-[3px] font-bold text-emerald-500 min-w-[1.25rem] tabular-nums">{i + 1}.</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hasCaveats && (
            <div className="rounded-xl border border-amber-900/40 bg-amber-950/15 p-5">
              <h3 id={caveatsId} className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
                {hasFacts ? `${n}b` : next()}. Uncertainties & caveats
              </h3>
              <ul className="mt-3 space-y-3">
                {sections.disadvantages.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Section: Next steps / cultural notes */}
      {hasSteps && (
        <section aria-labelledby={stepsId} className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-5">
          <h3 id={stepsId} className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
            {next()}. Further context
          </h3>
          <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
            {sections.traditional_or_cultural_notes}
          </p>
        </section>
      )}

      {/* Verification */}
      {hasVerify && (
        <section aria-labelledby={verifyId} className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 px-5 py-4">
          <h3 id={verifyId} className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            {next()}. Verification & safety
          </h3>
          <p className="text-sm leading-relaxed text-zinc-400">
            {sections.identification_and_safety}
          </p>
        </section>
      )}

      {/* Disclaimer */}
      {sections.disclaimer.trim() && (
        <p className="text-[11px] italic text-zinc-600 px-1 leading-relaxed">
          {sections.disclaimer}
        </p>
      )}
    </div>
  );
}

// ─── RenderBlock ──────────────────────────────────────────────────────────────

function RenderBlock({
  block,
  sections,
  visibleIndex,
  density,
}: {
  block: PlantDisplayBlock;
  sections: PlantInfoSections;
  visibleIndex: number;
  density: Density;
}) {
  const headingId = useId();
  const num = visibleIndex;

  if (block.kind === "paragraph") {
    const raw = sections[block.field as keyof PlantInfoSections];
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!text) return null;
    // Disclaimer gets its own styled component
    if (block.field === "disclaimer") {
      return <DisclaimerBlock text={text} />;
    }
    return (
      <SectionCard
        title={block.title}
        content={text}
        num={num}
        emphasis={block.emphasis}
        headingId={headingId}
      />
    );
  }

  if (block.kind === "bullets") {
    const raw = sections[block.field as keyof PlantInfoSections];
    const items = Array.isArray(raw) ? raw.filter((s) => typeof s === "string" && s.trim()) : [];
    if (!items.length) return null;
    // Positive tone → check marks; caution tone → dots; neutral → numbered
    const variant = block.tone === "positive" ? "check" : block.tone === "caution" ? "dot" : "numbered";
    return (
      <BulletCard
        title={block.title}
        items={items}
        tone={block.tone}
        num={num}
        density={density}
        headingId={headingId}
        variant={variant}
      />
    );
  }

  if (block.kind === "split_bullets") {
    const leftItems = sections.advantages.filter((s) => s.trim());
    const rightItems = sections.disadvantages.filter((s) => s.trim());
    if (!leftItems.length && !rightItems.length) return null;
    return (
      <SplitBulletCard
        leftTitle={block.left.title}
        rightTitle={block.right.title}
        leftItems={leftItems}
        rightItems={rightItems}
        num={num}
        density={density}
        headingId={headingId}
      />
    );
  }

  if (block.kind === "bullet_merge") {
    const advantages = sections.advantages.filter((s) => s.trim());
    const disadvantages = sections.disadvantages.filter((s) => s.trim());
    if (!advantages.length && !disadvantages.length) return null;
    return (
      <MergedBulletCard
        title={block.title}
        advantages={advantages}
        disadvantages={disadvantages}
        num={num}
        density={density}
        headingId={headingId}
      />
    );
  }

  return null;
}

// ─── Cheap content peek (mirrors RenderBlock null-conditions) ─────────────────

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

// ─── VisibleBlockList ─────────────────────────────────────────────────────────

function VisibleBlockList({
  blocks,
  sections,
  density,
}: {
  blocks: PlantDisplayBlock[];
  sections: PlantInfoSections;
  density: Density;
}) {
  let visibleCount = 0;

  return (
    <>
      {blocks.map((block, i) => {
        const wouldRender = blockHasContent(block, sections);
        if (wouldRender) visibleCount += 1;
        const idx = visibleCount;
        return (
          <RenderBlock
            key={`${block.kind}-${i}`}
            block={block}
            sections={sections}
            visibleIndex={idx}
            density={density}
          />
        );
      })}
    </>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export interface PlantAnswerDisplayProps {
  focus: PlantInfoFocus;
  focusLabel: string | null;
  customQuestion?: string | null;
  sections: PlantInfoSections;
  degraded?: boolean;
  warning?: string | null;
  highlights?: string[];
  model?: string | null;
  /** Only relevant when focus === "custom" */
  answerMode?: "short" | "full";
}

export function PlantAnswerDisplay({
  focus,
  focusLabel,
  customQuestion,
  sections,
  degraded = false,
  warning,
  highlights = [],
  model,
  answerMode,
}: PlantAnswerDisplayProps) {
  const { layout, blocks } = resolveDisplayBlocks(focus, sections, customQuestion ?? undefined);
  const density = getDensity(sections);
  const isCustom = focus === "custom";
  const reportId = useId();

  // Infer answer mode from content if not explicitly provided
  const effectiveMode: "short" | "full" = answerMode
    ?? (isCustom
      ? (density === "compact" || (sections.overview.length < 120 && sections.uses_and_care_tips.length < 250))
        ? "short"
        : "full"
      : "full");

  // Container padding adapts to density + mode
  const containerPadding =
    isCustom && effectiveMode === "short"
      ? "p-5"
      : density === "compact" ? "p-4" : density === "standard" ? "p-5" : "p-6";

  // Article border color shifts for custom vs. degraded
  const articleBorderBg = isCustom
    ? effectiveMode === "short"
      ? degraded
        ? "border-sky-800/40 bg-gradient-to-b from-sky-950/20 via-zinc-950/95 to-zinc-950"
        : "border-sky-700/30 bg-gradient-to-b from-sky-950/15 via-zinc-950/90 to-zinc-950"
      : degraded
        ? "border-violet-800/40 bg-gradient-to-b from-violet-950/20 via-zinc-950/95 to-zinc-950"
        : "border-violet-700/35 bg-gradient-to-b from-violet-950/15 via-zinc-950/90 to-zinc-950"
    : degraded
      ? "border-blue-800/40 bg-gradient-to-b from-blue-950/25 via-zinc-950/90 to-zinc-950"
      : "border-zinc-700/60 bg-zinc-950/80";

  return (
    <article
      aria-labelledby={reportId}
      className={`rounded-2xl border shadow-lg ${containerPadding} ${articleBorderBg}`}
    >

      {/* ── Header ── */}
      <header className="border-b border-zinc-800/80 pb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          {isCustom
            ? effectiveMode === "short" ? "Quick answer" : "Custom Q&A"
            : "Plant write-up"}
        </p>
        <h2 id={reportId} className="mt-1 text-lg font-semibold text-zinc-100">
          {layout.reportTitle}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">{layout.subtitle}</p>

        {/* Custom question callout */}
        {isCustom && customQuestion?.trim() && (
          <div className={`mt-4 rounded-xl border px-4 py-4 ${
            effectiveMode === "short"
              ? "border-sky-700/40 bg-sky-950/25"
              : "border-violet-700/40 bg-violet-950/25"
          }`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${
              effectiveMode === "short" ? "text-sky-400/90" : "text-violet-400/90"
            }`}>
              Your question
            </p>
            <p className={`mt-2 text-sm font-medium leading-relaxed ${
              effectiveMode === "short" ? "text-sky-50/95" : "text-violet-50/95"
            }`}>
              {customQuestion.trim()}
            </p>
          </div>
        )}

        {/* Badge row */}
        <div className="mt-4 flex flex-wrap gap-2" role="list" aria-label="Report metadata">
          {!isCustom && focusLabel && (
            <span
              role="listitem"
              className="rounded-full border border-emerald-700/50 bg-emerald-950/50 px-3 py-1 text-xs font-medium text-emerald-200"
            >
              Answering: {focusLabel}
            </span>
          )}

          {isCustom && customQuestion?.trim() && (
            <span
              role="listitem"
              className="rounded-full border border-violet-600/45 bg-violet-950/40 px-3 py-1 text-xs font-medium text-violet-100"
            >
              Topic: {customTopicLabel(customQuestion)}
            </span>
          )}

          {isCustom && <AnswerModeBadge mode={effectiveMode} />}

          <ModelBadge model={model} degraded={degraded} />

          {degraded && <DegradedBadge />}

          {density === "compact" && !degraded && !isCustom && (
            <span className="rounded-full border border-zinc-700/50 bg-zinc-800/60 px-2.5 py-0.5 text-xs text-zinc-400">
              Summary
            </span>
          )}
        </div>

        {/* Warning banner */}
        {warning && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-blue-900/50 bg-blue-950/25 px-4 py-2.5 text-xs leading-relaxed text-blue-100/90"
          >
            {warning}
          </p>
        )}
      </header>

      {/* ── Custom Q&A: adaptive layouts ── */}
      {isCustom && customQuestion?.trim() ? (
        effectiveMode === "short" ? (
          <CustomShortAnswerLayout
            sections={sections}
            question={customQuestion}
            reportId={reportId}
          />
        ) : (
          <CustomFullAnswerLayout
            sections={sections}
            density={density}
            reportId={reportId}
          />
        )
      ) : (
        <>
          {/* ── Highlights strip (standard / rich, non-custom) ── */}
          {highlights.length > 0 && density !== "compact" && (
            <div className="mt-5">
              <HighlightStrip highlights={highlights} isCustom={isCustom} />
            </div>
          )}

          {/* ── Compact density: inline highlight chips ── */}
          {highlights.length > 0 && density === "compact" && (
            <div className="mt-4 flex flex-wrap gap-2" role="list" aria-label="Highlights">
              {highlights.map((h, i) => (
                <span
                  key={i}
                  role="listitem"
                  className="rounded-full bg-emerald-900/40 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-700/30"
                >
                  {h}
                </span>
              ))}
            </div>
          )}

          {/* ── Numbered content blocks ── */}
          <div
            className={`mt-5 flex flex-col ${
              density === "compact" ? "gap-3" : density === "standard" ? "gap-4" : "gap-5"
            }`}
          >
            <VisibleBlockList blocks={blocks} sections={sections} density={density} />
          </div>
        </>
      )}
    </article>
  );
}