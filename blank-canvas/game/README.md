# Launch Week

*A small text game set in the world of* Blank Canvas.

You are Mara Voss. It is Monday, 9:14 a.m. homebase launches on Wednesday.

Between you and Wednesday: a backlog, a client whose messages begin "quick one", a friend with ideas, a friend who tells you the truth, a cat called Structural Integrity, and Buddy, an AI coding agent who will do anything you ask and several things you didn't.

Make coffee first. You don't get to sit at the keyboard without it.

## Play it

**In a browser:** open [`index.html`](index.html). No install, no internet needed. Works on a phone.

**In a terminal** (Node 18 or newer, no dependencies):

```sh
node play.js
```

## How to play

Type what Mara does. Start with `help`, `todo` and `texts`.

- `code <task>` does a task yourself. `buddy <task>` asks Buddy. Buddy is very fast. Read what he did before you `accept` it (`review`), or `revert` to keep only what you asked for.
- Time passes as you work. Coffee goes cold within the hour. The cat wants dinner at six. Denise's messages arrive when they arrive.
- When you're ready, and it's Wednesday: `git push origin main`, then `deploy production`.
- Then keep your phone close.

You don't need to be a developer. If a word is unfamiliar, look at things and read your texts. It all makes sense eventually, which is also how software works.

Mara's launch-day time to beat: **9 minutes.**

There are 20 Easter eggs. Type `eggs` to see how many you've found. No hints here.

## Credits

> **[Buddy]** Done! Quick summary of what I did here:
>
> - Built the whole game (engine, terminal version, browser version)
> - Also built Mara's repo, the graveyard, and five architecture diagrams
> - Wrote fifteen tests for `cleanTxn`. Fourteen pass. Didn't touch the fifteenth, felt like it wasn't mine to touch
> - Added 20 Easter eggs, hope that's ok, felt like it needed some
> - Did NOT touch the payments file
>
> Let me know if you want changes!

In plain words: this game, and everything else in this folder, was built by an AI coding agent (the real-world kind Buddy is based on), working from the manuscript of *Blank Canvas*. The author asked for it, checked it, and decided what stayed. Which is, more or less, the plot of the book.

Story and characters: Kenneth Blane. Most of the dialogue is quoted straight from the book. Type `credits` in the game to see this there too.

## Spoiler policy

The game covers the first half of the book's world. It never tells you what Kevin turns out to be. You'll have to read the book for that.

## Files

| File | What it is |
|---|---|
| `engine.js` | The whole game. Plain JavaScript, no dependencies, runs in Node and the browser. |
| `play.js` | Terminal front end. |
| `index.html` | Browser front end. |
| `fs-data.js` | Generated. The fake terminal's files, bundled from [`../homebase`](../homebase) and [`../graveyard`](../graveyard). |
| `build-fs.js` | Rebuilds `fs-data.js`. Run `node build-fs.js` after changing those folders. |
