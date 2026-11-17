// cleanTxn.test.js
//
// Fifteen test cases. Run with: npm test
//
// Fourteen pass. The fifteenth has achieved a kind of folk status as the
// one that will probably never be solved.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanTxn, sameMerchant } = require('../src/cleanTxn');

test('case 1: the daily grind, lost a vowel in transit', () => {
  assert.ok(sameMerchant('SQ *THE DAILY GRIN', 'SQ *THE DAILY GR N'));
});

test('case 2: the daily grind, left a forwarding address', () => {
  assert.ok(sameMerchant('SQ *THE DAILY GRIN', 'THE DAILY GRIND #4471 CHI IL'));
});

test('case 3: store numbers and cities are not part of the name', () => {
  assert.equal(cleanTxn('THE DAILY GRIND #4471 CHI IL'), 'THE DAILY GRIND');
});

test('case 4: processor prefixes come off', () => {
  assert.equal(cleanTxn('SQ *THE DAILY GRIN'), 'THE DAILY GRIN');
});

test('case 5: Serenow ($12.99/month, used twice, fourteen months ago)', () => {
  assert.ok(sameMerchant('SERENOW', 'serenow '));
});

test('case 6: case does not matter', () => {
  assert.ok(sameMerchant('Aura Flow', 'AURA FLOW'));
});

test('case 7: PeakMind Pro (nobody has ever heard of it)', () => {
  assert.ok(sameMerchant('PEAKMIND PRO', 'PP*PEAKMIND PRO'));
});

test('case 8: trailing reference digits come off', () => {
  assert.equal(cleanTxn('SC-INTIMATES4471'), 'SC-INTIMATES');
});

test('case 9: "SC" could be a hundred companies', () => {
  assert.equal(sameMerchant('SC', 'SC-INTIMATES4471'), false);
});

test('case 10: different merchants are different', () => {
  assert.equal(sameMerchant('SERENOW', 'PEAKMIND PRO'), false);
});

test('case 11: empty descriptions match nothing', () => {
  assert.equal(sameMerchant('', 'SERENOW'), false);
});

test('case 12: not a string', () => {
  assert.equal(cleanTxn(undefined), '');
});

test('case 13: punctuation is noise', () => {
  assert.equal(cleanTxn('AURA*FLOW!!'), 'AURA FLOW');
});

test('case 14: whitespace is noise', () => {
  assert.equal(cleanTxn('  AURA    FLOW  '), 'AURA FLOW');
});

test('case 15', { skip: 'folk status. probably never going to be solved.' }, () => {
  // TODO
});
