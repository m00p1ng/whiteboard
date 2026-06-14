# Dark Theme Design

## Goal

Add a complete light/dark appearance preference to the whiteboard application. The initial theme follows the operating system when the user has not chosen a preference. A manual choice persists across sessions and overrides later system changes.

The dark appearance covers both the board list and the full editor, including the drawing surface. Existing shape colors remain unchanged. The editor top bar also hides undo and redo controls when their corresponding histories are empty.

## Theme Architecture

Introduce a small React theme context with:

- `theme`, whose value is `light` or `dark`
- `setTheme`, which applies and persists a manual preference
- initialization from a dedicated `localStorage` key
- fallback to `window.matchMedia('(prefers-color-scheme: dark)')` when no stored preference exists

The provider applies a `dark` class to `document.documentElement`. CSS custom properties define semantic light and dark values for backgrounds, foregrounds, cards, popovers, borders, inputs, muted surfaces, accents, and destructive actions.

System preference changes update the active theme only while no manual preference is stored. Once the user selects a theme, the saved choice remains authoritative.

The provider wraps the application at its root so both the home page and board editor share one preference. Most components use semantic Tailwind classes and do not read the context directly. Components that draw pixels outside normal CSS, such as the minimap canvas, read the active theme to choose appropriate colors.

## Theme Controls

Add a reusable theme menu control represented by an overflow icon button.

On the home page, place the control beside the New board button. In the editor, place it at the right side of the top bar with the other actions.

Activating the button opens a compact menu with Light and Dark choices. The active choice has a visible selected indicator and appropriate accessible state. Selecting a choice applies it immediately, persists it, and closes the menu. Clicking outside the menu or pressing Escape closes it without changing the preference.

The control uses no new third-party menu dependency. It is a focused component with keyboard-operable buttons, accessible labels, and document-level dismissal handling.

## Visual Treatment

The dark palette uses a full dark board:

- page and canvas backgrounds use a deep neutral surface
- top bar, toolbars, panels, cards, menus, inputs, and overlays use layered dark semantic surfaces
- foreground, muted text, borders, hover states, and disabled states use accessible dark-theme values
- the minimap uses explicit dark background and shape colors while retaining the blue viewport outline
- text editing overlays use theme surfaces, while the text itself continues to use each shape's configured color

Hard-coded layout colors in the home page, board page, canvas wrapper, context menu, and editing overlays are replaced with semantic classes where they describe interface chrome.

Shape defaults and saved shape colors are data, not theme chrome. They do not change when the theme changes. Selection blue and creation-preview blue also remain stable because they are interaction indicators that work in both palettes.

## Undo And Redo Visibility

The editor top bar derives action availability from the existing `undoStack` and `redoStack`.

- Undo is rendered only when `undoStack.length > 0`.
- Redo is rendered only when `redoStack.length > 0`.

After an edit, Undo appears. After undoing the final available command, Undo disappears and Redo appears. Performing a new command clears redo history, so Redo disappears through the existing store behavior. Keyboard shortcuts continue to work regardless of whether the buttons are visible.

Delete retains its existing selection-based disabled behavior.

## Error And Environment Handling

Access to `localStorage` is guarded so storage failures do not prevent rendering or switching themes for the current session.

If `matchMedia` is unavailable, the initial fallback is light. Event listeners for system preference and outside-menu interactions are removed during cleanup.

Theme initialization happens before normal interaction. The document class and React state remain synchronized so CSS surfaces and canvas-rendered theme colors change together.

## Testing

Add focused tests for:

- first load using the system preference when storage is empty
- stored preference overriding the system preference
- selecting Light or Dark updating the document class and persistence
- system preference changes affecting only users without a manual preference
- graceful behavior when storage or `matchMedia` is unavailable
- overflow menu opening, selection, Escape dismissal, and outside-click dismissal
- the home page and editor exposing the shared theme control
- minimap colors changing with the active theme
- Undo and Redo being absent with empty histories and appearing only when their respective stacks contain commands

Run the full test suite, lint, and production build. After automated verification, inspect the home page and editor in both themes in the local browser to confirm full-surface coverage and menu placement.

## Out Of Scope

- Per-board theme preferences
- Additional themes or custom palette selection
- Changing saved shape colors based on the active theme
- Synchronizing theme preference across devices
- Replacing the existing command-history implementation
