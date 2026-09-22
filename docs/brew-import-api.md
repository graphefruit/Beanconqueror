# Brew import API

Beanconqueror can receive a finished brew from another app through the
`beanconqueror://ADD_BREW` deep link. The receiver treats that link as
untrusted input. The decoder validates and bounds the payload before the import
service builds a `Brew`.

The implementation is split across these files:

- `src/services/intentHandler/intent-handler.service.ts` routes the
  `ADD_BREW` intent.
- `src/services/intentHandler/brew-handoff.decoder.ts` defines the wire
  interfaces and validates the payload.
- `src/services/brewImport/brew-import.service.ts` maps the decoded envelope to
  Beanconqueror data.
- `src/services/brewImport/brew-import-provenance.ts` resolves the `imported`
  block into the brand shown on the chip, and the brew information template
  renders it.

## Transport

Senders open this intent:

```text
beanconqueror://ADD_BREW?len=<payload-length>&shareBrew0=<chunk>&shareBrew1=<chunk>...
```

`intent-handler.service.ts` recognises the intent by checking that the URL,
lowercased for comparison, starts with `beanconqueror://ADD_BREW`. The payload
arrives in numbered `shareBrew` query parameters. The comment on the import
route says this mirrors the existing bean share because a single parameter long
enough to hold a whole brew is truncated by the OS. The existing bean share in
`src/services/shareService/share-service.service.ts` uses 400 character chunks,
and the decoder tests use the same chunk width. The brew decoder accepts at
most 400 characters in any one chunk.

The receiver reassembles like this:

1. Read `len`. It must be decimal digits and fit in a safe JavaScript integer.
2. Collect keys matching `shareBrew<integer>`.
3. Require at least one chunk, at most 1,024 chunks, and a complete zero based
   sequence with no duplicate or missing index.
4. Require every `shareBrewN` value to be at most 400 characters, then
   concatenate `shareBrew0`, `shareBrew1`, and so on.
5. Require the concatenated payload length to equal `len`.

The codec is JSON, compressed with `gzip`, encoded as unpadded `base64url`.
The decoder accepts only `A` to `Z`, `a` to `z`, `0` to `9`, `_`, and `-`, and
rejects payload lengths whose remainder modulo 4 is 1. It decodes with
`atob`, inflates with `new DecompressionStream('gzip')` when available and
falls back to zip.js inflation on older WebKit, decodes text with fatal UTF 8
decoding, then parses JSON.

Deep links are gated on `uiHelper.isBeanconqurorAppReady()`. In
`src/app/app.component.ts`, app readiness is set only after `__initApp()` has
finished. `__initApp()` can show and wait for first run modals such as the
welcome and analytics dialogs. On a fresh install, open Beanconqueror and finish
onboarding once before testing a handoff. Otherwise the first handoff can appear
to do nothing while the handler is still waiting for app readiness.

## Envelope

The wire contract is the `IHandoffEnvelope` family in
`brew-handoff.decoder.ts`. Unknown top level fields are ignored because the
validator constructs a new object containing only the recognised fields.

### Top level

| Field      | Type        | Required | Unit | Decoder rule                                                                                                                              |
| ---------- | ----------- | -------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `v`        | number      | yes      |      | Must be exactly `1`.                                                                                                                      |
| `app`      | object      | yes      |      | Must validate as the app block.                                                                                                           |
| `brew`     | object      | yes      |      | Must validate as the brew block.                                                                                                          |
| `bean`     | object      | no       |      | Must be an object when present. Sanitised as opaque JSON inside that object.                                                               |
| `flow`     | object      | no       |      | Must validate as the flow block.                                                                                                          |
| `metrics`  | array       | no       |      | At most 100 metric blocks.                                                                                                                |
| `imported` | object      | yes      |      | Must validate as the provenance block.                                                                                                    |

### `app`

| Field     | Type   | Required | Unit | Decoder rule                                                                    |
| --------- | ------ | -------- | ---- | ------------------------------------------------------------------------------- |
| `name`    | string | yes      |      | Non empty, at most 512 characters.                                              |
| `version` | string | no       |      | Empty string is treated as absent. Non empty values are at most 512 characters. |

The import service does not store `app`. Use `imported` for user visible
provenance.

### `brew`

| Field               | Type     | Required | Unit               | Decoder rule                                                                        |
| ------------------- | -------- | -------- | ------------------ | ----------------------------------------------------------------------------------- |
| `date`              | string   | yes      | ISO 8601 timestamp | Must match the decoder's ISO 8601 pattern, name a real calendar date, and parse to a finite date. |
| `doseIn`            | quantity | no       | `g`                | Value must be finite and between 0 and 200. Unit must be `g`.                       |
| `waterIn`           | quantity | yes      | `ml`               | Value must be finite and between 0 and 100,000. Unit must be `ml`.                  |
| `beverageOut`       | quantity | yes      | `g`                | Value must be finite and between 0 and 100,000. Unit must be `g`.                   |
| `brewTime`          | number   | yes      | seconds            | Finite, 0 to 86,400. Fractions are allowed.                                         |
| `temperature`       | number   | no       | degrees Celsius    | Finite, -50 to 250. Schema v1 is a bare Celsius number.                             |
| `ratio`             | number   | no       |                    | Finite and non negative.                                                            |
| `grindSize`         | string   | no       | sender defined     | Empty string is treated as absent. Non empty values are at most 512 characters.     |
| `grinderRpm`        | number   | no       | rpm                | Finite and non negative.                                                            |
| `grinderName`       | string   | no       |                    | Empty string is treated as absent. Non empty values are at most 512 characters.     |
| `preparationMethod` | string   | yes      |                    | Non empty, at most 512 characters.                                                  |
| `bloomTime`         | number   | no       | seconds            | Finite, 0 to 86,400. Fractions are allowed.                                         |
| `firstDripTime`     | number   | no       | seconds            | Finite, 0 to 86,400. Fractions are allowed.                                         |
| `rating`            | number   | no       | stars              | Whole number, 0 to 10, on the sending app's own scale. Omit it for an unrated brew. |
| `note`              | string   | no       |                    | Defaults to `""`. At most 10,000 characters.                                        |

Quantity objects have this shape:

```json
{ "value": 18, "unit": "g" }
```

### `flow`

| Field            | Type     | Required | Unit                                | Decoder rule                                                                                                                |
| ---------------- | -------- | -------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `fidelity`       | string   | yes      |                                     | Must be `full` or `downsampled`.                                                                                            |
| `t`              | number[] | yes      | milliseconds                        | Delta coded time since the previous sample. Each entry must be finite and between 0 and 86,400,000. At most 10,000 entries. |
| `waterDispensed` | number[] | yes      | decigrams since the previous sample | Must have the same length as `t`. Each entry must be finite. The importer divides by 10 and accumulates grams. The running total must stay within 100,000 g.              |
| `weight`         | number[] | yes      | decigrams since the previous sample | Must have the same length as `t`. Each entry must be finite. The importer divides by 10 and accumulates grams. The running total must stay within 100,000 g.              |
| `temperature`    | number[] | no       | degrees Celsius                     | Must have the same length as `t` when present. Each entry must be finite. Values are absolute per sample.                   |

`flow.t` is delta coded on the wire. The import service accumulates it into an
absolute millisecond timestamp, then formats Beanconqueror flow timestamps as
`HH:mm:ss.SSS` and brew times as seconds with three decimals.

### `metrics[]`

| Field  | Type     | Required | Unit                                   | Decoder rule                                                                    |
| ------ | -------- | -------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| `key`  | string   | yes      |                                        | Non empty, at most 512 characters. Used as the custom metric key.               |
| `name` | string   | yes      |                                        | Non empty, at most 512 characters. Rendered as sender supplied text.            |
| `unit` | string   | yes      | sender defined                         | May be empty. At most 512 characters.                                           |
| `kind` | string   | yes      |                                        | Must be `measured` or `target`.                                                 |
| `t`    | number[] | yes      | absolute milliseconds since brew start | Each entry must be finite and between 0 and 86,400,000. At most 10,000 entries. |
| `v`    | number[] | yes      | the unit named by `unit`               | Must have the same length as `t`. Each entry must be finite.                    |

### `imported`

| Field        | Type        | Required | Unit | Decoder rule                                                                                                                              |
| ------------ | ----------- | -------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `source`     | string      | yes      |      | Non empty, at most 512 characters. Stored verbatim in `brew.customInformation.imported`; not used for lookup.                              |
| `sourceName` | string      | yes      |      | Non empty, at most 512 characters. Sender supplied display name.                                                                          |
| `sourceUrl`  | string      | no       | URL  | 1 to 2,048 characters, must parse as a URL, must use `https:`, stored as the normalised `URL.href`.                                       |
| `device`     | string      | no       |      | Empty string is treated as absent. Non empty values are at most 512 characters.                                                           |
| `schema`     | integer     | yes      |      | Integer from 1 to 1,000. This is the sender schema, not the envelope version.                                                             |
| `params`     | object      | no       |      | Must be an object when present. Sanitised as opaque JSON inside that object.                                                              |

`bean`, `imported.params`, and any nested opaque values accepted there are
copied through a sanitiser. Objects are rebuilt with a null prototype, keys
named `__proto__`, `constructor`, and `prototype` are dropped, nesting is capped
at depth 8, arrays and objects are capped at 1,000 entries, string values are
capped at 10,000 characters, and object keys are capped at 512 characters.

## Mapping to Beanconqueror

`BrewImportService.build()` creates a new `Brew` and a new `BrewFlow`.

| Envelope field           | Beanconqueror destination                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `brew.doseIn.value`      | `brew.grind_weight`. Missing dose becomes `0`.                                                            |
| `brew.waterIn.value`     | `brew.brew_quantity` with `brew_quantity_type = "ML"`.                                                    |
| `brew.beverageOut.value` | `brew.brew_beverage_quantity` with `brew_beverage_quantity_type = "GR"`.                                  |
| `brew.brewTime`          | Split into `brew_time` seconds and `brew_time_milliseconds`.                                              |
| `brew.temperature`       | `brew.brew_temperature`. Missing temperature becomes `0`.                                                 |
| `brew.grindSize`         | `brew.grind_size`. Missing value becomes `""`.                                                            |
| `brew.grinderRpm`        | `brew.mill_speed`. Missing value becomes `0`.                                                             |
| `brew.firstDripTime`     | Split into `coffee_first_drip_time` and `coffee_first_drip_time_milliseconds`. Missing value becomes `0`. |
| `brew.bloomTime`         | Split into `coffee_blooming_time` and `coffee_blooming_time_milliseconds`. Missing value becomes `0`.     |
| `brew.date`              | Validated as a real ISO 8601 calendar date, parsed with `Date.parse`, divided by 1,000, floored, and stored in `brew.config.unix_timestamp`. |
| `imported`               | Stored in `brew.customInformation.imported`.                                                              |
| `brew.rating`            | Clamped to the user's configured rating scale, never rescaled. Missing value becomes `0`.                 |
| `brew.note`              | Starts `brew.note`. Name matching notes are appended after blank lines.                                   |
| `bean.name`              | Used only as a lookup hint. Other bean fields are not mapped.                                             |
| `brew.ratio`             | Validated but not stored by the importer. Beanconqueror derives displayed ratios from quantities.         |
| `app`                    | Validated but not stored.                                                                                 |

Flow samples are reconstructed by accumulating `flow.t`,
`flow.waterDispensed`, and `flow.weight`. Water and weight are divided by 10
before accumulation, so wire decigrams become grams in the stored `BrewFlow`.
Temperature samples are copied as absolute temperatures. The importer also
fills the previous value fields used by Beanconqueror graphs.

Metrics become Beanconqueror custom graph traces. For each metric:

- `brewFlow.customMetrics[metric.key]` receives `{ value, timestamp, brew_time }`
  entries.
- `brewFlow.customAxes` receives an axis with the sender's `name` and `unit`.
- `kind: "target"` maps to the i18n key `BREW_IMPORT_METRIC_TARGET`.
- `kind: "measured"` maps to `BREW_IMPORT_METRIC_MEASURED`.
- The axis colour comes from `settings.graph_colors.customTrace.active`.

If the resulting `BrewFlow` has flow samples or metrics, `import()` writes it to
the brew graph path and sets `brew.flow_profile`. If writing that file fails,
the import still succeeds, but `flow_profile` stays empty.

### Name matching

Bean, grinder, and preparation hints are matched by name after Unicode NFC
normalisation, trimming, and locale lowercasing. The importer never creates a
bean, grinder, or preparation from an incoming link.

When an exact match fails, one widening step is tried: a stored entry whose
name and the hint are the same equipment named at different lengths, in either
direction. A sending app usually knows its maker and not its model, and a user
usually types the model, so a machine calling itself `xBloom` never found a
mill entered as `xBloom Studio`, and neither name was wrong.

The shorter name must be a whole leading word of the longer one: the longer
name has to carry on with a separator (whitespace, `-`, `_`, or `/`) rather
than with more of the same word, so `Ode` does not reach `Odessa`. The widened
match must also be unique. A user with both an `xBloom Studio` and an `xBloom
Original` is saying the distinction matters, so a hint that cannot choose
between them falls through rather than guessing. A widened match appends a note
naming both, for example
`Grinder linked to "xBloom Studio" from "xBloom".`

Bean and preparation use `findUniqueOrDefault()`:

- One match links that stored entry.
- No name, no match, or multiple matches falls back to the first unfinished
  stored entry sorted by name.
- A note is appended, for example
  `Bean not linked: "Unknown coffee" (no match). Using "Alpha coffee".`
- If there is no usable fallback entry, the importer throws
  `<Label> not linked: no available <Label>.` In practice a sender does not
  reach that throw, because the route refuses an empty library first. See
  "Limits and failure modes".

Grinder uses `findUniqueByName()`:

- One match links that grinder.
- No name leaves `brew.mill` empty.
- No match or multiple matches leaves `brew.mill` empty and appends a note.

## Worked example

The following envelope was encoded with `CompressionStream('gzip')`,
base64url encoded without padding, assembled with 400 character chunks, then
decoded again with `collectHandoffPayload()` and `decodeHandoffPayload()` from
this branch. The decoded envelope matched the original.

```json
{
  "v": 1,
  "app": {
    "name": "Example Brewer",
    "version": "1.4.0"
  },
  "brew": {
    "date": "2026-09-20T12:34:56.000Z",
    "doseIn": {
      "value": 18,
      "unit": "g"
    },
    "waterIn": {
      "value": 300,
      "unit": "ml"
    },
    "beverageOut": {
      "value": 242.5,
      "unit": "g"
    },
    "brewTime": 212.75,
    "temperature": 93,
    "ratio": 16.7,
    "grindSize": "7.2",
    "grinderRpm": 60,
    "grinderName": "Example Grinder",
    "preparationMethod": "Example Dripper",
    "bloomTime": 35.5,
    "firstDripTime": 12.25,
    "rating": 4,
    "note": "Balanced sweetness with a light citrus finish."
  },
  "bean": {
    "name": "Example Coffee"
  },
  "flow": {
    "fidelity": "full",
    "t": [0, 1000, 1000, 1000, 1000],
    "waterDispensed": [0, 450, 550, 650, 1350],
    "weight": [0, 0, 120, 460, 1845],
    "temperature": [92, 93, 93, 92, 92]
  },
  "metrics": [
    {
      "key": "targetTemperature",
      "name": "Target temperature",
      "unit": "°C",
      "kind": "target",
      "t": [0, 212750],
      "v": [93, 93]
    }
  ],
  "imported": {
    "source": "example-brewer",
    "sourceName": "Example Brewer",
    "sourceUrl": "https://example.com/brews/42",
    "device": "Example Brewer Mk I",
    "schema": 1,
    "params": {
      "brewId": "42"
    }
  }
}
```

Generated link, truncated in the middle:

```text
beanconqueror://ADD_BREW?len=708&shareBrew0=H4sIAAAAAAAAE3VTwY6bMBD9FeQzS4wDyYbj7lZVDruV2vTSVQ4ODMEK2JZtkrZR_qnf0C_rDGSjZNtKGOF5b57fzJgj27MijZm0lhVHpmUHrGAfvsvOthA9ODiAYzHbg_PKaITSJEs4O8VsgxilVDJQiuBidscXd4KvUlFMsyKfJZzzb5hcGQ9LTdy9bHskp_cx67UKmLYlqQNKuBvGlPMLpWuH4A...PAYLOAD TRUNCATED...wtu5u83b7R-TlP__GiH51LYJNCNYXk8lZIilNNyEZP8noZlWwV-XfItHzLlqSUtlAJ4f_kS5U58kWpS-pIlQ4nU5_APGkbqaxAwAA
```

Measured sizes for that link:

| Item                                 | Size                            |
| ------------------------------------ | ------------------------------- |
| Minified JSON                        | 944 characters, 945 UTF 8 bytes |
| Gzip plus unpadded base64url payload | 708 characters                  |
| Final URL                            | 764 characters                  |
| Chunks at 400 payload characters     | 2                               |

On arrival, assuming matching stored bean, grinder, and preparation names exist,
the brew fields produced by the importer are:

```json
{
  "grind_weight": 18,
  "brew_quantity": 300,
  "brew_quantity_type": "ML",
  "brew_beverage_quantity": 242.5,
  "brew_beverage_quantity_type": "GR",
  "brew_time": 212,
  "brew_time_milliseconds": 750,
  "brew_temperature": 93,
  "grind_size": "7.2",
  "mill_speed": 60,
  "coffee_blooming_time": 35,
  "coffee_blooming_time_milliseconds": 500,
  "coffee_first_drip_time": 12,
  "coffee_first_drip_time_milliseconds": 250,
  "unix_timestamp": 1789907696,
  "note": "Balanced sweetness with a light citrus finish.",
  "imported": {
    "source": "example-brewer",
    "sourceName": "Example Brewer",
    "sourceUrl": "https://example.com/brews/42",
    "device": "Example Brewer Mk I",
    "schema": 1,
    "params": {
      "brewId": "42"
    }
  }
}
```

The first three flow samples become cumulative grams at brew times `0.000`,
`1.000`, and `2.000`: water `0`, `45`, `100`; weight `0`, `0`, `12`.
The metric creates a custom axis with key `targetTemperature`, name
`Target temperature`, unit `°C`, and name prefix
`BREW_IMPORT_METRIC_TARGET`.

## Size and sender budget

The receiver's hard limits are in `brew-handoff.decoder.ts`:

- Inflated JSON is capped at 524,288 bytes.
- Each `shareBrew` chunk is capped at 400 characters.
- There may be at most 1,024 `shareBrew` chunks, for an aggregate
  409,600-character payload backstop.
- Flow and metric series are capped at 10,000 points each.
- The route validates `len` against the assembled payload length.

The sender's own 131,072-character URL budget is the real limit. At the
400-character chunk convention, that budget can emit 328 chunks. The receiver's
1,024-chunk aggregate cap is 409,600 payload characters, so the receiver does
not become the binding constraint while assembly remains finite.

The figures below come from a real end to end run: a four minute, 2,400 sample
brew encoded by an actual sender implementation and then decoded by this
branch's decoder, with the decoded envelope compared field by field against the
one that was sent. Both cases round tripped byte exact at full fidelity, with
all 2,400 samples retained.

The two rows bracket the range, because how well the series compress depends
almost entirely on how noisy the scale is. A brew whose readings climb smoothly
delta codes into very little; a brew recorded from a jittery scale does not.

| 2,400 sample brew        | Smooth trace | Noisy trace |
| ------------------------ | -----------: | ----------: |
| Minified JSON            |       20,234 |      22,521 |
| Gzip plus base64url      |        1,594 |       4,687 |
| Final URL characters     |        1,675 |       4,866 |
| Chunks at 400 characters |            4 |          12 |

So this measured realistic brew costs between four and twelve chunks. The real
sender can spend more: it uses a 131,072-character URL budget, or up to 328
chunks at 400 payload characters each. Even that maximum stays well inside the
receiver's 1,024-chunk backstop.

Truncation is detected rather than silently accepted. Dropping the final chunk
from the measured URL, which is what an OS level truncation looks like, failed
with `Truncated brew handoff payload: expected 1594 characters, got 1200`
before any decompression was attempted.

## Limits and failure modes

Before anything is decoded, the route calls `canImportBrewIfNotShowMessage()`.
An import needs the two links the importer cannot create for itself: an active
bean and an active preparation method. A library missing either cannot take a
brew, so the link is dropped without a decode and Beanconqueror's existing
"Something is missing here..." popover names what is missing. A grinder is not
required: `brew.mill` is left empty when the hint is absent or unmatched.
Beanconqueror seeds preparation methods on first run but never seeds a bean, so
this is the expected outcome of the first handoff into a fresh install. Nothing
is wrong with the link, and no sender change can avoid it.

All decoder failures throw an `Error`. The route catches the error, logs
`Import brew from handoff link failed: <message>`, hides the loading spinner,
and shows the generic `BREW_IMPORT_FAILED` alert.

| Failure                                                    | Decoder message                                                              | Sender fix                                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| No query string                                            | `Missing brew handoff query`                                                 | Include `?len=...&shareBrew0=...`.                                           |
| Missing or non decimal `len`                               | `Missing or malformed brew handoff len`                                      | Send decimal digits only.                                                    |
| `len` is not a safe integer                                | `Brew handoff len is too large`                                              | Keep payload length within JavaScript safe integer range.                    |
| No chunks                                                  | `Missing shareBrew chunks`                                                   | Send `shareBrew0`.                                                           |
| More than 1,024 chunks                                     | `Too many shareBrew chunks: maximum is 1024`                                 | Stay within the sender URL budget.                                           |
| Single chunk exceeds 400 characters                        | `shareBrew<n> must be at most 400 characters`                                | Split the payload into 400 character chunks.                                 |
| Duplicate chunk index                                      | `Duplicate shareBrew chunk <n>`                                              | Send each chunk index only once.                                             |
| Missing chunk index                                        | `Missing shareBrew chunk <n>`                                                | Send every chunk from `0` through the last index.                            |
| Assembled payload shorter than `len`                       | `Truncated brew handoff payload: expected <x> characters, got <y>`           | Check OS URL truncation and chunk assembly.                                  |
| Assembled payload longer or shorter in the other direction | `Brew handoff payload length mismatch: expected <x> characters, got <y>`     | Make `len` match the base64url payload exactly.                              |
| Empty payload                                              | `Empty payload`                                                              | Send a non empty gzip payload.                                               |
| Not unpadded base64url                                     | `Payload is not unpadded base64url`                                          | Use base64url without `=` padding.                                           |
| `DecompressionStream` unavailable                          | No sender-visible error                                                      | The decoder falls back to zip.js inflation for iOS 16.0 to 16.3.             |
| Bytes are not gzip                                         | `Payload is not gzip`                                                        | Compress with gzip, not zlib, raw deflate, or plain JSON.                    |
| Inflated payload exceeds cap                               | `Inflated payload exceeds 524288 bytes`                                      | Reduce JSON size.                                                            |
| Inflated bytes are not UTF 8                               | `Inflated payload is not UTF-8`                                              | Encode JSON as UTF 8.                                                        |
| Inflated text is not JSON                                  | `Inflated payload is not JSON`                                               | Send a JSON object.                                                          |
| Top level value is not an object                           | `Envelope must be an object`                                                 | Send an object envelope.                                                     |
| Unsupported envelope version                               | `Unsupported envelope version <value>`                                       | Send `v: 1`.                                                                 |
| `app` missing or not an object                             | `Envelope app must be an object`                                             | Send the app block.                                                          |
| `app.name` missing, empty, wrong type, or too long         | `Envelope app.name must be ...`                                              | Send a non empty string of at most 512 characters.                           |
| Optional string has wrong type or is too long              | `<path> must be ...`                                                         | Omit it, send `""`, or send a string of at most 512 characters.              |
| `imported` missing or not an object                        | `Envelope imported must be an object`                                        | Send provenance.                                                             |
| `imported.source` or `sourceName` invalid                  | `Envelope imported.source...` or `Envelope imported.sourceName...`           | Send non empty strings of at most 512 characters.                            |
| `sourceUrl` not a URL                                      | `Envelope imported.sourceUrl must be a URL`                                  | Send a parseable URL or omit it.                                             |
| `sourceUrl` not HTTPS                                      | `Envelope imported.sourceUrl must be https`                                  | Use `https:` or omit it.                                                     |
| `imported.schema` not an integer from 1 to 1,000           | `Envelope imported.schema must be ...`                                       | Send an integer in range.                                                    |
| Opaque object too deep                                     | `<path> exceeds maximum depth 8`                                             | Flatten `bean` or `params`.                                                  |
| Opaque array too long                                      | `<path> contains too many entries`                                           | Keep arrays to 1,000 entries.                                                |
| Opaque object too wide                                     | `<path> contains too many keys`                                              | Keep objects to 1,000 keys.                                                  |
| Opaque string too long                                     | `<path> must be between 0 and 10000 characters`                              | Shorten opaque strings.                                                      |
| Opaque key invalid                                         | `<path> key must be ...`                                                     | Use non empty keys of at most 512 characters.                                |
| `brew` missing or not an object                            | `Envelope brew must be an object`                                            | Send the brew block.                                                         |
| `brew.date` invalid                                        | `Envelope brew.date must be ISO 8601`                                        | Send an ISO timestamp accepted by the decoder pattern.                       |
| Quantity object missing or wrong type                      | `<path> must be an object`                                                   | Send `{ "value": number, "unit": expectedUnit }`.                            |
| Quantity unit wrong                                        | `<path>.unit must be <unit>`                                                 | Use `g` for dose and beverage, `ml` for water.                               |
| Quantity value outside range                               | `<path>.value must be between <min> and <max>`                               | Keep dose 0 to 200 g, water and beverage non negative.                       |
| Numeric brew field not finite or outside range             | `<path> must be a finite number` or `<path> must be between <min> and <max>` | Keep fields finite and inside their documented bounds.                       |
| `preparationMethod` invalid                                | `Envelope brew.preparationMethod must be ...`                                | Send a non empty string of at most 512 characters.                           |
| `rating` fractional or out of range                        | `Envelope brew.rating must be an integer` / `... must be between 0 and 10`   | Send a whole number of stars, or omit it.                                    |
| `note` too long or wrong type                              | `Envelope brew.note must be between 0 and 10000 characters`                  | Omit it or keep it within the cap.                                           |
| `flow` missing required shape                              | `Envelope flow must be an object` or field specific messages                 | Omit flow or send the full flow block.                                       |
| Bad `flow.fidelity`                                        | `Envelope flow.fidelity must be full or downsampled`                         | Send `full` or `downsampled`.                                                |
| Flow field not an array                                    | `<path> must be an array`                                                    | Send arrays for `t`, `waterDispensed`, `weight`, and optional `temperature`. |
| Flow array too long                                        | `<path> must contain at most 10000 entries`                                  | Downsample.                                                                  |
| Flow number invalid                                        | `<path>[n] must be a finite number` or range message                         | Send finite numbers. `t` must be 0 to 86,400,000.                            |
| Flow arrays have different lengths                         | `Envelope flow arrays must have the same length`                             | Send one value in every flow array for every sample.                         |
| `metrics` not an array                                     | `Envelope metrics must be an array`                                          | Send an array or omit it.                                                    |
| Too many metrics                                           | `Envelope metrics must contain at most 100 entries`                          | Reduce metric count.                                                         |
| Metric object invalid                                      | `Envelope metrics[n] must be an object` or field specific messages           | Send complete metric objects.                                                |
| Bad metric kind                                            | `Envelope metrics[n].kind must be target or measured`                        | Send `target` or `measured`.                                                 |
| Metric arrays too long or invalid                          | `<path> must contain at most 10000 entries` or number messages               | Downsample and keep times in range.                                          |
| Metric arrays have different lengths                       | `Envelope metrics[n] arrays must have the same length`                       | Send one value for each timestamp.                                           |
| Duplicate metric key                                       | `Envelope metrics[n].key is duplicated`                                      | Give each metric series a unique key.                                        |

The validation philosophy is to bound what consumes resources and what can
become active UI, while not rejecting harmless but unusual brew data. For
example, large but finite water and beverage quantities are accepted, Fahrenheit
scale bare temperatures are accepted up to 250, and high ratios or grinder RPMs
are accepted as long as they are finite and non negative. A decoder that rejects
an unusual but harmless brew turns into a Beanconqueror support issue.

## Security notes

An incoming link can come from any app and must be treated as attacker
controlled. The decoder's defences are:

- It validates the chunk sequence and payload length before decoding.
- It accepts only unpadded base64url.
- It inflates through `readCapped()`, which reads the gzip stream chunk by
  chunk, tracks the total inflated bytes, cancels the reader when the total
  exceeds 524,288 bytes, and throws before parsing JSON.
- It uses fatal UTF 8 decoding.
- It sanitises opaque objects by rebuilding them and dropping
  `__proto__`, `constructor`, and `prototype`.
- It normalises `sourceUrl` through the `URL` constructor and accepts only
  `https:`.
- It caps labels, notes, opaque data, metric counts, chunk counts, and series
  lengths.

## Vendor neutrality

The transport and import path is vendor neutral. The sender identity is data in
`imported.source` and `imported.sourceName`; Beanconqueror does not require any
specific value. `brew.preparationMethod`, `brew.grinderName`, and `bean.name`
are lookup hints against the user's own stored entries.

I verified the transport and import path with this search:

```text
rg 'xBloom|xbloom|XBloom|xbrw|XBRW|XBRecipeWriter|xbrecipe|Move|move2|Meticulous|meticulous' \
  src/services/intentHandler src/services/brewImport
```

It returned no matches. Vendor specific preparation type and icon work is
outside this path, in files such as `src/classes/preparation/preparation.ts`,
`src/classes/preparation/__tests__/preparation-xbloom.spec.ts`, and
`src/generated/icon-registry.ts`. The maintainer can take the handoff transport
and importer without taking any sender branding.
