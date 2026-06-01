/** Classifies a user-written plant question for tailored section titles and draft content. */
export type CustomQuestionTopic =
  | "safety"
  | "care"
  | "distribution"
  | "ecology"
  | "culture"
  | "identification"
  | "general";

export type CustomSectionTitles = {
  overview: string;
  detailed: string;
  facts: string;
  caveats: string;
  steps: string;
  verification: string;
};

/**
 * Whether the question is a short factual lookup (yes/no, where, what color, etc.)
 * or a deeper question requiring a full multi-section report.
 */
export type CustomAnswerMode = "short" | "full";

// ─── Short-answer question patterns ──────────────────────────────────────────
// These patterns detect questions that should get a crisp direct answer
// rather than a full multi-section report.

const SHORT_ANSWER_PATTERNS: RegExp[] = [
  /^(is|are|does|do|can|will|was|has|have|did|could|should|would)\b/i,
  /^(what (color|colour|size|height|shape|smell|taste|name|family|genus|type|kind))/i,
  /^(how (many|much|long|tall|wide|big|old|fast|often|deep))/i,
  /^(where (is|does|can|do|are|was|did|grow|found|native|live|come from))/i,
  /^(when (does|do|is|was|will|should|can))/i,
  /^(which (part|region|season|month|country|state))/i,
  /\b(yes or no|true or false|toxic\?|edible\?|safe\?|poisonous\?|invasive\?)\b/i,
];

/** Heuristic: is this a short factual question or a deep-dive request? */
export function detectAnswerMode(question: string): CustomAnswerMode {
  const q = question.trim();
  // Short questions (under 50 chars) that match a quick-answer pattern → short
  if (q.length < 80 && SHORT_ANSWER_PATTERNS.some((p) => p.test(q))) {
    return "short";
  }
  // Questions explicitly asking "how to", "explain", "tell me about", "describe" → full
  if (/\b(how to|how do i|explain|tell me (about|more)|describe|what are the|give me|walk me|detail|elaborate)\b/i.test(q)) {
    return "full";
  }
  // Multi-question (contains "and" or "?") → full
  if (/\band\b.{10,}|[?].*[?]/.test(q)) return "full";
  // Default: short for brief questions, full for longer ones
  return q.length < 60 ? "short" : "full";
}

export function detectCustomQuestionTopic(question: string): CustomQuestionTopic {
  const q = question.toLowerCase();
  if (/\b(toxic|poison|dangerous|safe|safety|eat|edible|consume|ingest|pet|dog|cat|child|allerg|irritat)\b/.test(q)) {
    return "safety";
  }
  if (/\b(grow|care|water|soil|fertiliz|prun|plant|garden|indoor|pot|sunlight|shade|winter|hardiness)\b/.test(q)) {
    return "care";
  }
  if (/\b(where|which region|found|distribution|native range|in india|location|state)\b/.test(q)) {
    return "distribution";
  }
  if (/\b(native|invasive|ecolog|wildlife|pollinat|habitat|environment|conservation|biodivers)\b/.test(q)) {
    return "ecology";
  }
  if (/\b(culture|history|tradition|folklore|heritage|symbol|religious|ceremon)\b/.test(q)) {
    return "culture";
  }
  if (/\b(identify|identification|look.?alike|confus|species|tell apart|difference between)\b/.test(q)) {
    return "identification";
  }
  return "general";
}

const TITLE_MAP: Record<CustomQuestionTopic, CustomSectionTitles> = {
  safety: {
    overview: "Safety summary",
    detailed: "Detailed safety assessment",
    facts: "Known risk factors",
    caveats: "Uncertainties & mis-ID risks",
    steps: "What to do next",
    verification: "Confirm identity before acting",
  },
  care: {
    overview: "Quick answer",
    detailed: "Growing & care guide",
    facts: "Cultivation essentials",
    caveats: "Common pitfalls",
    steps: "Recommended care steps",
    verification: "Confirm species before care",
  },
  distribution: {
    overview: "Direct location answer",
    detailed: "Regional distribution details",
    facts: "Location evidence",
    caveats: "Distribution limits",
    steps: "How to verify locally",
    verification: "Location confidence note",
  },
  ecology: {
    overview: "Ecological summary",
    detailed: "Habitat & environmental impact",
    facts: "Ecological benefits",
    caveats: "Environmental concerns",
    steps: "Responsible actions",
    verification: "Field verification",
  },
  culture: {
    overview: "Cultural summary",
    detailed: "Historical & cultural context",
    facts: "Documented significance",
    caveats: "Cautions & regional variation",
    steps: "Further research steps",
    verification: "Identification note",
  },
  identification: {
    overview: "Identification summary",
    detailed: "How to verify this plant",
    facts: "Key identifying traits",
    caveats: "Look-alikes & confusion risks",
    steps: "Step-by-step verification",
    verification: "Safety while identifying",
  },
  general: {
    overview: "Short answer",
    detailed: "In-depth response",
    facts: "Supporting facts",
    caveats: "Limits & caveats",
    steps: "Practical next steps",
    verification: "Verification & safety",
  },
};

export function customSectionTitles(question: string): CustomSectionTitles {
  return TITLE_MAP[detectCustomQuestionTopic(question)];
}

const TOPIC_LABELS: Record<CustomQuestionTopic, string> = {
  safety: "Safety & toxicity",
  care: "Growing & care",
  distribution: "Distribution & region",
  ecology: "Ecology & environment",
  culture: "Cultural & historical",
  identification: "Identification",
  general: "General",
};

export function customTopicLabel(question: string): string {
  return TOPIC_LABELS[detectCustomQuestionTopic(question)];
}
