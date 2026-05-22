---
title: 'feat: Add bloom and first-drip event markers to brew flow chart'
date: 2026-05-22
status: active
origin: docs/brainstorms/brew-event-markers-requirements.md
---

# feat: Add bloom and first-drip event markers to brew flow chart

## Problem Frame

`coffee_blooming_time` and `coffee_first_drip_time` are recorded in seconds on every brew, but the flow profile chart has no visual indication of when those events occurred. Users must mentally map numbers from the brew detail view onto a chart with no reference points.

## Goal

Render bloom and first-drip events directly on the Plotly flow chart — in the full brew-detail view, the live brewing view, and the brew-information card chart — with two display modes (vertical bar lines or transparent background regions), an on/off toggle, and user-configurable colors. (see origin: `docs/brainstorms/brew-event-markers-requirements.md`)

---

## Key Technical Decisions

**1. Shape-building logic lives in `GraphHelperService`, not per-component.**
Both `BrewBrewingGraphComponent` and `GraphDisplayCardComponent` use `GraphHelperService` for traces and layout. A new `getEventMarkerShapes(brew, settings)` method on the service centralises conversion of the seconds values into Plotly shape objects, making it testable in isolation and preventing duplicated logic.

**2. Saved-view shapes baked into initial layout; live-view shapes added via change-event `relayout` only.**
The existing `drawTargetWeight()` method was deliberately disabled because calling `Plotly.relayout()` on every chart tick caused mobile UI jank (documented comment at that line). For `isDetail` and `graph-display-card` (always static), shapes are passed in the layout given to `Plotly.newPlot()` — no `relayout` call needed. For the live brewing view, `relayout` is called only when a drip/bloom value changes (button tap or Bluetooth auto-detect), wrapped in `setTimeout` consistent with other layout mutations in the component.

**3. Marker colors extend `IGraphColors` using the mandatory four-variant structure.**
`resetGraphColor()` and the settings page colour reset buttons are typed to `keyof IGraphColors`. Extending the interface keeps the reset button working for free. Both new entries (`bloomMarker`, `firstDripMarker`) carry `active.light`, `active.dark`, `reference.light`, `reference.dark` — reference variants are set to the same defaults as active since marker shapes have no reference state.

**4. `GraphDisplayCard` receives the full `Brew` object, not two raw numbers.**
The component already receives `flowProfilePath: string`. Passing the full `Brew` object (optional, nullable) is more extensible and avoids a fragile "pass N numbers as separate inputs" interface if more event types are added later.

**5. Display mode stored as a typed string union on `Settings`, not a boolean.**
`'line' | 'region'` is more readable at call sites and easier to extend than a boolean. Stored as a plain string in the persisted JSON, backward-compatible with `Object.assign` migration.

---

## Scope Boundaries

### In scope

- `BrewBrewingGraphComponent` — full brew-detail view (`isDetail=true`) and live brewing view
- `GraphDisplayCardComponent` — brew-information card chart (static, read-only)
- Settings: on/off toggle, mode selector (bars / backgrounds), colour pickers for bloom and first-drip
- Bar mode: dashed vertical Plotly `type: 'line'` shape at each event time, full chart height, with text annotation label
- Background mode: transparent `type: 'rect'` shape from `x=0` to each event time
- Markers suppressed when the corresponding value is `0`
- Dark/light mode colour selection via `ThemeService.isDarkMode()` at render time

### Deferred to follow-up work

- Millisecond precision (`_milliseconds` fields remain unused)
- Markers on brew statistics, ratings, or any chart other than the flow profile
- Animated or interactive markers (hover tooltips, click-to-seek)

---

## High-Level Technical Design

_This illustrates the intended approach and is directional guidance for review, not implementation specification._

```
Settings model (U1)
  └─ brew_event_markers_enabled: boolean  (default: false)
  └─ brew_event_markers_mode: 'line' | 'region'  (default: 'line')
  └─ graph_colors.bloomMarker: IGraphColorSetting
  └─ graph_colors.firstDripMarker: IGraphColorSetting

GraphHelperService.getEventMarkerShapes(brew, settings) → Plotly.Shape[]  (U3)
  Reads:  brew.coffee_blooming_time, brew.coffee_first_drip_time  (seconds)
  Reads:  settings.brew_event_markers_enabled, .brew_event_markers_mode
  Reads:  settings.graph_colors.bloomMarker / .firstDripMarker  (+ isDarkMode)
  Converts seconds → Date via moment().startOf('day').add(seconds, 's').toDate()
  Returns [] when disabled or both values are 0

BrewBrewingGraphComponent (U4)
  isDetail path:
    initializeFlowChart()
      → layout = getChartLayout(...)
      → layout.shapes = getEventMarkerShapes(data, settings)
      → Plotly.newPlot(profileDiv, chartData, layout, config)

  live path (only when value changes):
    coffeeFirstDripTimeChanged() / setCoffeeDripTime()
    coffeeBloomingTimeChanged()  / setCoffeeBloomingTime()
      → setTimeout(() => {
           lastChartLayout.shapes = getEventMarkerShapes(data, settings)   // replaces all marker shapes
           Plotly.relayout(profileDiv, lastChartLayout)
         })

GraphDisplayCardComponent (U5)
  @Input() brew: Brew | null = null  (new, optional)
  initializeChart()
    → layout = graphHelper.getChartLayout(...)
    → if (brew) layout.shapes = graphHelper.getEventMarkerShapes(brew, settings)
    → Plotly.newPlot(profileDiv, chartData, layout, config)
```

X-coordinate format for vertical shapes:

- Trace x values are JS `Date` objects normalised to start-of-day via moment
- Conversion: `moment(new Date()).startOf('day').add(seconds, 'seconds').toDate()`
- Vertical bar shape: `{ type: 'line', x0: t, x1: t, y0: 0, y1: 1, xref: 'x', yref: 'paper' }`
- Background region: `{ type: 'rect', x0: 0, x1: t, y0: 0, y1: 1, xref: 'x', yref: 'paper', fillcolor: color, opacity: 0.18, line: { width: 0 } }`

---

## Implementation Units

### U1. Extend settings data model

**Goal:** Add the three new settings fields and two new graph colour entries, with backward-compatible migration guards.

**Requirements:** On/off toggle, mode selector, user-configurable colours (see origin).

**Dependencies:** None.

**Files:**

- `src/interfaces/settings/iSettings.ts` — add `brew_event_markers_enabled: boolean`, `brew_event_markers_mode: string`
- `src/classes/settings/settings.ts` — initialise both fields in constructor; add null-guards in `initializeByObject()` mirroring the `waterDispensed` block (lines 646–651)
- `src/interfaces/settings/iGraphColors.ts` — add `bloomMarker: IGraphColorSetting`, `firstDripMarker: IGraphColorSetting`
- `src/data/defaultGraphColors.ts` — add default colour objects for both new keys; bloom default `#C9A84C`, first-drip default `#0ABFCC`, both replicated across all four variants

**Approach:**

- `brew_event_markers_enabled` defaults to `false` so the feature is invisible until explicitly enabled
- `brew_event_markers_mode` defaults to `'line'`
- The migration guard for both colour keys must use the pattern `if (!this.graph_colors.bloomMarker) { this.graph_colors.bloomMarker = clone(DEFAULT_GRAPH_COLORS.bloomMarker) }` — without this, restoring an old backup crashes when code reads `.active.light` on `undefined`
- `reference.light` and `reference.dark` in both new colour entries are set to the same values as `active` (markers have no reference-profile counterpart)

**Patterns to follow:** Migration guards for `waterDispensed` at `src/classes/settings/settings.ts` lines 646–651. `IGraphColorSetting` structure in `src/interfaces/settings/iGraphColors.ts`.

**Test scenarios:**

- `Settings.initializeByObject()` with an object missing `brew_event_markers_enabled` produces `false` (backward compat)
- `Settings.initializeByObject()` with an object missing `graph_colors.bloomMarker` populates it from defaults without throwing
- `Settings.initializeByObject()` with an object that already has all fields preserves the stored values

**Verification:** TypeScript compiles without error; `ng test` passes; saving and reloading settings round-trips all five new fields correctly.

---

### U2. Settings UI — toggle, mode selector, and colour pickers

**Goal:** Give the user the controls described in the requirements: an on/off checkbox, a display-mode select, and colour pickers for bloom and first-drip (each with light and dark variants).

**Requirements:** Master toggle (default off), mode selector (bars / backgrounds), user-pickable colours (see origin).

**Dependencies:** U1.

**Files:**

- `src/app/settings/settings.page.html` — add new UI elements following the existing graph-settings section pattern
- `src/app/settings/settings.page.ts` — add `resetEventMarkerColor(key)` handler if a reset button is included

**Approach:**

- Place the new section inside the existing graph-settings `<ion-card>`, after the existing colour accordions
- Toggle: `<ion-checkbox label-placement="start" [(ngModel)]="settings.brew_event_markers_enabled" (ngModelChange)="saveSettings()">` — consistent with `show_roasting_section` pattern (not `ion-toggle`)
- Mode selector: `<ion-select [(ngModel)]="settings.brew_event_markers_mode" (ngModelChange)="saveSettings()">` with two `<ion-select-option>` items — consistent with `settings.startup_view` pattern
- Colour inputs: `<ion-input type="color" [(ngModel)]="settings.graph_colors.bloomMarker.active.light" (ionBlur)="saveSettings()">` — four inputs per event (active light, active dark, though reference variants can be omitted from UI since they have no visual function for markers)
- The colour section can live inside an `<ion-accordion>` titled "Brew Event Marker Colours" following the same accordion structure as existing trace colour sections
- The mode selector and colour pickers should only be visible (or enabled) when `brew_event_markers_enabled` is true — use `@if(settings.brew_event_markers_enabled)` wrapper

**Patterns to follow:** `settings.startup_view` ion-select pattern; `show_roasting_section` ion-checkbox pattern; `graph_colors.weight` colour accordion pattern — all in `src/app/settings/settings.page.html`.

**Test scenarios:**

- Toggle persists across settings save/reload
- Mode selector persists across settings save/reload
- Colour picker value persists across settings save/reload
- Mode selector and colour pickers are not shown when toggle is off

**Verification:** Settings page renders without console errors; all four settings survive a round-trip through `UISettingsStorage`.

---

### U3. `GraphHelperService.getEventMarkerShapes()` — shape builder

**Goal:** A single, testable method that converts brew drip/bloom seconds values and settings into a Plotly-compatible shapes array, supporting both bar-line and background-region modes.

**Requirements:** Bar mode (dashed vertical line + label per event), background mode (transparent rect from 0 to event time), suppress when value is 0 or feature is disabled (see origin).

**Dependencies:** U1.

**Files:**

- `src/services/graphHelper/graph-helper.service.ts` — add `getEventMarkerShapes(brew, settings)` method
- `src/services/graphHelper/__tests__/graph-helper.service.spec.ts` (create if absent, or add to existing spec)

**Approach:**

- Method signature: `getEventMarkerShapes(brew: Brew, settings: Settings): any[]`
- Returns `[]` immediately if `settings.brew_event_markers_enabled === false`
- For each event (bloom, first-drip): skip if value `<= 0`
- Convert seconds to chart x-coordinate: `moment(new Date()).startOf('day').add(value, 'seconds').toDate()`
- Select colour: `isDarkMode ? settings.graph_colors.bloomMarker.active.dark : settings.graph_colors.bloomMarker.active.light`
- In `'line'` mode: push a `{ type: 'line', x0: t, x1: t, y0: 0, y1: 1, xref: 'x', yref: 'paper', line: { color, width: 2, dash: 'dot' }, customId: 'bloomLine' }` shape, plus a Plotly annotation object for the label ("Bloom" / "First drip") anchored to the top of that x position
- In `'region'` mode: push a `{ type: 'rect', x0: startOfDay, x1: t, y0: 0, y1: 1, xref: 'x', yref: 'paper', fillcolor: color, opacity: 0.18, line: { width: 0 }, customId: 'bloomRegion' }` — no label in region mode
- `customId` is the app convention (not a Plotly property) used for idempotent shape lookup; follow the pattern from `drawTargetWeight()`
- The method returns an array (not mutating `lastChartLayout`) — callers decide how to merge it into their layout object

**Patterns to follow:** `drawTargetWeight()` shape structure in `src/components/brews/brew-brewing-graph/brew-brewing-graph.component.ts` (lines 939–986) for shape object shape and `customId` convention. `getColor()` helper for dark-mode colour selection.

**Test scenarios:**

- Returns `[]` when `brew_event_markers_enabled` is false regardless of brew values
- Returns `[]` when both `coffee_blooming_time` and `coffee_first_drip_time` are 0
- Returns one shape when only one value is non-zero
- Returns two shapes when both values are non-zero
- In `'line'` mode, each shape has `type: 'line'` and the x coordinate matches the expected Date value for the given seconds
- In `'region'` mode, each shape has `type: 'rect'` with `x0` at start-of-day and `x1` at the expected Date value
- Dark mode selects `.active.dark`, light mode selects `.active.light`
- Annotations are included alongside shapes in line mode; not included in region mode

**Verification:** All spec scenarios pass; TypeScript compiles cleanly.

---

### U4. `BrewBrewingGraphComponent` — integrate markers into detail and live views

**Goal:** Markers appear in the full brew-detail chart and the live brewing chart, with live updates on value change and no performance regression.

**Requirements:** Markers in both live and saved-brew contexts; live view updates when value is set (see origin).

**Dependencies:** U1, U3.

**Files:**

- `src/components/brews/brew-brewing-graph/brew-brewing-graph.component.ts`

**Approach:**

_Saved-brew / detail view (`isDetail = true`):_

- In `initializeFlowChart()`, after `lastChartLayout = getChartLayout(...)` and before `Plotly.newPlot(...)`, set `lastChartLayout.shapes = [...(lastChartLayout.shapes ?? []), ...this.graphHelper.getEventMarkerShapes(this.data, this.settings)]`
- This bakes markers into the initial layout — no subsequent `relayout` call needed for the static view

_Live brewing view:_

- Add a private `updateEventMarkers()` method that:
  1. Replaces any existing marker shapes in `lastChartLayout.shapes` (find by `customId` matching `bloomLine`/`firstDripLine`/`bloomRegion`/`firstDripRegion`, splice them out)
  2. Pushes fresh shapes from `getEventMarkerShapes()`
  3. Calls `Plotly.relayout(profileDiv.nativeElement, lastChartLayout)` inside `setTimeout()`
- Call `updateEventMarkers()` from: `coffeeFirstDripTimeChanged()`, the Bluetooth auto-detect path at the point where `coffee_first_drip_time` is set (line ~4026), and the equivalent bloom-time change handler
- Do NOT call from the per-tick `extendTraces` path — only on actual value changes
- If `brew_event_markers_enabled` is toggled off while the chart is open, shapes should be cleared: add a listener or call `updateEventMarkers()` when the settings change (the method returns `[]` when disabled, which clears existing shapes)

**Patterns to follow:** `toggleChartLines()` for the `Plotly.relayout()` call pattern; `drawTargetWeight()` for `customId`-based shape array management; `setTimeout()` wrapping at line ~1339 for deferred layout updates.

**Test scenarios:**

- When `isDetail=true` and both values are non-zero and markers enabled, the chart layout passed to `Plotly.newPlot` contains the expected shapes
- When `isDetail=true` and a value is 0, only one shape is present (or none if both are 0)
- When markers are disabled, no shapes are added to the layout even if values are non-zero
- Live view: after `coffeeFirstDripTimeChanged()` fires, `lastChartLayout.shapes` contains a first-drip marker
- Live view: calling update a second time does not accumulate duplicate shapes (idempotent via `customId` splice)

**Verification:** Both saved-brew and live-brew chart views show markers when enabled; no visible UI jank on mobile during active brewing; existing chip toggle buttons remain responsive during a live brew session.

---

### U5. `GraphDisplayCardComponent` — markers in brew-information card chart

**Goal:** Brew-information card charts show event markers when the feature is enabled, using the same shape-builder as the other chart contexts.

**Requirements:** Markers on the saved/historical flow profile view (see origin — extended to include card view per user decision).

**Dependencies:** U1, U3.

**Files:**

- `src/components/graph-display-card/graph-display-card.component.ts` — add `@Input() brew: Brew | null = null`; integrate shapes into `Plotly.newPlot` layout
- `src/components/graph-display-card/graph-display-card.component.html` — no change expected
- `src/components/brew-information/brew-information.component.html` — pass `[brew]="brew"` to `<graph-display-card>`
- `src/components/brew-information/brew-information.component.ts` — verify `brew` is available as a property (it almost certainly is, since the component already reads `brew.coffee_first_drip_time` for its text display)

**Approach:**

- Add `@Input() public brew: Brew | null = null` to `GraphDisplayCardComponent` (optional — existing callers that omit it get no markers, no crash)
- After `lastChartLayout = graphHelper.getChartLayout(...)` and before `Plotly.newPlot(...)`, conditionally add: `if (this.brew) { lastChartLayout.shapes = [...(lastChartLayout.shapes ?? []), ...this.graphHelper.getEventMarkerShapes(this.brew, this.settings)] }`
- `GraphDisplayCard` uses `staticPlot: true` — no user interaction, no `relayout` ever needed; baking into `newPlot` is sufficient
- In `brew-information.component.html`, update the `<graph-display-card>` element to add `[brew]="brew"`

**Patterns to follow:** Same shape-baking approach as U4's `isDetail` path. Existing `@Input() staticChart`, `chartWidth`, `chartHeight` inputs for reference on input declaration style.

**Test scenarios:**

- `GraphDisplayCardComponent` with `brew=null` renders without error and shows no marker shapes
- `GraphDisplayCardComponent` with a brew where both values are non-zero and markers enabled passes shapes to the layout
- `GraphDisplayCardComponent` with markers disabled passes no shapes regardless of brew values
- `brew-information` template compiles and passes the brew through correctly

**Verification:** Brew-information card view shows markers when enabled; existing callers of `graph-display-card` that do not pass `[brew]` continue to work without changes.

---

## Deferred Implementation Notes

- **Annotations positioning in bar mode**: Plotly annotation objects (for "Bloom" / "First drip" labels) need to be added to `lastChartLayout.annotations` alongside `lastChartLayout.shapes`. The exact anchor (`ax`, `ay`, `xanchor`, `yanchor`) values should be determined empirically once the chart renders — the plan leaves those as implementation-time decisions.
- **`reference.light/.dark` colour inputs in settings UI**: Since reference colours for markers have no visual function, they can be omitted from the settings UI entirely and only kept in the data model for structural compatibility with `IGraphColors`. Implementation should decide based on UI crowding.
- **Orientation change**: `onOrientationChange()` calls `Plotly.relayout()` with `lastChartLayout`. If shapes are already in `lastChartLayout.shapes`, they will persist through orientation change with no extra work needed.

---

## System-Wide Impact

| Surface                               | Change                                                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Settings` model                      | 2 new scalar fields + 2 new colour entries in `graph_colors`                                                         |
| `IGraphColors` / `defaultGraphColors` | 2 new keys; all existing keys unaffected                                                                             |
| `GraphHelperService`                  | 1 new public method; existing methods unchanged                                                                      |
| `BrewBrewingGraphComponent`           | New private method; `initializeFlowChart()` gets 1 extra layout mutation; 2–3 change-event handlers get 1 extra call |
| `GraphDisplayCardComponent`           | 1 new optional `@Input()`; `initializeChart()` gets 1 conditional layout mutation                                    |
| `brew-information` template           | 1 new attribute on existing element                                                                                  |
| Settings page HTML                    | New accordion section with ~10 lines of template                                                                     |

No database schema changes. No new npm dependencies. No changes to how `coffee_first_drip_time` or `coffee_blooming_time` are recorded.
