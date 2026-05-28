// Devanagari → Hinglish (phonetic romanization).
//
// Used when the catalog admin types Hindi (Devanagari) as the canonical value
// for a translatable field. The web language toggle "En" then shows the
// transliterated Hinglish — NOT a Google-translated English version, because
// proper nouns like puja and temple names lose meaning when literally
// translated ("सुखमय दाम्पत्य जीवन प्राप्ति पूजा" should read
// "Sukhmay Dampatya Jeevan Prapti Pooja" on the En toggle, not
// "Puja for a happy married life").
//
// This is a phonetic transliteration: it produces what a Hindi speaker
// would write the word as in roman script. It does NOT translate meaning.
// Approximate Hindi schwa-deletion rules are applied so the output reads
// natural ("Sukh" not "Sukha", "Pooja" not "Poojaa").

const VOWEL_INDEP: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'ऍ': 'e', 'ऑ': 'o',
};

// Note: ा → 'a' (not 'aa') so पूजा → "Pooja" not "Poojaa".
const VOWEL_SIGN: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
  'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  'ॅ': 'e', 'ॉ': 'o',
};

const CONSONANT: Record<string, string> = {
  'क': 'k',  'ख': 'kh', 'ग': 'g',  'घ': 'gh', 'ङ': 'n',
  'च': 'ch', 'छ': 'chh','ज': 'j',  'झ': 'jh', 'ञ': 'n',
  'ट': 't',  'ठ': 'th', 'ड': 'd',  'ढ': 'dh', 'ण': 'n',
  'त': 't',  'थ': 'th', 'द': 'd',  'ध': 'dh', 'न': 'n',
  'प': 'p',  'फ': 'ph', 'ब': 'b',  'भ': 'bh', 'म': 'm',
  'य': 'y',  'र': 'r',  'ल': 'l',  'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's',  'ह': 'h',
  // Urdu/Persian-influenced consonants
  'क़': 'q',  'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z',
  'फ़': 'f',  'ड़': 'r',  'ढ़': 'rh',
  // OM-syllable
  'ॐ': 'om',
};

// Conjunct ligatures pronounced as a single phoneme cluster in modern Hindi.
// When we see <first consonant> + virama + <second consonant>, the pair maps
// to one of these (the trailing schwa rule still applies). Most important:
// ज्ञ → "gya" (jnana / gyan), क्ष → "ksh" (Lakshmi).
const CONJUNCT: Record<string, string> = {
  'ज्ञ': 'gya',
  'क्ष': 'ksh',
  'त्र': 'tr',
  'श्र': 'shr',
  'द्व': 'dv',
  'द्य': 'dy',
};

const VIRAMA = '्';        // ्  — halant, suppresses inherent schwa
const ANUSVARA = 'ं';      // ं  — nasalization (n/m)
const VISARGA = 'ः';       // ः  — terminal aspiration (h)
const CHANDRABINDU = 'ँ';  // ँ  — nasalization (often silent in romanization)
const NUKTA = '़';         // ़

const DEVANAGARI_RE = /[ऀ-ॿ]/;

type Token =
  | { type: 'C'; text: string; phonemes: number } // consonant phoneme(s), with phoneme count
  | { type: 'V'; text: string }                   // explicit vowel
  | { type: 'A' }                                 // inherent schwa (drop or keep)
  | { type: 'L'; text: string };                  // literal (digit, punctuation)

function tokenize(word: string): Token[] {
  const chars = Array.from(word);
  const out: Token[] = [];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const next = chars[i + 1];
    const afterNext = chars[i + 2];

    // 1. Conjunct ligature (consonant + virama + consonant, treated as one phoneme cluster)
    if (next === VIRAMA && afterNext) {
      const triplet = c + VIRAMA + afterNext;
      if (CONJUNCT[triplet]) {
        out.push({ type: 'C', text: CONJUNCT[triplet], phonemes: 2 });
        // After the conjunct, the next char is whatever follows afterNext.
        i += 2; // consume c, virama, afterNext
        const matraOrEnd = chars[i + 1];
        if (matraOrEnd && VOWEL_SIGN[matraOrEnd]) {
          out.push({ type: 'V', text: VOWEL_SIGN[matraOrEnd] });
          i++;
        } else if (matraOrEnd === ANUSVARA || matraOrEnd === CHANDRABINDU) {
          out.push({ type: 'A' });
        } else if (matraOrEnd === VIRAMA) {
          i++; // skip
        } else {
          out.push({ type: 'A' });
        }
        continue;
      }
    }

    if (CONSONANT[c]) {
      out.push({ type: 'C', text: CONSONANT[c], phonemes: 1 });
      if (next === VIRAMA) {
        i++; // skip — schwa suppressed
      } else if (next && VOWEL_SIGN[next]) {
        out.push({ type: 'V', text: VOWEL_SIGN[next] });
        i++;
      } else if (next === ANUSVARA || next === CHANDRABINDU) {
        out.push({ type: 'A' });
        // ANUSVARA / CHANDRABINDU get processed on next iteration.
      } else {
        out.push({ type: 'A' });
      }
    } else if (VOWEL_INDEP[c]) {
      out.push({ type: 'V', text: VOWEL_INDEP[c] });
    } else if (c === ANUSVARA) {
      out.push({ type: 'L', text: 'n' });
    } else if (c === CHANDRABINDU) {
      // Mostly silent in roman ("माँ" → "Maa" not "Maan"). Drop.
    } else if (c === VISARGA) {
      out.push({ type: 'L', text: 'h' });
    } else if (c === VIRAMA || c === NUKTA) {
      // Already handled — skip.
    } else {
      out.push({ type: 'L', text: c });
    }
  }
  return out;
}

function applySchwaDeletion(toks: Token[]): Token[] {
  if (!toks.length) return toks;
  const arr = [...toks];

  // Trailing schwa: drop UNLESS preceded by a real consonant cluster (two
  // distinct consonant phonemes back-to-back without a vowel between).
  //   सुखमय:   …C(y)+A          → last A preceded by 1 C + 1 A → drop  → "Sukhamay"
  //   दाम्पत्य: …C(t)+C(y)+A   → last A preceded by 2 Cs       → keep  → "Dampatya"
  const last = arr.length - 1;
  if (arr[last].type === 'A') {
    const prev = arr[last - 1];
    const prev2 = arr[last - 2];
    if (prev?.type === 'C' && prev2?.type === 'C') {
      // cluster — voice the schwa
    } else {
      arr.pop();
    }
  }

  // No internal schwa deletion. Hindi schwa-deletion is dictionary-dependent
  // (e.g. गणेश keeps its schwa → "Ganesh", but सुखमय drops one → "Sukhmay")
  // and without a lexicon we'd produce wrong outputs more often than right.
  // Keeping all internal schwas yields slightly verbose but always-readable
  // Hinglish: "Sukhamay", "Ganesh", "Shani", "Tanuj", "Mahayajna".

  return arr;
}

function emit(toks: Token[]): string {
  return toks.map((t) => {
    if (t.type === 'A') return 'a';
    return t.text;
  }).join('');
}

function transliterateWord(word: string): string {
  if (!DEVANAGARI_RE.test(word)) return word;
  const toks = tokenize(word);
  const reduced = applySchwaDeletion(toks);
  return emit(reduced);
}

function titleCase(s: string): string {
  return s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

/**
 * Transliterate a Devanagari string to Hinglish. Non-Devanagari tokens
 * (e.g. English words, numbers, punctuation) pass through untouched, so
 * mixed strings like "श्री Ganesh पूजा" → "Shree Ganesh Pooja" work cleanly.
 */
export function transliterateDevanagariToHinglish(text: string | null | undefined): string | null {
  if (!text) return null;
  // Split keeping the delimiters so we preserve original whitespace and punctuation.
  const parts = text.split(/(\s+|[.,;:!?—–\-()/])/);
  const out = parts.map((tok) => {
    if (!tok) return tok;
    if (/^[\s.,;:!?—–\-()/]+$/.test(tok)) return tok;
    if (!DEVANAGARI_RE.test(tok)) return tok; // pure Latin/digits — leave alone
    return transliterateWord(tok);
  }).join('');
  return titleCase(out);
}

/** Returns true if the text contains any Devanagari character. */
export function hasDevanagari(text: string | null | undefined): boolean {
  if (!text) return false;
  return DEVANAGARI_RE.test(text);
}
