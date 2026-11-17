#!/usr/bin/env node
// play.js
//
// LAUNCH WEEK, in your terminal.
//
//   node play.js
//
// No dependencies. Node 18 or newer.

'use strict';

const readline = require('readline');
const { Game, CLEAR } = require('./engine');

const tty = process.stdout.isTTY;
const c = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const teal = c('38;2;126;224;200');
const red = c('38;2;255;107;107');
const violet = c('38;2;167;139;250');
const dim = c('2');

function paint(text) {
  if (text.includes(CLEAR)) {
    if (tty) process.stdout.write('\x1b[2J\x1b[H');
    text = text.split(CLEAR).join('');
  }
  return text.split('\n').map((line) => {
    if (/^\[(Monday|Tuesday|Wednesday|Thursday)/.test(line)) return dim(line);
    if (/^\[Buddy\]/.test(line)) return violet(line);
    if (/ERROR RATE|CONFLICT|ParseError|<<<<<<<|>>>>>>>/.test(line)) return red(line);
    if (/\[phone buzzes\]/.test(line)) return teal(line);
    return line;
  }).join('\n');
}

const game = new Game();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log(paint(game.start()));
rl.setPrompt('\n' + teal(game.prompt()));
rl.prompt();

rl.on('line', (line) => {
  const out = game.input(line);
  if (out) console.log(paint(out));
  rl.setPrompt('\n' + teal(game.prompt()));
  rl.prompt();
});

rl.on('close', () => {
  console.log('\nThe cursor keeps blinking. It always does.');
  process.exit(0);
});
