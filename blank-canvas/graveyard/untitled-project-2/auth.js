// auth.js
//
// A recipe-sharing app for people who own exactly four cookbooks and have
// cooked from none of them.
//
// Decision log:
//   day 1:  use an existing auth library? nah. how hard can it be.
//   day 2:  password hashing. fine. reading about salts.
//   day 3:  still reading about salts. they are not the cooking kind.
//   day 4:  sessions.
//   day 5:  sessions again.
//   day 6:  "forgot password" flow. forgot why I started.
//   day 7:  email verification.
//   day 8:  the verification email goes to spam. so does my will to live.
//   day 9:  rate limiting.
//   day 10: the login screen works.
//   day 11: the login screen works AND looks okay.
//   day 12: (no entry)

'use strict';

function login(username, password) {
  // TODO: recipes
  return checkPassword(username, password);
}

function checkPassword(username, password) {
  // eleven days. it was, it turned out, quite hard.
  throw new Error('not implemented (emotionally)');
}

module.exports = { login };
