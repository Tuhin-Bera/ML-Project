import { customSectionTitles } from "@/lib/custom-question";
import type { PlantInfoFocus, PlantInfoSections } from "@/types/plant-info";
import { focusLabel } from "@/lib/plant-fallback";

type SectionField = keyof PlantInfoSections;

export type PlantDisplayBlock =
  | {
      kind: "paragraph";
      field: SectionField;
      title: string;
      emphasis?: "hero" | "normal";
    }
  | {
      kind: "bullets";
      field: "advantages" | "disadvantages";
      title: string;
      tone: "positive" | "caution" | "neutral";
    }
  | {
      kind: "split_bullets";
      left: { field: "advantages"; title: string };
      right: { field: "disadvantages"; title: string };
    }
  | { kind: "bullet_merge"; title: string };

export type PlantFocusLayout = {
  reportTitle: string;
  subtitle: string;
  blocks: PlantDisplayBlock[];
};

export const PLANT_FOCUS_LAYOUTS: Record<PlantInfoFocus, PlantFocusLayout> = {
  balanced: {
    reportTitle: "Balanced plant overview",
    subtitle: "Pros, cons, practical uses, and safety for well-rounded decisions.",
    blocks: [
      { kind: "paragraph", field: "overview", title: "Executive summary" },
      {
        kind: "split_bullets",
        left: { field: "advantages", title: "Advantages" },
        right: { field: "disadvantages", title: "Disadvantages & risks" },
      },
      { kind: "paragraph", field: "uses_and_care_tips", title: "Uses & practical guidance" },
      {
        kind: "paragraph",
        field: "traditional_or_cultural_notes",
        title: "Traditional / cultural context",
      },
      { kind: "paragraph", field: "identification_and_safety", title: "Identification & safety" },
      { kind: "paragraph", field: "disclaimer", title: "Important notice", emphasis: "normal" },
    ],
  },
  gardening: {
    reportTitle: "Gardening & care guide",
    subtitle: "Cultivation-focused guidance — not a generic pros/cons summary.",
    blocks: [
      { kind: "paragraph", field: "overview", title: "Growing profile" },
      {
        kind: "paragraph",
        field: "uses_and_care_tips",
        title: "Care & maintenance guide",
        emphasis: "hero",
      },
      {
        kind: "bullets",
        field: "advantages",
        title: "Cultivation highlights",
        tone: "positive",
      },
      {
        kind: "bullets",
        field: "disadvantages",
        title: "Common gardening challenges",
        tone: "caution",
      },
      { kind: "paragraph", field: "identification_and_safety", title: "Before you plant" },
      { kind: "paragraph", field: "disclaimer", title: "Important notice" },
    ],
  },
  ecology: {
    reportTitle: "Ecology & environment report",
    subtitle: "Habitat role, wildlife interactions, and conservation context.",
    blocks: [
      { kind: "paragraph", field: "overview", title: "Ecological profile" },
      {
        kind: "bullets",
        field: "advantages",
        title: "Ecological benefits",
        tone: "positive",
      },
      {
        kind: "bullets",
        field: "disadvantages",
        title: "Environmental risks & concerns",
        tone: "caution",
      },
      {
        kind: "paragraph",
        field: "uses_and_care_tips",
        title: "Habitat & conservation notes",
        emphasis: "hero",
      },
      { kind: "paragraph", field: "identification_and_safety", title: "Field identification & safety" },
      { kind: "paragraph", field: "disclaimer", title: "Important notice" },
    ],
  },
  cultural: {
    reportTitle: "Cultural & historical report",
    subtitle: "Heritage context and documented non-medical uses — not medical advice.",
    blocks: [
      { kind: "paragraph", field: "overview", title: "Introduction" },
      {
        kind: "paragraph",
        field: "traditional_or_cultural_notes",
        title: "Cultural & historical context",
        emphasis: "hero",
      },
      {
        kind: "bullets",
        field: "advantages",
        title: "Cultural significance",
        tone: "neutral",
      },
      {
        kind: "bullets",
        field: "disadvantages",
        title: "Cautions & misinformation risks",
        tone: "caution",
      },
      {
        kind: "paragraph",
        field: "uses_and_care_tips",
        title: "Documented non-medical uses",
      },
      { kind: "paragraph", field: "identification_and_safety", title: "Identification & safety" },
      { kind: "paragraph", field: "disclaimer", title: "Important notice" },
    ],
  },
  concise: {
    reportTitle: "Short plant summary",
    subtitle: "Brief answers only — essential facts at a glance.",
    blocks: [
      { kind: "paragraph", field: "overview", title: "Summary" },
      { kind: "bullet_merge", title: "Key points" },
      { kind: "paragraph", field: "uses_and_care_tips", title: "Practical note" },
      { kind: "paragraph", field: "identification_and_safety", title: "Safety" },
      { kind: "paragraph", field: "disclaimer", title: "Notice" },
    ],
  },
  custom: {
    reportTitle: "Custom Q&A report",
    subtitle: "Precise, detailed answer to your question about this plant.",
    blocks: [
      { kind: "paragraph", field: "overview", title: "Short answer" },
      {
        kind: "paragraph",
        field: "uses_and_care_tips",
        title: "In-depth response",
        emphasis: "hero",
      },
      {
        kind: "split_bullets",
        left: { field: "advantages", title: "Supporting facts" },
        right: { field: "disadvantages", title: "Limits & caveats" },
      },
      { kind: "paragraph", field: "identification_and_safety", title: "Verification & safety" },
      { kind: "paragraph", field: "disclaimer", title: "Important notice" },
    ],
  },
};

function applyCustomTitles(layout: PlantFocusLayout, question: string): PlantFocusLayout {
  const t = customSectionTitles(question);
  const blocks = layout.blocks.map((block) => {
    if (block.kind === "paragraph") {
      if (block.field === "overview") return { ...block, title: t.overview };
      if (block.field === "uses_and_care_tips") return { ...block, title: t.detailed };
      if (block.field === "traditional_or_cultural_notes") return { ...block, title: t.steps };
      if (block.field === "identification_and_safety") return { ...block, title: t.verification };
      return block;
    }
    if (block.kind === "split_bullets") {
      return {
        ...block,
        left: { ...block.left, title: t.facts },
        right: { ...block.right, title: t.caveats },
      };
    }
    if (block.kind === "bullets" && block.field === "advantages") return { ...block, title: t.facts };
    if (block.kind === "bullets" && block.field === "disadvantages") return { ...block, title: t.caveats };
    return block;
  });
  return { ...layout, blocks };
}

export function getFocusLayout(focus: PlantInfoFocus, customQuestion?: string): PlantFocusLayout {
  const base = PLANT_FOCUS_LAYOUTS[focus];
  if (focus !== "custom" || !customQuestion?.trim()) return base;
  const q = customQuestion.trim();
  const withTitles = applyCustomTitles(base, q);
  return {
    ...withTitles,
    subtitle: `Answering: “${q.length > 200 ? `${q.slice(0, 197)}…` : q}”`,
  };
}

function paragraphValue(sections: PlantInfoSections, field: SectionField): string {
  const v = sections[field];
  if (typeof v === "string") return v.trim();
  return "";
}

function bulletValue(sections: PlantInfoSections, field: "advantages" | "disadvantages"): string[] {
  return sections[field].map((s) => s.trim()).filter(Boolean);
}

/** Blocks with no content are omitted from UI and markdown. */
export function resolveDisplayBlocks(
  focus: PlantInfoFocus,
  sections: PlantInfoSections,
  customQuestion?: string,
): { layout: PlantFocusLayout; blocks: PlantDisplayBlock[] } {
  const layout = getFocusLayout(focus, customQuestion);
  const blocks: PlantDisplayBlock[] = [];

  for (const block of layout.blocks) {
    if (block.kind === "paragraph") {
      if (paragraphValue(sections, block.field)) blocks.push(block);
      continue;
    }
    if (block.kind === "bullets") {
      if (bulletValue(sections, block.field).length > 0) blocks.push(block);
      continue;
    }
    if (block.kind === "split_bullets") {
      const hasL = bulletValue(sections, block.left.field).length > 0;
      const hasR = bulletValue(sections, block.right.field).length > 0;
      if (hasL || hasR) blocks.push(block);
      continue;
    }
    if (block.kind === "bullet_merge") {
      const merged = [
        ...bulletValue(sections, "advantages"),
        ...bulletValue(sections, "disadvantages"),
      ];
      if (merged.length > 0) blocks.push(block);
    }
  }

  return { layout, blocks };
}

export function buildFocusHighlights(focus: PlantInfoFocus, sections: PlantInfoSections): string[] {
  switch (focus) {
    case "gardening":
      return [
        ...bulletValue(sections, "advantages").slice(0, 2),
        ...bulletValue(sections, "disadvantages").slice(0, 1),
      ].slice(0, 4);
    case "ecology":
      return [
        ...bulletValue(sections, "advantages").slice(0, 2),
        ...bulletValue(sections, "disadvantages").slice(0, 1),
      ].slice(0, 4);
    case "cultural":
      return [
        paragraphValue(sections, "traditional_or_cultural_notes").slice(0, 160),
        ...bulletValue(sections, "advantages").slice(0, 2),
      ].filter(Boolean);
    case "concise":
      return [
        ...bulletValue(sections, "advantages"),
        ...bulletValue(sections, "disadvantages"),
      ].slice(0, 5);
    case "custom": {
      const steps = paragraphValue(sections, "traditional_or_cultural_notes");
      const detailed = paragraphValue(sections, "uses_and_care_tips");
      const firstDetailedLine = detailed.split(/[.!?]/)[0]?.trim();
      return [
        ...bulletValue(sections, "advantages").slice(0, 2),
        ...(firstDetailedLine ? [firstDetailedLine] : []),
        ...(steps ? [steps.slice(0, 120)] : bulletValue(sections, "disadvantages").slice(0, 1)),
      ].filter(Boolean);
    }
    default:
      return [
        ...bulletValue(sections, "advantages").slice(0, 2),
        ...bulletValue(sections, "disadvantages").slice(0, 2),
      ];
  }
}

export function formatSectionsMarkdown(
  focus: PlantInfoFocus,
  sections: PlantInfoSections,
  meta: { plantName: string; degraded?: boolean; customQuestion?: string },
): string {
  const { layout, blocks } = resolveDisplayBlocks(focus, sections, meta.customQuestion);
  const fl = focusLabel(focus, meta.customQuestion);
  const source = meta.degraded ? "Enhanced draft report" : "AI-generated report";
  const questionLine =
    focus === "custom" && meta.customQuestion?.trim()
      ? `**Your question:** ${meta.customQuestion.trim()}  \n`
      : "";

  const lines: string[] = [
    `# ${layout.reportTitle}`,
    `**Plant (model guess):** ${meta.plantName}  \n${questionLine}**Topic:** ${fl}  \n**Source:** ${source}`,
    `_${layout.subtitle}_`,
  ];

  let n = 0;
  for (const block of blocks) {
    n += 1;
    if (block.kind === "paragraph") {
      lines.push(`## ${n}. ${block.title}\n\n${paragraphValue(sections, block.field)}`);
    } else if (block.kind === "bullets") {
      const items = bulletValue(sections, block.field);
      lines.push(
        `## ${n}. ${block.title}\n\n${items.map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
      );
    } else if (block.kind === "split_bullets") {
      const left = bulletValue(sections, block.left.field);
      const right = bulletValue(sections, block.right.field);
      const parts: string[] = [`## ${n}. ${block.left.title} & ${block.right.title}`];
      if (left.length) {
        parts.push(
          `### ${block.left.title}\n\n${left.map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
        );
      }
      if (right.length) {
        parts.push(
          `### ${block.right.title}\n\n${right.map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
        );
      }
      lines.push(parts.join("\n\n"));
    } else if (block.kind === "bullet_merge") {
      const merged = [
        ...bulletValue(sections, "advantages"),
        ...bulletValue(sections, "disadvantages"),
      ];
      lines.push(`## ${n}. ${block.title}\n\n${merged.map((x, i) => `${i + 1}. ${x}`).join("\n")}`);
    }
  }

  return lines.join("\n\n");
}
