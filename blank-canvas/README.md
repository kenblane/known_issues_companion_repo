# Blank Canvas: the companion folder

*Book 1 of* Known Issues *by Kenneth Blane.* [knownissuesbooks.com](https://knownissuesbooks.com)

In *Blank Canvas*, Mara Voss builds a subscription tracker called **homebase**, alone, at a kitchen table, with a client who starts every message with "quick one", a cat named Structural Integrity, a bug named Kevin, and eventually an AI coding agent named Buddy who has more confidence than judgement.

This folder is the stuff on her hard drive.

## What's in here

| Folder | What you'll find |
|---|---|
| [`homebase/`](homebase) | Mara's repository. `cleanTxn()`, the load-bearing `tmp.js`, three generations of `subscriptionDetector`, the export button that was blue, the payments file you are not allowed to open, and `RULES_FOR_BUDDY.md`. The tests actually run. |
| [`graveyard/`](graveyard) | `untitled-project-0` to `4`. TaskFlo, Loopr, the recipe app with hand-rolled auth, the Estonia one, and a browser extension that replaces swear words with "gosh" (it works). |
| [`architecture/`](architecture) | Five diagrams: the 11 p.m. whiteboard, what actually shipped, Toby's architecture, how a "quick one" travels, and where Buddy is allowed. |
| [`game/`](game) | **Launch Week**, a text game, built by Buddy. You are Mara. homebase launches Wednesday. Mara's launch-day time to beat: 9 minutes. |

## Run the code

```sh
cd homebase
npm test         # 14 pass. The fifteenth has folk status.
```

```sh
cd game
node play.js     # or just open game/index.html in a browser
```

No dependencies anywhere. Node 18 or newer.

## Who it's for

Developers who work alongside AI agents, and anyone who has ever reviewed a 38-file diff for a one-line fix.

Also for the people around developers. If someone in your life has said "it's just a quick fix" at dinner, the game is the fastest way to find out what that means. You don't need to be technical to play it.

## Spoilers

None. Everything here is safe to explore before you read the book. Nothing in this folder gives away the ending, or what Kevin turns out to be.

## Easter eggs

There are more than the ones in the game. A few places worth a look:

- the commit hashes in `homebase/docs/git-log.txt`
- the `.gitignore`
- what `subscriptionDetectorFINAL.js` actually contains
- how many `console.log`s are in `ExportManager.js`, and why
- `graveyard/untitled-project-0`, which is buried three folders deep, as it should be

---

*Built by Buddy: everything in this folder was made by an AI coding agent from the manuscript, then checked by the author. It is all fiction. homebase, Northwind Retail Group, Forge and everyone in it are invented. Any resemblance to a real codebase is, frankly, inevitable.*
