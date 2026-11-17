// cleanTxn.js
//
// Banks describe the same coffee shop three different ways in three
// months, apparently losing a vowel in transit:
//
//   SQ *THE DAILY GRIN
//   SQ *THE DAILY GR N
//   THE DAILY GRIND #4471 CHI IL
//
// This file's whole job is to look at those and understand they are,
// unmistakably, the same seven dollars leaving the same account for the
// same coffee. Everything else in homebase is decoration around this.
//
// RULES_FOR_BUDDY.md, rule 2: the parser is mine.

'use strict';

// Payment processor prefixes that banks glue onto the front of merchants.
const PROCESSOR_PREFIXES = [
  /^SQ \*/,     // Square
  /^TST\* /,    // Toast
  /^PAYPAL \*/,
  /^PP\*/,
];

// Trailing junk: store numbers, cities, state codes.
const STORE_NUMBER = /\s#\d+\b.*$/;           // "#4471 CHI IL"
const TRAILING_DIGITS = /\d{3,}$/;            // "SC-INTIMATES4471"

/**
 * Normalise a raw bank transaction description into something a human,
 * or at least a function, can compare.
 */
function cleanTxn(raw) {
  if (typeof raw !== 'string') return '';
  let s = raw.toUpperCase().trim();

  for (const prefix of PROCESSOR_PREFIXES) s = s.replace(prefix, '');

  s = s.replace(STORE_NUMBER, '');
  s = s.replace(TRAILING_DIGITS, '');
  s = s.replace(/[^A-Z0-9 &'-]/g, ' ');   // stray punctuation
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

// Levenshtein distance. Yes, by hand. No, I'm not adding a dependency
// for this. (Especially not moneyflow-utils, which does not exist.)
function distance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

/**
 * Are these two descriptions the same merchant?
 *
 * Banks truncate merchant names wherever they feel like it, so a short
 * one is allowed to be the start of a long one. They also drop letters,
 * so we allow roughly one lost character per eight.
 */
function sameMerchant(a, b) {
  const x = cleanTxn(a);
  const y = cleanTxn(b);
  if (!x || !y) return false;
  if (x === y) return true;

  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  if (short.length < 6) return false; // "SC" could be a hundred companies

  const budget = Math.max(1, Math.floor(short.length / 8));
  return distance(short, long.slice(0, short.length)) <= budget;
}

module.exports = { cleanTxn, sameMerchant, distance };
