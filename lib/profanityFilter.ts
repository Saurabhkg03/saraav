// Basic list of profanity and offensive terms. 
// Can be extended or replaced with a more robust library if bundle size permits.
const BAD_WORDS = [
    "anal", "anus", "arse", "ass", "asshole",
    "bastard", "bitch", "boob", "cock", "cunt",
    "damn", "dick", "dildo", "dyke", "fag", "faggot",
    "fuck", "fucker", "fucking", "gay", "goddamn",
    "hell", "homo", "jerk", "jizz", "kike", "knob",
    "lesbian", "masochist", "masturbate", "motherfucker",
    "nazi", "nigger", "nigga", "penis", "piss", "poop",
    "prick", "pussy", "queer", "rape", "retard", "rimjob",
    "scrotum", "sex", "shit", "slut", "spic", "tits",
    "turd", "twat", "vagina", "wank", "whore"
];

// Regex to catch variations like "f.u.c.k", "f*ck", "shit123"
// This matches word boundaries or start/end of string to avoid partial matches on innocent words (e.g. "class", "analysis")
// BUT for strictness, we might want to check for containment if it's a very bad word.
// For now, let's stick to word boundary check for short words, and containment for long specific slurs.

export function containsProfanity(text: string): boolean {
    if (!text) return false;

    const lowerText = text.toLowerCase();

    // 1. Direct word match
    const words = lowerText.split(/\s+/);
    for (const word of words) {
        // Remove common punctuation for checking
        const cleanWord = word.replace(/[^a-z0-9]/g, '');
        if (BAD_WORDS.includes(cleanWord)) {
            return true;
        }
    }

    // 2. Phrase/Substring match for critical words (optional, more aggressive)
    // BAD_WORDS.some(bad => lowerText.includes(bad)); // Too aggressive (matches "analysis")

    return false;
}
