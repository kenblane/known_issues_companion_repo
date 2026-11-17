# The `experiment-fast-cancel` merge

A branch made in a moment of admirable caution, lived in for eleven days, made better than the original in almost every way, and then quietly forgotten. Bringing it back was supposed to take four minutes.

```diff
<<<<<<< HEAD
 return subscription.cancel(fastPath: true)
=======
 return subscription.cancelWithConfirmation(steps: 4)
>>>>>>> experiment-fast-cancel
```

A conversation between two versions of the same developer, three weeks apart. One believed users needed protecting from themselves with confirmation dialogs. The other had watched her best friend tap four times to cancel one subscription.

Neither of them was in the room. Only the code was left, arguing on their behalf, in a font that could not convey tone.

**Resolution:** picked recent Mara. She always does. It feels, in a small way, like growth, and in another small way, like betrayal.

> **For non-developers:** a *branch* is a parallel copy of the code you can experiment on without touching the real one. A *merge conflict* is what happens when both copies changed the same lines differently, and the computer refuses to guess which one you meant.
