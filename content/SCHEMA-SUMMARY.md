# Schema summary

`content/site-content.schema.json` is JSON Schema 2020-12. A `?` after a name means the field is optional.
Unknown properties are rejected everywhere.

## Top level
`schemaVersion`, `meta`, `sections`, `home`, `news`, `people`, `publications`, `research`, `software`, `teaching`.
All are required.

## Structure and identity

**`meta`** (site identity)

| Field | Notes |
|---|---|
| `siteTitle` | The browser tab text |
| `labName` | `full`, plus `parts[]` for stacked wordmarks |
| `institution` | Text shown on the page |
| `principalInvestigatorId` | Points at a person in `people.members` |
| `description?`, `favicon?`, `lastUpdated?` | Optional metadata |

**`sections[]`** (the page outline, in nav order)
- Each entry has `id`, `label`, and `visible`.
- It also has `includes[]`, the extra blocks the section shows by default. Currently the only allowed value is
  `news`, and Home has it. This is structure only, not layout.
- `id` is one of: home, people, publications, research, software, teaching.

## Content blocks

**`home`**: `body` (rich text blocks).

**`news`**: `heading`, `visible`, and `items[]`. Each item has `id`, `text` (inline markdown), and an optional `date`.

**`people`**
- `groups[]`: `id`, `label`, `status` (current or former), optional `badge`.
- `members[]`:
  - Identity: `id`, `name {display, given?, family}`, `groupId`, `role` (the text shown beside the name).
  - Degree: `degree?` (PhD or MS), `graduationYear?`.
  - Page content: `photo?`, `bio` (blocks), `links?`.

**`publications`**
- `legend`: explains the student and undergraduate roles.
- `types[]` and `tags[]`: controlled vocabularies, each entry `{id, label}`.
- `entries[]` (the filterable part), described below.

**`research`**
- `intro` (blocks), `supportedBy?[]`.
- `funding[]`: `id`, `status` (current or past), `startYear`, `endYear?`, `funder`, `title`.

**`software`**: `name`, `tagline`, `body` (blocks), `links?`.

**`teaching`** (hidden): `intro`, `courses[]` (`id`, `code`, `title`, `note?`), and its own `news[]`.

## Publication entry

| Group | Fields |
|---|---|
| Identity | `id`, `type` (references `types`), `year`, `sortKey?` |
| State | `status` (published or in-press), `peerReviewed`, `featured?` |
| People | `authors[]`, `editors?[]` |
| Bibliographic | `title`, `venue?` (`name`, `volume`, `issue`, `pages`), `publisher?`, `doi?` |
| Extras | `links?[]`, `note?`, `tags[]` (references `tags`) |
| Escape hatch | `citationOverride?` (a preformatted citation, used only when an entry can't be structured) |

**`authors[]`** entries have:
- `display` and `family`, both required.
- `given?`.
- `role?`: `student` (graduate student or advisee), `undergraduate`, or `null`.
- `personId?`: links to a lab member, which powers "papers by X".

## Reusable pieces
- **`id`**: lowercase kebab-case, permanent.
- **`inlineText`**: one paragraph with only `*italic*`, `**bold**` and `[label](url)`.
- **`blocks[]`**: either `{type: "paragraph", text}` or `{type: "images", images[]}`.
- **`image`**: `src`, `alt`, `caption?`.
- **`link`**: `label`, `url`, `kind?` (article, pdf, website, news, other).

## Rules the validator enforces beyond the schema
- Ids are unique within each list.
- Every `groupId`, `personId`, `tag`, `type`, and PI reference resolves.
- A section can only include a real block that isn't itself a section, and a block is included by at most one section.
- Tags and types with no entries are flagged as unused.
- No raw HTML in any text field.
- Years can't be in the future.
- `endYear` can't be before `startYear`.

## Things to flag
- **`role` on people** is free text (for example `"PhD, 2015"`), duplicating `degree` and `graduationYear`. That's
  deliberate: `role` is exactly what's displayed, and the other two are for filtering. But they can drift out of sync,
  and the validator doesn't cross-check them.
- **`teaching.news`** is a separate shape from top-level `news`. That's harmless while Teaching is hidden, but it is an
  inconsistency.
- **`tags` and `types` are fixed vocabularies in the data**, not in the schema. That's why adding a tag is a two-step
  edit.
