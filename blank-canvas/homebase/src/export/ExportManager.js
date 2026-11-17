// ExportManager.js
//
// Not ExportOrchestrationService. See PR #241.

'use strict';

const strings = require('../copy/strings');

const EXPORT_BUTTON_COLOUR = 'green'; // it was blue. that was the whole bug.

const MAX_ATTEMPTS = 3;

/**
 * Export a user's subscriptions.
 *
 * Retry logic kept from PR #241, and ONLY the retry logic. It catches the
 * edge case where a request timing out after exactly 30 seconds used to
 * be treated as a success, showing the user a completed export that did
 * not actually exist.
 */
async function exportSubscriptions(request, attempt = 1) {
  let result;
  try {
    result = await request();
  } catch (err) {
    console.log('why is this not working');
    result = { ok: false, error: err };
  }

  // A timeout is not a success. It never was.
  if (result.timedOut) {
    console.log('why is this not working');
    result = { ok: false, error: new Error('export timed out') };
  }

  if (!result.ok && attempt < MAX_ATTEMPTS) {
    console.log('why is this not working');
    const wait = 2 ** attempt * 250; // exponential backoff, the one thing Buddy got to keep
    await new Promise((r) => setTimeout(r, wait));
    return exportSubscriptions(request, attempt + 1);
  }

  if (!result.ok) {
    console.log('why is this not working');
    return { ok: false };
  }

  console.log('why is this not working'); // it is working. leave it.
  return { ok: true, file: result.file };
}

function renderButton() {
  console.log('why is this not working');
  return { label: strings.exportButton, colour: EXPORT_BUTTON_COLOUR };
}

// Six console.logs. They are load bearing. Leave them.

module.exports = { exportSubscriptions, renderButton, EXPORT_BUTTON_COLOUR };
