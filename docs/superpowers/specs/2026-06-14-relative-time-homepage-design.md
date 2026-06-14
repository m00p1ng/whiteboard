# Relative time on the home page

## Goal
Show each board’s last-updated timestamp on the home page as relative time (e.g., “2 minutes ago”) instead of the current absolute locale string.

## User decisions
- Hovering the relative time should reveal the full absolute timestamp as a tooltip.
- Implementation will use `date-fns` (`formatDistanceToNow`).

## Design

### Files changed
1. `package.json` — add `date-fns` dependency.
2. `src/hooks/useRelativeTime.ts` — new hook.
   - Accepts a timestamp (`number`).
   - Returns the current `formatDistanceToNow(timestamp, { addSuffix: true })` value.
   - Re-renders every 60 seconds so labels stay fresh while the page is open.
3. `src/pages/HomePage.tsx` — replace the existing absolute-time line.
   - Visible text: `Updated {relativeTime}`.
   - Native `title` attribute: absolute `new Date(board.updatedAt).toLocaleString()`.
4. `src/pages/HomePage.test.tsx` — update assertions to verify relative-time output.

### Data flow
```
board.updatedAt (number)
  -> useRelativeTime(updatedAt)
  -> "2 minutes ago"
  -> rendered in card
```

No store changes are required.

### Error handling / edge cases
- If `updatedAt` is missing/invalid, render the raw value or a fallback such as “Updated unknown” rather than crashing.
- `date-fns` handles past dates; no extra validation needed for valid timestamps.

### Testing
- Add unit tests for `useRelativeTime` using Vitest fake timers to assert:
  - Output includes the expected suffix/prefix (e.g., “ago”).
  - Output updates after the interval elapses.
- Update the existing `HomePage` test that checks ordering to confirm relative time is rendered in board cards.

## Open questions
None.
