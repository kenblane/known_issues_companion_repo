// subscriptionDetector.js
//
// Written in week one by a person with values. A person who had read a
// style guide and believed in it.

'use strict';

const { tmp } = require('../tmp');
const { sameMerchant } = require('../cleanTxn');

const MIN_GAP_DAYS = 26;
const MAX_GAP_DAYS = 35;

function daysBetween(a, b) {
  return Math.round(Math.abs(new Date(b) - new Date(a)) / 86_400_000);
}

/**
 * Given a list of transactions ({ description, amount, date }), return
 * the ones that look like they're quietly coming back every month.
 */
function findSubscriptions(transactions) {
  const merchants = tmp(transactions);
  const found = [];

  for (const m of merchants) {
    if (m.count < 2) continue;

    const charges = transactions
      .filter((t) => Math.abs(t.amount - m.amount) < 0.01
        && sameMerchant(t.description, m.description))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // this part is kind of beautiful actually
    const monthly = charges.slice(1).every((c, i) => {
      const gap = daysBetween(charges[i].date, c.date);
      return gap >= MIN_GAP_DAYS && gap <= MAX_GAP_DAYS;
    });

    if (monthly) {
      found.push({
        merchant: m.description,
        amount: m.amount,
        perYear: Math.round(m.amount * 12),
        // Banks lie constantly. Until we've seen it three times, say it softly.
        label: charges.length >= 3 ? 'subscription' : 'possible subscription',
      });
    }
  }

  return found;
}

module.exports = { findSubscriptions, daysBetween };
