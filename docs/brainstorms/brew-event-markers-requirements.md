# Brew Event Markers on Flow Chart

**Date:** 2026-05-22
**Status:** Ready for planning

---

## Problem

`coffee_first_drip_time` and `coffee_blooming_time` are recorded in seconds on every brew, but the flow profile chart gives no visual indication of when those events occurred. Users must mentally correlate a number from the brew detail view against a chart with no reference points.

## Goal

Make bloom and first-drip events immediately visible on the flow profile chart, both during an active brew session and when reviewing a saved brew.

---

## Scope

### In scope

- Visual markers for `coffee_blooming_time` and `coffee_first_drip_time` on the Plotly flow chart in:
  - `brew-brewing-graph` (live brewing view)
  - The saved/historical flow profile view (same component, post-brew context)
- Two display modes the user chooses between in settings:
  - **Bar mode** — a vertical dashed line at each event time
  - **Background mode** — a transparent filled region from brew start to each event time
- A master on/off toggle for the feature in settings
- User-pickable colors for each event (bloom color, first-drip color), separately for each mode if desired, defaulting to the project palette
- Markers only render when the corresponding value is > 0; if only one event was recorded, only that marker appears

### Out of scope

- Millisecond precision (the `_milliseconds` fields remain unused; markers use the seconds value only)
- Markers on charts other than the flow profile (brew statistics, ratings charts, etc.)
- Animated or interactive markers (hover tooltips, click-to-seek)
- Changing how the values are recorded or detected

---

## Behavior

### Bar mode

- A vertical line rendered at `x = coffee_blooming_time` seconds, spanning the full chart height
- A second vertical line at `x = coffee_first_drip_time` seconds
- Lines are dashed or semi-transparent to avoid obscuring the flow/pressure/weight traces
- Each line is independently colored (user-configurable)
- A small label ("Bloom", "First drip") appears near the top of each line

### Background region mode

- A filled rectangle from `x = 0` to `x = coffee_blooming_time`, rendered behind all traces
- A second filled rectangle from `x = 0` to `x = coffee_first_drip_time`
- Because bloom always ends before first drip, the bloom rectangle is fully contained inside the first-drip rectangle; the overlapping zone blends both colors additively — this is acceptable since both regions use low opacity (~15–20%)
- No labels needed (the regions speak for themselves once the user knows the feature exists)

### Live brewing view

- As soon as a value becomes non-zero (user taps the bloom or drip button, or the Bluetooth scale auto-detects first drip), the corresponding marker is drawn
- If the value changes (e.g., corrected mid-brew), the marker updates

### Settings

| Setting                 | Type                              | Default                            |
| ----------------------- | --------------------------------- | ---------------------------------- |
| Show brew event markers | Toggle (on/off)                   | Off                                |
| Display style           | Single select: Bars / Backgrounds | Bars                               |
| Bloom color             | Color picker                      | Warm amber `#C9A84C` @ 20% opacity |
| First drip color        | Color picker                      | Muted cyan `#0ABFCC` @ 20% opacity |

- Colors are stored alongside the existing `graph_colors` structure in `Settings`
- Colors apply to both bar and background modes (the opacity is baked into the stored color or applied at render time)
- The settings UI follows the existing chip/toggle pattern in the brew graph settings panel

---

## Default Colors

Chosen from the existing palette (`src/data/defaultGraphColors.ts`, `src/theme/variables.scss`) to harmonize with the warm brown primary theme and avoid clashing with existing traces (weight `#cdc2ac`, pressure `#05C793`, temperature `#CC3311`, realtime flow `#09485D`):

- **Bloom:** warm amber `rgba(201, 168, 76, 0.18)` — coffee/honey tone, distinct from all existing traces
- **First drip:** muted cyan `rgba(10, 191, 204, 0.18)` — close to the secondary (`#0cd1e8`) but softer

Both values are defaults; the user can override via color picker.

---

## Key Files

- Chart component: `src/components/brews/brew-brewing-graph/brew-brewing-graph.component.ts`
- Graph helper (traces & layout): `src/services/graphHelper/graph-helper.service.ts`
- Default graph colors: `src/data/defaultGraphColors.ts`
- Settings class: `src/classes/settings/settings.ts`
- Manage brew parameter: `src/classes/parameter/manageBrewParameter.ts`
- Existing shape pattern (reference): `drawTargetWeight()` method in the brew-brewing-graph component

---

## Success Criteria

- A user reviewing a saved brew with both values set can immediately see where in the flow profile the bloom ended and the first drip occurred, without reading any numbers
- The markers are visually distinct but do not make traces harder to read at any zoom level
- The feature can be fully disabled with one toggle and defaults to off (no surprise for users who haven't recorded these events)
- Colors can be changed and persist across sessions
