/**
 * Every business fact the site publishes, in one place.
 *
 * Sourced from the Google Business Profile Takeout Export at `v0_GMB/`, except
 * where the Owner's 2026-08-20 direction overrides it — each override is marked.
 * The address and phone are reproduced identically wherever they appear (NAP
 * consistency), which is worth keeping because it is free, not because Google
 * documents it as a ranking factor.
 */

export const BUSINESS = {
  /**
   * The clean Display Name, used in titles, headings and JSON-LD `name`.
   * Deliberately not the full Google listing string, which packs service
   * keywords into the name in breach of Google Business Profile naming policy
   * and is not worth entrenching sitewide.
   */
  name: "Perfect Tuition",

  /**
   * The listing string as it actually reads on the profile. It appears only as
   * JSON-LD `alternateName` and once verbatim in the contact citation block.
   *
   * It still says "Home Tutor & Private Tutor" and now misdescribes the
   * business. **That listing name is deliberately not being changed** — editing
   * a profile's primary name risks hard suspension or a ranking collapse, a cost
   * judged higher than the inaccuracy. Do not raise it again.
   */
  legalListingName: "Perfect Tuition ( Coaching Class ) - Home Tutor & Private Tutor",

  founded: 2012,
  foundedLong: "April 2012",
  owner: "Jayeeta Bhattacharya",
  /** How she is named in visitor-facing copy — the form of address parents use. */
  ownerFamiliar: "Jayeeta Ma'am",

  phoneDisplay: "062911 65454",
  phoneE164: "+916291165454",
  /** Google asks for the country code in structured data. */
  phoneSchema: "+91 62911 65454",

  address: {
    line1: "Arnab Apartment",
    line2: "444, Dum Dum Park Road",
    line3: "Dum Dum Park",
    locality: "Kolkata",
    region: "West Bengal",
    postalCode: "700055",
    country: "IN",
  },
  addressOneLine:
    "Arnab Apartment, 444, Dum Dum Park Road, Dum Dum Park, Kolkata, West Bengal 700055",

  /** Seven decimal places, read off the profile pin — comfortably past the five Google needs. */
  geo: { latitude: 22.6080092, longitude: 88.4149812 },

  /** OWNER OVERRIDE 2026-08-20 — the profile still publishes 8am–10pm daily. */
  callHours: "10 am to 10 pm",
  callHoursSchema: { opens: "10:00:00", closes: "22:00:00" },

  batches: [
    { label: "Morning", time: "7 – 9 am" },
    { label: "Evening batch 1", time: "5 – 7 pm" },
    { label: "Evening batch 2", time: "7 – 9 pm" },
  ],
  batchDays: "Monday to Friday",

  fee: "From ₹500 per subject",

  /**
   * OWNER OVERRIDE 2026-08-20. 4.7 is what the Google profile displays, so a
   * parent can go and check it against visible content.
   *
   * The review **count is deliberately omitted**. The true figure is 62; the
   * directive was to publish "nearly 100", and a number that isn't the number
   * was not written. No verbatim review text, reviewer names, individual star
   * ratings, or review/aggregateRating schema markup — all closed off by #3.
   */
  rating: "4.7",
  ratingAsOf: "August 2026",

  googleProfileUrl: "https://www.google.com/maps/search/?api=1&query=22.6080092,88.4149812",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=22.6080092,88.4149812",

  grievanceEmail: "privacy@perfect-tuition.co.in",
} as const;

export const WHATSAPP_NUMBER = BUSINESS.phoneE164.replace("+", "");

export function whatsappUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_DEFAULT = whatsappUrl(
  "Hello, I would like to ask about tuition for my child at Perfect Tuition.",
);

/**
 * The class bands.
 *
 * Senior teaching is **no longer Commerce-only** (superseded 2026-08-20).
 * Classes 9 and 10 appear in *both* senior groups, deliberately — a class 9 or
 * 10 student may take either. The enquiry form filters its subject chips on the
 * class chosen rather than showing all 22 at once, which is what stops the
 * overlap reading as a contradiction.
 */
export const BANDS = [
  {
    id: "junior",
    tag: "Junior",
    label: "Classes 3 – 8",
    boards: "ICSE · CBSE · KV · WB",
    note: "English-medium and convent schools.",
    classes: [3, 4, 5, 6, 7, 8],
    subjects: [
      "English Literature",
      "English Language",
      "Bengali",
      "Hindi",
      "Social Science",
      "History/Civics",
      "Geography (incl. Topo Sheet)",
      "Maths",
      "Science (Physics, Chemistry, Biology)",
    ],
  },
  {
    id: "humanities",
    tag: "Humanities",
    label: "Classes 9 – 10",
    boards: "ICSE · CBSE",
    note: "",
    classes: [9, 10],
    subjects: [
      "English Literature",
      "English Language",
      "History",
      "Civics",
      "Geography",
      "Social Science",
      "Political Science",
    ],
  },
  {
    id: "commerce",
    tag: "Commerce",
    label: "Classes 9 – 12",
    boards: "ICSE · CBSE",
    note: "",
    classes: [9, 10, 11, 12],
    subjects: [
      "Commerce",
      "Economic Application",
      "Economics",
      "Accountancy",
      "Business Studies",
      "Entrepreneurship",
    ],
  },
] as const;

/** Where the browser posts an Enquiry. The tunnel hostname, not the apex. */
export const API_ENDPOINT = "https://api.perfect-tuition.co.in/v1/enquiries";

export const NAV = [
  { href: "/coaching-centre/", label: "Coaching Centre" },
  { href: "/about/", label: "About" },
  { href: "/contact/", label: "Contact" },
] as const;
