export const INDIAN_STATES_AND_UTS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export type IndianStateOrUT = (typeof INDIAN_STATES_AND_UTS)[number];

const STATE_ALIASES: Record<string, IndianStateOrUT> = {
  "andhra pradesh": "Andhra Pradesh",
  ap: "Andhra Pradesh",
  "arunachal pradesh": "Arunachal Pradesh",
  assam: "Assam",
  bihar: "Bihar",
  chhattisgarh: "Chhattisgarh",
  chattisgarh: "Chhattisgarh",
  goa: "Goa",
  gujarat: "Gujarat",
  haryana: "Haryana",
  "himachal pradesh": "Himachal Pradesh",
  hp: "Himachal Pradesh",
  jharkhand: "Jharkhand",
  karnataka: "Karnataka",
  kerala: "Kerala",
  "madhya pradesh": "Madhya Pradesh",
  mp: "Madhya Pradesh",
  maharashtra: "Maharashtra",
  manipur: "Manipur",
  meghalaya: "Meghalaya",
  mizoram: "Mizoram",
  nagaland: "Nagaland",
  odisha: "Odisha",
  orissa: "Odisha",
  punjab: "Punjab",
  rajasthan: "Rajasthan",
  sikkim: "Sikkim",
  "tamil nadu": "Tamil Nadu",
  tamilnadu: "Tamil Nadu",
  tn: "Tamil Nadu",
  telangana: "Telangana",
  tripura: "Tripura",
  "uttar pradesh": "Uttar Pradesh",
  up: "Uttar Pradesh",
  uttarakhand: "Uttarakhand",
  uttaranchal: "Uttarakhand",
  "west bengal": "West Bengal",
  wb: "West Bengal",
  "andaman and nicobar islands": "Andaman and Nicobar Islands",
  "andaman & nicobar islands": "Andaman and Nicobar Islands",
  "andaman & nicobar": "Andaman and Nicobar Islands",
  "andaman and nicobar": "Andaman and Nicobar Islands",
  chandigarh: "Chandigarh",
  "dadra and nagar haveli and daman and diu":
    "Dadra and Nagar Haveli and Daman and Diu",
  "dadra & nagar haveli and daman & diu":
    "Dadra and Nagar Haveli and Daman and Diu",
  "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "dadra & nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  "daman & diu": "Dadra and Nagar Haveli and Daman and Diu",
  delhi: "Delhi",
  "new delhi": "Delhi",
  "nct of delhi": "Delhi",
  "delhi ncr": "Delhi",
  "jammu and kashmir": "Jammu and Kashmir",
  "jammu & kashmir": "Jammu and Kashmir",
  jk: "Jammu and Kashmir",
  ladakh: "Ladakh",
  lakshadweep: "Lakshadweep",
  puducherry: "Puducherry",
  pondicherry: "Puducherry",
};

/**
 * Normalize state names (including legacy names like Orissa, Pondicherry, NCT of Delhi)
 * to our canonical 36 Indian States & Union Territories list.
 */
export function normalizeIndianState(raw?: string | null): IndianStateOrUT | "" {
  if (!raw) return "";
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!cleaned) return "";
  return STATE_ALIASES[cleaned] || "";
}

/**
 * Validate standard 6-digit Indian PIN code (100000 - 899999; never starts with 0 or 9 for civilian postal delivery,
 * though 900xxx is APS - we allow 1-8 for standard India Post delivery).
 */
export function isValidIndianPincode(pin: string): boolean {
  return /^[1-8][0-9]{5}$/.test(pin.trim());
}

/**
 * Clean a phone string to 10 Indian digits (stripping +91, 91 prefix if 12 digits, or leading 0).
 */
export function normalizeIndianPhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

/**
 * Deterministic offline mapping from 6-digit Indian PIN code to State/UT.
 * Used for instant zero-latency pre-fill and as a fallback when external PIN APIs are unreachable.
 */
export function inferStateFromPincode(pin: string): IndianStateOrUT | "" {
  const clean = pin.trim();
  if (!/^[1-8][0-9]{5}$/.test(clean)) return "";

  const num = parseInt(clean, 10);
  const p2 = parseInt(clean.slice(0, 2), 10);
  const p3 = parseInt(clean.slice(0, 3), 10);

  // Specific enclaves & Union Territories first
  if (p3 === 110) return "Delhi";
  if (p3 === 160) return "Chandigarh";
  if (p3 === 194) return "Ladakh";
  if (p3 === 403) return "Goa";
  if (p3 === 737) return "Sikkim";
  if (p3 === 744) return "Andaman and Nicobar Islands";
  if (num >= 682551 && num <= 682559) return "Lakshadweep";
  if (
    (num >= 605001 && num <= 605114) ||
    (num >= 609601 && num <= 609609) ||
    num === 533464 ||
    num === 673310
  ) {
    return "Puducherry";
  }
  if (
    (num >= 396210 && num <= 396240) ||
    num === 396193 ||
    num === 362520
  ) {
    return "Dadra and Nagar Haveli and Daman and Diu";
  }

  // Uttarakhand pockets inside 24x / 26x prefixes
  if (
    p3 === 246 ||
    p3 === 248 ||
    p3 === 249 ||
    p3 === 263 ||
    (num >= 244712 && num <= 244716) ||
    (num >= 247656 && num <= 247670) ||
    (num >= 262308 && num <= 262311) ||
    (num >= 262501 && num <= 262580)
  ) {
    return "Uttarakhand";
  }

  // 2-digit & 3-digit state ranges
  if (p2 === 12 || p2 === 13) return "Haryana";
  if (p2 === 14 || p2 === 15 || p2 === 16) return "Punjab";
  if (p2 === 17) return "Himachal Pradesh";
  if (p2 === 18 || p2 === 19) return "Jammu and Kashmir";
  if (p2 >= 20 && p2 <= 28) return "Uttar Pradesh";
  if (p2 >= 30 && p2 <= 34) return "Rajasthan";
  if (p2 >= 36 && p2 <= 39) return "Gujarat";
  if (p2 >= 40 && p2 <= 44) return "Maharashtra";
  if (p2 >= 45 && p2 <= 48) return "Madhya Pradesh";
  if (p2 === 49) return "Chhattisgarh";
  if (p2 === 50) return "Telangana";
  if (p2 >= 51 && p2 <= 53) return "Andhra Pradesh";
  if (p2 >= 56 && p2 <= 59) return "Karnataka";
  if (p2 >= 60 && p2 <= 64) return "Tamil Nadu";
  if (p2 >= 67 && p2 <= 69) return "Kerala";
  if (p2 >= 70 && p2 <= 74) return "West Bengal";
  if (p2 >= 75 && p2 <= 77) return "Odisha";
  if (p2 === 78) return "Assam";

  // Northeast India (79x)
  if (p3 >= 790 && p3 <= 792) return "Arunachal Pradesh";
  if (p3 === 793 || p3 === 794) return "Meghalaya";
  if (p3 === 795) return "Manipur";
  if (p3 === 796) return "Mizoram";
  if (p3 === 797 || p3 === 798) return "Nagaland";
  if (p3 === 799) return "Tripura";

  // Bihar & Jharkhand (80-85)
  if ((p3 >= 800 && p3 <= 813) || (p3 >= 841 && p3 <= 855)) return "Bihar";
  if (p3 >= 814 && p3 <= 835) return "Jharkhand";

  return "";
}

/**
 * Scan freeform address text for an explicit Indian state name (used when legacy order notes lack notes.state).
 */
export function inferStateFromAddressText(rawAddress: string): IndianStateOrUT | "" {
  if (!rawAddress) return "";
  const lower = rawAddress.toLowerCase();
  // Check longer names first to avoid partial matches (e.g. "Arunachal Pradesh" before others)
  const ordered = [...INDIAN_STATES_AND_UTS].sort((a, b) => b.length - a.length);
  for (const state of ordered) {
    if (lower.includes(state.toLowerCase())) {
      return state;
    }
  }
  return "";
}

/**
 * Parse customer address fields from Razorpay order/payment notes WITHOUT defaulting to Sikkim/West Sikkim.
 */
export function parseAddressFromNotes(notes: Record<string, string>) {
  const rawAddress = (notes.address || "").trim();
  const pincodeMatch = rawAddress.match(/\b[1-8]\d{5}\b/);
  const notesPin = (notes.pincode || "").trim();
  const pincode =
    (isValidIndianPincode(notesPin) ? notesPin : "") ||
    (pincodeMatch ? pincodeMatch[0] : "") ||
    notesPin;

  const explicitState = normalizeIndianState(notes.state) || (notes.state || "").trim();
  const inferredState =
    inferStateFromPincode(pincode) || inferStateFromAddressText(rawAddress);

  return {
    address: rawAddress || "Address provided during checkout",
    city: (notes.city || "").trim(),
    state: explicitState || inferredState,
    pincode,
  };
}

/**
 * Estimate Speed Post transit time from West Sikkim (737121) based on destination state.
 */
export function getEstimatedTransitNote(state: string): string {
  const normalized = normalizeIndianState(state);
  if (!normalized) return "Dispatched from Soreng, West Sikkim via India Post Speed Post.";
  if (normalized === "Sikkim") {
    return "Local Sikkim dispatch: typically 2–3 business days via Speed Post.";
  }
  if (
    normalized === "West Bengal" ||
    normalized === "Assam" ||
    normalized === "Arunachal Pradesh" ||
    normalized === "Meghalaya" ||
    normalized === "Manipur" ||
    normalized === "Mizoram" ||
    normalized === "Nagaland" ||
    normalized === "Tripura" ||
    normalized === "Bihar"
  ) {
    return `East & Northeast Speed Post: typically 3–5 business days to ${normalized}.`;
  }
  if (
    normalized === "Andaman and Nicobar Islands" ||
    normalized === "Lakshadweep" ||
    normalized === "Ladakh"
  ) {
    return `Remote / Island Speed Post: typically 6–9 business days to ${normalized}.`;
  }
  return `Pan-India Speed Post: typically 4–7 business days to ${normalized}.`;
}
