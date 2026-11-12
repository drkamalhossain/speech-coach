// Med Log — speech/text parser (Bangla + English mix). Works in the browser and in Node (for tests).
(function (root) {
"use strict";

const CLASSES = {
  preventive:    { name: "Preventive",     color: "#2b8a3e", acute: false },
  paracetamol:   { name: "Paracetamol",    color: "#e8a200", acute: true, warn: 11, limit: 15 },
  nsaid:         { name: "NSAID",          color: "#e8590c", acute: true, warn: 11, limit: 15 },
  triptan:       { name: "Triptan",        color: "#d6336c", acute: true, warn: 7,  limit: 10 },
  opioid:        { name: "Opioid",         color: "#862e9c", acute: true, warn: 7,  limit: 10 },
  antiemetic:    { name: "Antiemetic",     color: "#1098ad", acute: false },
  ppi:           { name: "PPI",            color: "#5c7cfa", acute: false },
  antihistamine: { name: "Antihistamine",  color: "#74b816", acute: false },
  asthma:        { name: "Anti-asthmatic", color: "#15aabf", acute: false },
  other:         { name: "Other",          color: "#868e96", acute: false }
};

// name, class, default dose, unit, common strengths, aliases (English, brand, Bangla spellings the phone may type)
const DEFAULT_MEDS = [
  ["Topiramate", "preventive", 25, "mg", [25, 50, 100], "topiramate|topamax|topirva|topiramet|to fever|to fir|to pyramid|to fir amit|operamit|টপিরামেট|টোপিরামেট|টপিরামিট|টোপিরামিট|টপিরামেইট|টপিরভা"],
  ["Propranolol", "preventive", 10, "mg", [10, 20, 40, 80], "propranolol propanolol indever প্রোপ্রানোলল প্রপ্রানোলল প্রোপ্রানোলোল প্রপ্রানোলোল প্রোপানোলল প্রপানোলল ইনডেভার"],
  ["Paracetamol", "paracetamol", 500, "mg", [500, 665, 1000], "paracetamol parasitamol acetaminophen napa ace প্যারাসিটামল প্যারাসিটামোল প্যারাসিটামেল পেরাসিটামল প্যারাসিটামাল নাপা এইস"],
  ["Tolfenamic acid", "nsaid", 200, "mg", [100, 200], "tolfenamic|tolfenamic acid|tufnil|টলফেনামিক|টোলফেনামিক|টলফেনামিক এসিড|টলফেনামিক অ্যাসিড|টাফনিল"],
  ["Zolmitriptan", "triptan", 2.5, "mg", [2.5, 5], "zolmitriptan zomig জোলমিট্রিপটান জলমিট্রিপটান জোলমিট্রিপ্টান জলমিট্রিপ্টান জোলমিট্রিপটেন জলমিত্রিপটান"],
  ["Sumatriptan", "triptan", 50, "mg", [50, 100], "sumatriptan সুমাট্রিপটান সুমাট্রিপ্টান"],
  ["Rizatriptan", "triptan", 10, "mg", [5, 10], "rizatriptan রিজাট্রিপটান"],
  ["Naproxen", "nsaid", 500, "mg", [250, 500], "naproxen ন্যাপ্রোক্সেন নেপ্রোক্সেন"],
  ["Ibuprofen", "nsaid", 400, "mg", [200, 400], "ibuprofen আইবুপ্রোফেন"],
  ["Diclofenac", "nsaid", 50, "mg", [50, 75, 100], "diclofenac ডাইক্লোফেনাক"],
  ["Etoricoxib", "nsaid", 90, "mg", [60, 90, 120], "etoricoxib ইটোরিকক্সিব"],
  ["Ketorolac", "nsaid", 10, "mg", [10], "ketorolac কিটোরোলাক কেটোরোলাক"],
  ["Tramadol", "opioid", 50, "mg", [50, 100], "tramadol ট্রামাডল ট্রামাডোল"],
  ["Flunarizine", "preventive", 5, "mg", [5, 10], "flunarizine ফ্লুনারিজিন"],
  ["Amitriptyline", "preventive", 10, "mg", [10, 25], "amitriptyline অ্যামিট্রিপটিলিন এমিট্রিপটিলিন"],
  ["Domperidone", "antiemetic", 10, "mg", [10], "domperidone ডমপেরিডন"],
  ["Ondansetron", "antiemetic", 8, "mg", [4, 8], "ondansetron অনডানসেট্রন ওন্ডানসেট্রন"],
  ["Omeprazole", "ppi", 20, "mg", [20, 40], "omeprazole seclo ওমিপ্রাজল ওমিপ্রাজোল সেকলো"],
  ["Esomeprazole", "ppi", 20, "mg", [20, 40], "esomeprazole sergel ইসোমিপ্রাজল এসোমিপ্রাজল ইসোমিপ্রাজোল সার্জেল"],
  ["Pantoprazole", "ppi", 40, "mg", [20, 40], "pantoprazole প্যান্টোপ্রাজল প্যান্টোপ্রাজোল"],
  ["Rabeprazole", "ppi", 20, "mg", [20], "rabeprazole র‍্যাবিপ্রাজল রেবিপ্রাজল"],
  ["Fexofenadine", "antihistamine", 120, "mg", [60, 120, 180], "fexofenadine|fexo|fexofenadin|phenadin|fenned in|fexofen|ফেক্সোফেনাডিন|ফেক্সো"],
  ["Cetirizine", "antihistamine", 10, "mg", [10], "cetirizine সেটিরিজিন"],
  ["Desloratadine", "antihistamine", 5, "mg", [5], "desloratadine ডেসলোরাটাডিন"],
  ["Rupatadine", "antihistamine", 10, "mg", [10], "rupatadine রুপাটাডিন"],
  ["Montelukast", "asthma", 10, "mg", [10], "montelukast monas মন্টিলুকাস্ট মন্টেলুকাস্ট মোন্টেলুকাস্ট মোনাস"],
  ["Salbutamol inhaler", "asthma", 2, "puff", [1, 2], "salbutamol ventolin সালবিউটামল সালবুটামল ভেন্টোলিন"],
  ["Doxofylline", "asthma", 400, "mg", [200, 400], "doxofylline ডক্সোফাইলিন"],
  ["Clonazepam", "other", 0.25, "mg", [0.25, 0.5, 1, 2], "clonazepam rivotril clonapam ক্লোনাজেপাম ক্লোনাজিপাম"]
].map(([name, cls, dose, unit, str, al]) => ({
  name, cls, dose, unit, str,
  alias: (al.includes("|") ? al.split("|") : al.split(" ")).map(s => s.trim()).filter(Boolean)
}));

// ---------- text helpers ----------
const BN_DIG = "০১২৩৪৫৬৭৮৯";
const WORDNUM = {
  "এক": "1", "একটা": "1 টা", "একটি": "1 টি", "১টা": "1 টা",
  "দুই": "2", "দুইটা": "2 টা", "দুটো": "2 টা", "দুটা": "2 টা", "দুটি": "2 টি", "দুইটি": "2 টি",
  "তিন": "3", "তিনটা": "3 টা", "তিনটি": "3 টি", "চার": "4", "চারটা": "4 টা", "পাঁচ": "5",
  "ছয়": "6", "সাত": "7", "আট": "8", "দশ": "10", "এগারো": "11", "বারো": "12",
  "পঁচিশ": "25", "পঞ্চাশ": "50", "একশো": "100", "দুইশো": "200", "দুশো": "200", "পাঁচশো": "500", "পাঁচশ": "500",
  "আড়াই": "2.5", "দেড়": "1.5", "আধা": "0.5", "হাফ": "0.5",
  "one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6", "seven": "7", "eight": "8",
  "nine": "9", "ten": "10", "eleven": "11", "twelve": "12", "half": "0.5", "an": "1"
};

function norm(text) {
  let s = String(text || "").normalize("NFC").toLowerCase().replace(/[০-৯]/g, d => BN_DIG.indexOf(d));
  s = s.replace(/[,;!?।|"“”‘’()]/g, " ").replace(/(\d)\s*\.\s*(\d)/g, "$1.$2");
  s = s.replace(/(\d)([^\d\s.:\/])/g, "$1 $2").replace(/([^\d\s.:\/])(\d)/g, "$1 $2");
  s = s.split(/\s+/).map(t => (WORDNUM[t] !== undefined ? WORDNUM[t] : t)).join(" ");
  s = s.replace(/(\d+(?:\.\d+)?)\s+(হাজার|thousand)/g, (m, n) => String(+n * 1000))
       .replace(/(^|\s)(হাজার|thousand)(?=\s|$)/g, "$1 1000")
       .replace(/(\d+)\s+(শো|শ|শত|hundred)(?=\s|$)/g, (m, n) => String(+n * 100))
       .replace(/(^|\s)(a|1)\s+(hour|minute)/g, "$1 1 $3");
  return s.replace(/\s+/g, " ").trim();
}

// fuzzy "skeleton" so that small spelling differences from speech-to-text still match
function skel(w) {
  w = String(w).toLowerCase();
  if (/[ঀ-৿]/.test(w)) {
    return w.replace(/ড়/g, "ড").replace(/ঢ়/g, "ঢ").replace(/য়/g, "য")
      .replace(/[ঁ-ঃ়া-্ৗ‌‍]/g, "")
      .replace(/[অআইঈউঊঋএঐওঔ]/g, "অ").replace(/[শষস]/g, "স").replace(/[নণ]/g, "ন")
      .replace(/[তট]/g, "ট").replace(/[দড]/g, "ড").replace(/[থঠ]/g, "ঠ").replace(/[ধঢ]/g, "ঢ").replace(/[জযয]/g, "জ")
      .replace(/[^ঀ-৿]/g, "");
  }
  return w.replace(/[^a-z]/g, "").replace(/ph/g, "f").replace(/y/g, "i").replace(/(.)\1+/g, "$1");
}
function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length; if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
// sound-alike skeleton for English: "to fir amit" ≈ "operamit" ≈ "topiramate"
function csk(w) {
  return String(w).toLowerCase().replace(/[^a-z]/g, "").replace(/ph/g, "f").replace(/x/g, "ks")
    .replace(/[fv]/g, "p").replace(/d/g, "t").replace(/[cqk]/g, "k").replace(/z/g, "s")
    .replace(/[aeiouyhw]/g, "").replace(/(.)\1+/g, "$1");
}
const STOP = new Set(["tablet", "tablets", "tab", "taken", "took", "take", "has", "have", "had", "i", "yesterday", "today", "night", "morning",
  "evening", "afternoon", "at", "and", "also", "the", "a", "of", "mg", "milligram", "milligrams", "times", "time", "two", "one", "after",
  "before", "with", "in", "on", "is", "was", "my", "me", "last", "this", "now", "just", "half"]);
const allowed = L => (L < 5 ? 0 : L < 8 ? 1 : 2);

const B = "(?:^|\\s)", E = "(?=\\s|$)";
const rx = (body, f) => new RegExp(body, f || "");
function cut(s, m) { return s.slice(0, m.index) + " " + s.slice(m.index + m[0].length); }

// ---------- time ----------
const PERIOD = { "ভোর": "dawn", "সকাল": "morning", "দুপুর": "noon", "বিকাল": "afternoon", "বিকেল": "afternoon",
  "সন্ধ্যা": "evening", "সন্ধা": "evening", "রাত": "night", "morning": "morning", "afternoon": "afternoon",
  "evening": "evening", "night": "night", "tonight": "night", "noon": "noon" };
const PER_ALT = Object.keys(PERIOD).join("|");
const SUF = "(?:বেলায়|বেলা|ের|ে|য়|এ)?";
const DEF_HOUR = { dawn: 6, morning: 8, noon: 13, afternoon: 16, evening: 19, night: 22 };
const NOT_DOSE = "(?!\\s*(?:\\d|mg|এমজি|মিলিগ্রাম|mcg|ml|ট্যাবলেট|ট্যাব|tab|tablet|puff|পাফ))";

function hoursFor(h, m, ap, per) {
  if (h > 12 && h < 24) return [h];
  if (ap === "pm") return [h % 12 + 12];
  if (ap === "am") return [h % 12];
  if (per === "dawn" || per === "morning") return [h % 12];
  if (per === "noon") return [h === 12 ? 12 : h >= 11 ? h : h + 12];
  if (per === "afternoon" || per === "evening") return [h % 12 + 12];
  if (per === "night") return [h === 12 ? 0 : h <= 5 ? h : h % 12 + 12];
  return h === 12 ? [12, 0] : [h, h + 12];
}

function parseTime(s, now) {
  const r = { ts: now, found: false, guessed: false };
  let dayOff = null, per = null, m;

  m = rx(B + "(last night|this morning|yesterday|today|গত রাতে|গতরাতে|গত রাত|গতরাত|কাল রাতে|কাল রাত|গতকাল|গত কাল|কালকে|কাল|আজকে|আজ)" + E).exec(s);
  if (m) {
    const w = m[1];
    if (/last night|গত ?রাত|কাল রাত/.test(w)) { dayOff = -1; per = "night"; }
    else if (w === "this morning") { dayOff = 0; per = "morning"; }
    else dayOff = /today|আজ/.test(w) ? 0 : -1;
    s = cut(s, m);
  }
  m = rx(B + "(\\d+(?:\\.\\d+)?)\\s*(ঘণ্টা|ঘন্টা|hours?|hrs?|মিনিট|minutes?|mins?)\\s*(আগে|ago|before|আগেই)" + E).exec(s);
  if (m) {
    const mins = /ঘ|h/.test(m[2]) ? +m[1] * 60 : +m[1];
    s = cut(s, m); r.ts = now - mins * 60000; r.found = true; return { ...r, rest: s };
  }

  let h = null, min = 0, ap = null;
  const half = (p, hh, mm) => p === "সাড়ে" ? [hh, 30] : p === "সোয়া" ? [hh, 15] : p === "পৌনে" ? [hh - 1 || 12, 45] : [hh, mm];
  const pats = [
    // রাত ৮টা / সকাল সাড়ে ৯টায় / night 10
    [rx(B + "(" + PER_ALT + ")" + SUF + "\\s*(সাড়ে|সোয়া|পৌনে)?\\s*(\\d{1,2})(?:[:.](\\d{2}))?\\s*(?:(?:টায়|টার|টা|বাজে|o'clock|oclock)(?:\\s*(?:সময়|দিকে|নাগাদ))?)?\\s*(am|pm|a\\.m\\.|p\\.m\\.)?" + NOT_DOSE),
      x => ({ per: PERIOD[x[1]], p: x[2], h: +x[3], m: +(x[4] || 0), ap: x[5] })],
    // 8:30 pm / সাড়ে 8:00
    [rx(B + "(সাড়ে|সোয়া|পৌনে)?\\s*(\\d{1,2})(?::(\\d{2})\\s*(am|pm|a\\.m\\.|p\\.m\\.)?|\\.(\\d{2})\\s*(am|pm|a\\.m\\.|p\\.m\\.))" + E),
      x => ({ p: x[1], h: +x[2], m: +(x[3] || x[5]), ap: x[4] || x[6] })],
    // 8 pm
    [rx(B + "(\\d{1,2})\\s*(am|pm|a\\.m\\.|p\\.m\\.|এএম|পিএম)" + E), x => ({ h: +x[1], ap: x[2] })],
    // ৮টায় / সাড়ে ৮টা / 9 o'clock
    [rx(B + "(সাড়ে|সোয়া|পৌনে)?\\s*(\\d{1,2})\\s*(টার সময়|টার দিকে|টা নাগাদ|টায়|বাজে|o'clock|oclock|টা)" + E),
      x => (x[3] === "টা" && !x[1] && +x[2] < 5 ? null : { p: x[1], h: +x[2] })],
    // at 8 / around 10:30
    [rx(B + "(at|around|by|@)\\s*(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm|a\\.m\\.|p\\.m\\.)?" + E),
      x => ({ h: +x[2], m: +(x[3] || 0), ap: x[4] })]
  ];
  search: for (const [re, f] of pats) {
    const g0 = new RegExp(re.source, "g");
    while ((m = g0.exec(s))) {
      const g = f(m);
      if (!g || g.h > 23 || g.m > 59) { g0.lastIndex = m.index + 1; continue; }
      [h, min] = half(g.p, g.h, g.m || 0);
      ap = g.ap ? (/p|পি/.test(g.ap) ? "pm" : "am") : null;
      if (g.per) per = g.per;
      s = cut(s, m); break search;
    }
  }
  m = rx(B + "(" + PER_ALT + ")" + SUF + E).exec(s);
  if (m) { if (!per) per = PERIOD[m[1]]; s = cut(s, m); }

  if (h === null && per) { h = DEF_HOUR[per]; min = per === "evening" ? 30 : 0; r.guessed = true; }
  if (h === null) {
    if (dayOff === -1) { r.ts = now - 864e5; r.found = true; r.guessed = true; }
    else if (rx(B + "(এইমাত্র|এই মাত্র|just now|right now|now|এখন)" + E).test(s)) r.found = true;
    s = s.replace(rx(B + "(এইমাত্র|এই মাত্র|just now|right now|now|এখন)" + E, "g"), " ");
    return { ...r, rest: s };
  }
  if (per === "night" && h <= 5 && dayOff === -1) dayOff = 0;
  const cands = [];
  const days = dayOff === null ? [0, -1] : [dayOff];
  for (const d of days) for (const hh of hoursFor(h, min, ap, per)) {
    const t = new Date(now); t.setDate(t.getDate() + d); t.setHours(hh, min, 0, 0); cands.push(+t);
  }
  const past = cands.filter(t => t <= now + 10 * 60000);
  r.ts = past.length ? Math.max(...past) : Math.min(...cands);
  // "রাতে খেলাম" said at 9:30 pm: the default 10 pm is still ahead, so it means just now
  if (r.guessed && dayOff === null && cands[0] > now && cands[0] - now < 3 * 3600e3) r.ts = now;
  r.found = true;
  return { ...r, rest: s };
}

// ---------- attack / relief ----------
const PAIN = "মাথাব্যথা|মাথা ব্যথা|মাথাব্যাথা|মাথা ব্যাথা|মাথার ব্যথা|ব্যথা|ব্যাথা|headache|migraine|মাইগ্রেন|মাইগ্রেইন|pain";
const W = (re) => new RegExp(re.source.replace(/\\b/g, "(?<![a-z])").replace(/\\B/g, "(?![a-z])"));
const ATTACK_RE = W(/\bmigraine|মাইগ্রেন|মাইগ্রেইন|\bheadache|\bhead ache|মাথাব্যথা|মাথা ব্যথা|মাথাব্যাথা|মাথা ব্যাথা|মাথার ব্যথা|\battack|অ্যাটাক|এটাক|\baura\B|অরা|ব্যথা শুরু|ব্যাথা শুরু|\bpain started\B/);
const RELIEF = [
  ["none", W(/কমেনি|কমে নি|কমছে না|কাজ করেনি|কাজ করে নি|কাজ হয়নি|কাজ হয় নি|\bno relief\B|\bnot better\B|\bdidn't work\B|\bdid not work\B|\bnot working\B|\bno improvement\B|\bstill there\B/)],
  ["complete", W(/সেরে গেছে|সেরে গিয়েছে|ভালো হয়ে গেছে|ভাল হয়ে গেছে|পুরোপুরি|চলে গেছে|ব্যথা নেই|ব্যথা নাই|ব্যাথা নেই|\bpain free\B|\bpain-free\B|\bgone\B|\bresolved\B|\bcompletely\B|\bfully\B|\btotally\B/)],
  ["partial", W(/কমেছে|কমে গেছে|কমেছে|কিছুটা|একটু ভালো|একটু কম|\bbetter\B|\bpartial\B|\beased\B|\breduced\B|\bimproved\B|\bless\B/)]
];
const SYMPTOMS = [
  ["Aura", W(/\baura\B|অরা|ঝাপসা|\bzig ?zag\B|জিগজ্যাগ|চোখে আলো|\bblurred\B/)],
  ["Nausea/vomiting", W(/\bnausea\B|\bvomit|বমি/)],
  ["Light sensitivity", W(/\blight\B|\bphotophobia\B|আলো/)],
  ["Sound sensitivity", W(/\bsound\B|\bnoise sensitiv|\bphonophobia\B|শব্দ সহ্য|আওয়াজ সহ্য/)]
];
const TRIGGERS = [
  ["Poor sleep", W(/\bsleep|ঘুম|রাত জাগা|রাত জেগে/)],
  ["Stress", W(/\bstress\B|\btension\B|টেনশন|স্ট্রেস|চাপ|\banxiety\B|দুশ্চিন্তা/)],
  ["Missed meal", W(/\bskipped|\bmissed meal\B|\bfasting\B|না খেয়ে|খাওয়া হয়নি|রোজা|\bhungry\B|ক্ষুধা|খিদা|খিদে/)],
  ["Sun/heat", W(/\bsun\B|\bheat\B|রোদ|গরম/)],
  ["Screen time", W(/\bscreen\B|স্ক্রিন|মোবাইল|\bcomputer\B|কম্পিউটার|\blaptop\B|ল্যাপটপ/)],
  ["Night duty", W(/\bduty\B|ডিউটি|\bnight shift\B|\bon ?call\B|অনকল|শিফট/)],
  ["Noise", W(/\bnoise\B|শব্দ|আওয়াজ|হৈচৈ/)],
  ["Smell", W(/\bsmell\B|গন্ধ|\bperfume\B|পারফিউম/)],
  ["Travel", W(/\btravel\B|\bjourney\B|জার্নি|ভ্রমণ|\btraffic\B|জ্যাম/)],
  ["Caffeine", W(/\bcaffeine\B|\bcoffee\B|কফি/)],
  ["Weather", W(/\bweather\B|আবহাওয়া|বৃষ্টি|\brain\B/)]
];
const SEV_WORDS = [[8, W(/\bsevere\B|তীব্র|প্রচণ্ড|প্রচন্ড|খুব বেশি|অনেক বেশি|\bunbearable\B|অসহ্য/)], [5, W(/\bmoderate\B|মাঝারি|মোটামুটি/)], [3, W(/\bmild\B|হালকা|অল্প/)]];

function parseAttack(s) {
  const a = { attack: ATTACK_RE.test(s), severity: null, relief: null, symptoms: [], triggers: [] };
  let m = rx(B + "(?:severity|" + PAIN + "|তীব্রতা|score|স্কোর|লেভেল|level)\\s*(?:is|ছিল|হচ্ছে|was|now|এখন)?\\s*(\\d{1,2})(?:\\s*(?:/|out of|আউট অফ|এর মধ্যে)\\s*10)?" + E).exec(s)
       || rx(B + "(\\d{1,2})\\s*(?:/|out of|আউট অফ|এর মধ্যে)\\s*10" + E).exec(s);
  if (m && +m[1] <= 10) { a.severity = +m[1]; s = cut(s, m); a.attack = true; }
  if (a.severity === null) for (const [v, re] of SEV_WORDS) if (re.test(s)) { a.severity = v; break; }
  if (rx(PAIN).test(s)) for (const [k, re] of RELIEF) if (re.test(s)) { a.relief = k; break; }
  for (const [k, re] of SYMPTOMS) if (re.test(s)) a.symptoms.push(k);
  for (const [k, re] of TRIGGERS) if (re.test(s)) a.triggers.push(k);
  return { a, rest: s };
}

// ---------- medicines ----------
const UNIT_G = new Set(["g", "gm", "gram", "grams", "গ্রাম", "জি"]);
const UNIT_MG = new Set(["mg", "এমজি", "মিলিগ্রাম", "milligram", "milligrams", "মিগ্রা", "এম.জি", "m.g"]);
const UNIT_OTHER = { "mcg": "mcg", "microgram": "mcg", "ml": "ml", "এমএল": "ml", "puff": "puff", "puffs": "puff", "পাফ": "puff", "drop": "drop", "drops": "drop", "ফোঁটা": "drop" };
const COUNT = new Set(["tab", "tabs", "tablet", "tablets", "ট্যাবলেট", "ট্যাব", "টা", "টি", "টো", "pill", "pills", "capsule", "capsules", "ক্যাপসুল", "বড়ি"]);
const FILLER = new Set(["খেলাম", "খেয়েছি", "খাইছি", "খেয়েছিলাম", "নিলাম", "নিয়েছি", "took", "taken", "take", "have", "had", "i", "tablet", "tab", "ট্যাবলেট", "ট্যাব", "mg", "এমজি", "আর", "and", "এবং", "এই", "the", "a", "of", "one", "1", "টা", "টি", "করে", "একটা", "দিয়ে", "সাথে", "with", "also", "আরো", "আরও", "medicine", "ওষুধ", "ঔষধ", "ঔষুধ"]);

function prepMeds(meds) {
  return meds.map(md => {
    const al = [md.name, ...(md.alias || [])].map(a => norm(a)).filter(Boolean);
    return { md, al: [...new Set(al)].map(a => ({ toks: a.split(" "), sk: skel(a.replace(/\s+/g, "")), raw: a.replace(/\s+/g, ""), cs: /^[a-z ]+$/.test(a) ? csk(a) : "" })) };
  });
}

function findMeds(tokens, prepped) {
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    let best = null;
    for (const p of prepped) for (const a of p.al) {
      const n = a.toks.length;
      const tries = n > 1 ? [n] : [1, 2, 3];
      for (const span of tries) {
        if (i + span > tokens.length) continue;
        const part = tokens.slice(i, i + span);
        if (part.some(x => /\d/.test(x) || STOP.has(x))) continue;
        const cand = part.join("");
        let d = null;
        if (cand === a.raw) d = 0;
        else {
          const L = a.sk.length, al = allowed(L);
          if (al) { const x = lev(skel(cand), a.sk); if (x <= al && Math.abs(cand.length - a.raw.length) <= 4) d = x; }
          if (d === null && a.cs.length >= 4 && /^[a-z]+$/.test(cand)) {
            const c = csk(cand), x = lev(c, a.cs);
            if (c.length >= 3 && x <= (a.cs.length >= 6 ? 2 : 1)) d = 1.5 + x;
          }
          if (d === null) continue;
        }
        const score = d * 10 + (n > 1 ? -span : span) * 0.5 - a.raw.length / 100;
        if (!best || score < best.score) best = { md: p.md, start: i, end: i + span, score, dist: d };
      }
    }
    if (best) { out.push(best); i = best.end; } else i++;
  }
  return out;
}

function readDose(seg, md) {
  let dose = null, unit = null, count = null;
  for (let k = 0; k < seg.length; k++) {
    const t = seg[k]; if (!/^\d+(\.\d+)?$/.test(t)) continue;
    const n = +t, nx = seg[k + 1] || "";
    if (UNIT_MG.has(nx) || (nx === "এম" && seg[k + 2] === "জি")) { if (dose === null) { dose = n; unit = "mg"; } }
    else if (UNIT_G.has(nx) && n <= 2) { if (dose === null) { dose = n * 1000; unit = "mg"; } }
    else if (UNIT_OTHER[nx]) { if (dose === null) { dose = n; unit = UNIT_OTHER[nx]; } }
    else if (COUNT.has(nx)) { if (count === null) count = n; }
    else if (dose === null) {
      if (n <= 4 && md.dose > 4 && !(md.str || []).includes(n)) { if (count === null) count = n; }
      else dose = n;
    }
  }
  if (dose === null && count !== null && md.unit !== "mg") { dose = count; unit = md.unit; count = null; }
  if (dose === null) { dose = md.dose; unit = md.unit; if (count) dose = +(md.dose * count).toFixed(2); }
  else if (count && count > 1) dose = +(dose * count).toFixed(2);
  return { dose, unit: unit || md.unit, count };
}

function parse(text, meds, now) {
  now = now || Date.now();
  meds = meds || DEFAULT_MEDS;
  const prepped = prepMeds(meds);
  const heard = String(text || "").trim();
  const all = norm(heard).split(" ").filter(Boolean);
  const found0 = findMeds(all, prepped);

  // split the sentence into chunks, one per medicine, so each medicine can carry its own time
  const starts = found0.map(f => {
    let b = f.start;
    if (b >= 2 && /^\d+$/.test(all[b - 2]) && COUNT.has(all[b - 1])) b -= 2;          // "2 টা নাপা"
    else if (b >= 1 && /^\d+$/.test(all[b - 1]) && +all[b - 1] <= 4) b -= 1;          // "2 napa"
    return b;
  });
  const bounds = [0, ...starts.filter(x => x > 0), all.length].filter((x, i, a) => i === 0 || x > a[i - 1]);
  const chunks = [];
  for (let i = 0; i < bounds.length - 1; i++) chunks.push(all.slice(bounds[i], bounds[i + 1]).join(" "));

  const att = { attack: false, severity: null, relief: null, symptoms: new Set(), triggers: new Set() };
  const parts = chunks.map(c => {
    const t = parseTime(" " + c + " ", now);
    const at = parseAttack(t.rest);
    att.attack = att.attack || at.a.attack;
    if (att.severity === null) att.severity = at.a.severity;
    if (!att.relief) att.relief = at.a.relief;
    at.a.symptoms.forEach(x => att.symptoms.add(x)); at.a.triggers.forEach(x => att.triggers.add(x));
    return { t, tokens: at.rest.split(" ").filter(Boolean) };
  });
  const first = parts.find(p => p.t.found);
  const gTime = first ? first.t : { ts: now, found: false, guessed: false };
  const timeOf = p => (p.t.found ? p.t : gTime);

  const items = [];
  parts.forEach(p => {
    const f = findMeds(p.tokens, prepped);
    f.forEach((m, j) => {
      const next = f[j + 1];
      const seg = p.tokens.slice(0, m.start).concat(p.tokens.slice(m.end, next ? next.start : p.tokens.length));
      const d = readDose(seg, m.md);
      const t = timeOf(p);
      items.push({ kind: "dose", ts: t.ts, drug: m.md.name, cls: m.md.cls, dose: d.dose, unit: d.unit, heard, timeGuessed: !t.found || t.guessed });
    });
  });

  const tA = gTime;
  if (att.relief) {
    items.push({ kind: "relief", ts: tA.ts, relief: att.relief, heard });
  } else if (att.attack || (att.severity !== null && !items.length)) {
    items.unshift({ kind: "attack", ts: tA.ts, severity: att.severity === null ? 5 : att.severity, sevGuessed: att.severity === null,
      symptoms: [...att.symptoms], triggers: [...att.triggers], relief: "", end: 0, note: "", heard, timeGuessed: !tA.found || tA.guessed });
  }

  if (!items.length && heard) {
    // nothing recognised: keep the words as a new medicine name so it can be fixed and saved
    const tokens = parts.flatMap(p => p.tokens);
    const seen = new Set();
    const words = tokens.filter(w => !/^\d/.test(w) && !FILLER.has(w) && !STOP.has(w) && !UNIT_MG.has(w) && !COUNT.has(w) && !seen.has(w) && seen.add(w));
    if (words.length) {
      const name = words.slice(0, 2).join(" ").replace(/(^|\s)\S/g, c => c.toUpperCase());
      const d = readDose(tokens, { dose: null, unit: "mg", str: [] });
      items.push({ kind: "dose", ts: gTime.ts, drug: name, cls: "other", dose: d.dose, unit: d.unit || "mg", heard, unknown: true, guess: words.slice(0, 3).join(" "), timeGuessed: !gTime.found || gTime.guessed });
    }
  }
  return items;
}

// how well a speech alternative was understood (to pick the best of several)
function score(items) {
  return items.reduce((a, it) => a + (it.unknown ? 1 : it.kind === "dose" ? 10 : 6) + (it.timeGuessed ? 0 : 1), 0);
}

const api = { CLASSES, DEFAULT_MEDS, parse, score, norm, skel, lev };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.MedParser = api;
})(this);
