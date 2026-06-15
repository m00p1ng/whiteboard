# Navbar margin removal and zoom percentage display

## Goal

The active flowchart editor navbar should sit flush against the viewport edges with no margin, and the current zoom percentage should be visible between the zoom-out and zoom-in controls.

## Scope

Only the active flowchart editor is affected:

- `src/components/flowchart/TopBar.tsx` — navbar styling and zoom readout.
- `src/components/flowchart/TopBar.test.tsx` — update/add tests for the new behavior.

The unused whiteboard `src/components/TopBar.tsx` and `src/components/ZoomControls.tsx` are left unchanged.

## Design

### Navbar margin

- Change the navbar positioning from a floating bar (`absolute left-3 right-3 top-3 ... rounded-lg`) to an edge-to-edge bar (`absolute inset-x-0 top-0 ...`).
- Remove `rounded-lg` so the top corners are square and sit flush against the viewport.
- Preserve existing `z-20`, border, background, shadow, padding, and internal flex layout.

### Zoom percentage readout

- Insert a non-interactive label between the existing **Zoom out** and **Zoom in** buttons in the right-hand control group.
- Text: `{Math.round(viewport.scale * 100)}%`.
- Styling: small, `tabular-nums`, and a fixed minimum width (e.g., `min-w-12`) to prevent the button group from shifting as the value changes.
- Read the current scale from the existing `viewport` subscription via `useFlowchartStore`; no new state is required.

### Zoom behavior

- Keep the existing zoom step (`* 1.1` and `/ 1.1`) and scale bounds (`0.1` minimum, `4` maximum).
- The readout updates automatically because it derives from the same `viewport.scale` value used by the buttons.

## Tests

- Verify the percentage label renders with the initial scale value.
- Click **Zoom in** and assert the label updates to a higher percentage.
- Click **Zoom out** and assert the label updates to a lower percentage.
- Optionally assert that the navbar no longer carries the old margin/rounding classes.

## Edge cases

- Label width must accommodate the full scale range: `10%` to `400%`.
- The readout is not a button and should not trigger zoom when clicked.
