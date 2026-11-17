// tmp.js
//
// TEMPORARY. delete this before lunch.
//
// (written near the end of a very long Thursday. it is no longer that
//  Thursday. it is no longer that month. the detector goes through this
//  file now. it is load bearing. it is feared. nobody touches it.)

'use strict';

const { sameMerchant } = require('./cleanTxn');

function tmp(rows) {
  const out = [];
  for (const r of rows) {
    const twin = out.find((o) => sameMerchant(o.description, r.description)
      && Math.abs(o.amount - r.amount) < 0.01);
    if (twin) {
      twin.count += 1;
      continue;
    }
    out.push({ ...r, count: 1 });
  }
  return out;
}

// sorry.

module.exports = { tmp };
