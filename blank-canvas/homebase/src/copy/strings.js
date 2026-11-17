// strings.js
//
// The words homebase says out loud.

'use strict';

module.exports = {
  appName: 'homebase',
  tagline: "Find every subscription. Kill the ones you don't want.",

  // Two Ls. It had one for three weeks. Nobody said anything.
  settingsTitle: 'Cancellation settings',

  // Bank descriptions lie constantly. Until we're sure, say it softly.
  possibleSubscription: 'possible subscription',

  cancelButton: 'Cancel',

  // Not "Download". (Nineteen minutes of a fifty-five minute call.)
  exportButton: 'Export',

  // Written in about ninety seconds, almost as a joke.
  cancelSuccess: (perYear) => `nice. that's $${perYear} a year you get to keep.`,
};
