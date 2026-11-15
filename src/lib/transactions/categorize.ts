/**
 * Deterministic transaction categorization.
 *
 * Given a free-text description, suggest a built-in category by matching known
 * merchants and keywords. This is 100% rule-based — no AI or network calls —
 * so basic functionality never depends on an external service.
 *
 * Suggestions are built-in category keys (DefaultCategory.key), not names, so a
 * category still gets suggested after the user renames it. The caller maps the
 * key to the user's row via Category.systemKey; no row (e.g. the user deleted
 * that category) means no suggestion.
 */

export interface CategoryRule {
  /** Built-in category key this rule resolves to (a DefaultCategory.key). */
  key: string;
  /** Lowercased keywords/merchants. Word-boundary matched against description. */
  keywords: string[];
}

/** Ordered rules — earlier, more specific rules win ties by keyword length. */
export const CATEGORY_RULES: CategoryRule[] = [
  {
    key: "food",
    keywords: [
      "swiggy", "zomato", "dominos", "domino", "pizza", "mcdonald", "kfc", "burger",
      "restaurant", "cafe", "coffee", "starbucks", "chai", "tea", "biscuit", "dinner", "lunch",
      "breakfast", "tiffin", "dhaba", "juice", "pani puri", "pista house", "cafeteria",
      "shawarma", "noodles", "drunken monkey", "milkshake", "shake", "wrap", "spices",
      "kochin spices", "chicken", "biryani", "eatfit", "faasos", "dunzo food", "food",
      "bakery", "cake", "sweets", "chaat", "momos", "dosa", "idli", "curry", "thali",
      "ice cream", "kulfi", "snack", "snacks",
    ],
  },
  {
    key: "groceries",
    keywords: [
      "bigbasket", "big basket", "blinkit", "zepto", "grofers", "dmart", "d-mart",
      "reliance fresh", "more supermarket", "grocery", "groceries", "supermarket",
      "kirana", "vegetables", "vegetable", "fruit", "fruits", "milk", "dairy", "instamart",
    ],
  },
  {
    key: "transportation",
    keywords: [
      "uber", "ola", "rapido", "auto", "cab", "taxi", "metro", "bus", "irctc",
      "train", "petrol", "diesel", "fuel", "cng", "fastag", "parking", "namma yatri",
      "redbus", "toll", "bus ticket", "train ticket", "koyambedu",
    ],
  },
  {
    key: "subscriptions",
    keywords: [
      "netflix", "spotify", "prime video", "amazon prime", "hotstar", "disney",
      "youtube premium", "sony liv", "zee5", "apple music", "icloud", "google one",
      "subscription", "gaana", "audible", "canva", "notion", "chatgpt", "openai",
    ],
  },
  {
    key: "shopping",
    keywords: [
      "amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "tatacliq",
      "snapdeal", "shopping", "decathlon", "ikea", "lifestyle", "shoppers stop",
      "croma", "reliance digital",
    ],
  },
  {
    key: "bills-utilities",
    keywords: [
      "jio", "airtel", "vi", "vodafone", "bsnl", "recharge", "electricity",
      "water bill", "gas bill", "broadband", "wifi", "internet", "bescom", "tneb",
      "adani electricity", "tata power", "bill payment", "postpaid", "dth",
      "act fibernet", "hathway",
    ],
  },
  {
    key: "entertainment",
    keywords: [
      "bookmyshow", "pvr", "inox", "cinema", "movie", "movie ticket", "game", "steam",
      "playstation", "xbox", "concert", "event", "brand new day", "atrium mall",
    ],
  },
  {
    key: "healthcare",
    keywords: [
      "pharmacy", "apollo", "pharmeasy", "1mg", "netmeds", "hospital", "clinic",
      "doctor", "medical", "medicine", "practo", "diagnostic", "lab test",
      "bandaid", "cult.fit", "cultfit", "gym",
    ],
  },
  {
    key: "education",
    keywords: [
      "udemy", "coursera", "byju", "unacademy", "vedantu", "college fee",
      "school fee", "tuition", "course", "exam fee", "books", "upgrad", "great learning",
    ],
  },
  {
    key: "travel",
    keywords: [
      "makemytrip", "goibibo", "cleartrip", "yatra", "ixigo", "oyo", "airbnb",
      "hotel", "flight", "indigo", "vistara", "air india", "spicejet", "ola outstation",
      "booking.com", "trip",
    ],
  },
  {
    key: "housing",
    keywords: ["rent", "maintenance", "society", "landlord", "housing", "brokerage", "pg", "hostel", "advance", "deposit"],
  },
  {
    key: "bank-charges",
    keywords: [
      "bank charge", "atm fee", "annual fee", "processing fee", "convenience fee",
      "gst", "sms charges", "penalty", "late fee",
    ],
  },
  {
    key: "family",
    keywords: ["school", "daycare", "toys", "baby", "kids", "family", "mom transferred", "aunt transferred", "dad transferred", "brother", "sister"],
  },
  {
    key: "salary",
    keywords: ["salary", "payroll", "stipend", "wages"],
  },
  {
    key: "business",
    keywords: ["invoice", "client payment", "freelance", "consulting", "business income"],
  },
  {
    key: "investments",
    keywords: ["dividend", "interest credit", "mutual fund redemption", "capital gain", "sip return"],
  },
  {
    key: "other-income",
    keywords: ["deposited money", "cash deposit", "refund received", "cash back", "cashback", "reward"],
  },
];

/**
 * Suggest a built-in category key for a description. Returns null when nothing
 * matches confidently, so the caller can leave the field for the user to fill.
 */
export function suggestCategoryKey(description: string): string | null {
  const text = ` ${description.toLowerCase().trim()} `;
  if (text.trim() === "") return null;

  let best: { key: string; score: number } | null = null;
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (matchesKeyword(text, kw)) {
        const score = kw.length; // longer, more specific keyword wins
        if (!best || score > best.score) best = { key: rule.key, score };
      }
    }
  }
  return best?.key ?? null;
}

function matchesKeyword(haystack: string, keyword: string): boolean {
  // Word-ish boundary match: keyword surrounded by non-alphanumerics.
  const idx = haystack.indexOf(keyword);
  if (idx === -1) return false;
  const before = haystack[idx - 1];
  const after = haystack[idx + keyword.length];
  const boundary = (c: string | undefined) => c === undefined || !/[a-z0-9]/.test(c);
  return boundary(before) && boundary(after);
}

const MERCHANT_STOPWORDS = new Set(["to", "for", "at", "the", "a", "an", "my", "on", "from", "paid", "payment"]);
// Raw UPI/bank reference tokens that carry no merchant identity of their own.
const MERCHANT_NOISE = new Set(["upi", "neft", "imps", "rtgs", "pos", "txn", "ref", "transfer", "debit", "credit", "purchase"]);

function isMerchantNoise(word: string): boolean {
  if (!word) return true;
  const lower = word.toLowerCase();
  if (MERCHANT_STOPWORDS.has(lower) || MERCHANT_NOISE.has(lower)) return true;
  if (/^\d+$/.test(word)) return true; // pure reference/phone number
  if (word.includes("@")) return true; // VPA handle, e.g. "name@bank"
  return false;
}

/** Extract a likely merchant name from a description (first meaningful token). */
export function guessMerchant(description: string): string | null {
  const cleaned = description.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  // Bank/UPI reference strings are often one long hyphen-joined token with no
  // spaces at all (e.g. "UPI-SWIGGY-9876543210@ybl-1234567890-Payment") — split
  // on '-' and '/' too, or the whole reference string becomes the "merchant".
  const tokens = cleaned.split(/[\s/]+/).flatMap((w) => w.split("-"));
  const first = tokens.find((w) => !isMerchantNoise(w));
  return first ? first.replace(/[^a-zA-Z0-9.&' -]/g, "") || null : null;
}
