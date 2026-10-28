// Who operates the service, as named in the privacy policy and terms.
// Fill in name and email before launch; until then the legal pages show a
// visible "draft" notice.

export const OPERATOR = {
  /** Person or company responsible for the service ("data user" under the PDPO). */
  name: "[Operator name]",
  /** Address for privacy requests, data access/correction and general contact. */
  email: "[contact email]",
} as const;

export const LEGAL_VERSION = "2026-10-28";
export const LEGAL_UPDATED = "28 October 2026";

export const LEGAL_IS_DRAFT = OPERATOR.name.startsWith("[") || OPERATOR.email.startsWith("[");

export const TEAM_PRICE_HKD_PER_SEAT = 48;

/** Hong Kong support lines shown on /support and in high-risk states. */
export const SUPPORT_LINES = [
  {
    name: "Emergency services",
    number: "999",
    hours: "24 hours",
    note: "If you or someone else is in immediate danger.",
  },
  {
    name: "Mental Health Support Hotline (HKSAR Government)",
    number: "18111",
    hours: "24 hours",
    note: "Emotional support. Cantonese and English.",
  },
  {
    name: "The Samaritans",
    number: "2896 0000",
    hours: "24 hours",
    note: "Multilingual, including English, Cantonese and Mandarin.",
  },
  {
    name: "Samaritan Befrienders Hong Kong",
    number: "2389 2222",
    hours: "24 hours",
    note: "Cantonese. English line 2389 2223, weekday evenings.",
  },
  {
    name: "Suicide Prevention Services",
    number: "2382 0000",
    hours: "24 hours",
    note: "Cantonese.",
  },
] as const;
