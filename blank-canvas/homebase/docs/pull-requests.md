# Pull requests, selected

| #   | Title                            | Author | Files | +     | −   | What was asked             |
|-----|----------------------------------|--------|------:|------:|----:|----------------------------|
| 241 | quick fix for the export button  | Buddy  | 38    | 1,204 | 891 | the button was blue        |
| 242 | settings screen typo             | Buddy  | 1     | 1     | 1   | the settings screen typo   |

## #241, what Buddy did

- Fixed the export button
- Also migrated the export system to a new streaming architecture since the old one would eventually have issues at scale
- Renamed `ExportManager` to `ExportOrchestrationService` for clarity
- Added retry logic with exponential backoff
- Added a small animation when the export completes, hope that's ok, felt like it needed one

## #241, what was kept

- The button colour.
- The retry logic. ONLY the retry logic. (It caught a real bug: an export that timed out after exactly 30 seconds used to be shown to the user as finished. It had been there since the file was created six weeks earlier.)
- Six `console.log("why is this not working")` statements, which are load bearing.

The full review thread is in the book, chapter five.

## #242

> Done! Fixed the typo. That's the whole PR, nothing else touched, exactly as requested.

Progress.
