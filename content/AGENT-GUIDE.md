# Editing the lab site content (guide for AI agents)

`site-content.json` is the single source of truth for every piece of text, link and image reference on the
Human-Environment Interactions Lab site. Website variants are generated from it. It is governed by
`site-content.schema.json` (read the `description` on each property; they are the field-level instructions).

## Workflow for every change
1. Edit `site-content.json` only. Never edit a variant's HTML/JS to change content.
2. Run `npm run validate` from the repo root (run `npm install` once first). It must print `OK`. This also regenerates `site-content.js`, the copy pages use when opened from disk, so skipping it leaves that copy stale.
3. Set `meta.lastUpdated` to today's date (YYYY-MM-DD).
4. Tell the user exactly what you added/changed/removed.

## Hard rules
- **Content only.** No HTML, no CSS classes, no column layout, no section numbers. Variants decide presentation.
- **Text fields** allow inline markdown only: `*italic*`, `**bold**`, `[label](https://url)`. A literal asterisk is `\*`.
- **Ids are permanent.** Every list item has a kebab-case `id`, unique within its list. Never rename an existing id
  (other records and external links may reference it). New ids: lowercase letters, digits and hyphens.
- **Array order is display order** (people within a group, news newest-first, funding within its status).
- **References must resolve:** `groupId` → `people.groups`, `personId` → `people.members`, `tags` →
  `publications.tags`, `type` → `publications.types`. Add the vocabulary entry first, then use it.
- **Don't invent facts.** If a value is unknown use `null` (where the schema allows it) instead of guessing.
- **Don't delete content to hide it.** Use `sections[].visible: false` to hide a whole section, or `news.visible: false` to hide the news.
- **Don't touch `sections[].includes`** (which blocks a section shows by default, e.g. Home includes `news`) unless asked. It is structure, not layout.
- Do not run anything in `scripts/one-time-import/`. It was a one-time import from the old site and is kept for provenance only.

## Recipes

**Add a publication** (`publications.entries`, newest year first):
```json
{
  "id": "gray-2026-example",
  "type": "journal-article",
  "year": 2026,
  "status": "published",
  "peerReviewed": true,
  "authors": [
    { "display": "Gray, S.", "family": "Gray", "given": "S.", "role": null, "personId": "steven-gray" },
    { "display": "Singer, A.", "family": "Singer", "given": "A.", "role": "student", "personId": "alison-singer" }
  ],
  "title": "Plain-text title, no markdown",
  "venue": { "name": "Journal Name", "volume": "12", "issue": "3", "pages": "45-67" },
  "publisher": null,
  "doi": "10.1000/xyz123",
  "links": [{ "label": "View Article", "url": "https://doi.org/10.1000/xyz123", "kind": "article" }],
  "note": null,
  "tags": ["participatory-modeling"]
}
```
- `role`: `student` = graduate student/advisee co-author (underlined on the original page), `undergraduate`
  (asterisk), otherwise `null`. Set `personId` whenever the author is a lab member in `people.members` so the
  "papers by X" filter works. Several "Gray, S." entries are ambiguous and deliberately left unlinked (see
  `EXTRACTION-ISSUES.md`); only link when certain.
- Book chapters/reports: put the containing book or report series in `venue.name`, the publisher/place in
  `publisher`, editors in `editors`. `citationOverride` is a last resort for citations that cannot be structured.
- A paper accepted but not yet out: `"status": "in-press"` (never write "(in press)" in a title).

**Add a person:** add to `people.members` with `groupId` of an existing group, `photo.src` pointing at an existing
file under `img/`, and the bio as `paragraph` blocks (one block per paragraph, no `<br>`). Moving someone from
current to former: change their `groupId`, set `graduationYear`, update `role` (e.g. `"PhD, 2027"`).

**Add news:** insert a new item at the **top** of `news.items` with a new `id`; `date` as `YYYY-MM` if known.

**Add funding:** `research.funding` with `status` `current` or `past`; `endYear: null` for a one-year grant.
When a grant ends, change `status` to `past`; don't delete it.

**Add/rename a tag:** add `{ "id", "label" }` to `publications.tags` first. A tag with no entries fails
validation, so remove unused tags too. Prefer reusing existing tags.

## Filtering publications (what variants rely on)
Every filter works off structured fields: `year`, `type`, `tags`, `peerReviewed`, `status`, `featured`,
`venue.name`, and `authors[].personId` / `authors[].role`. Example (Node):
```js
const E = data.publications.entries;
E.filter(e => e.year === 2014);
E.filter(e => e.tags.includes('citizen-science'));
E.filter(e => e.authors.some(a => a.personId === 'alison-singer'));
E.filter(e => e.authors.some(a => a.role === 'student'));
```

## Files
| File | Purpose |
|---|---|
| `site-content.json` | The data (edit this) |
| `site-content.schema.json` | The contract |
| `../scripts/validate.mjs` | Schema + integrity checks (ids, references, raw HTML). On a clean pass it also regenerates `site-content.js` |
| `site-content.js` | Generated copy of the data (`window.SITE_CONTENT`) so pages work when opened from disk. Never edit; never commit a stale one |
| `EXTRACTION-ISSUES.md` | Problems in the original page, awaiting Dr. Gray's decision |
| `../scripts/one-time-import/` | One-time import and its fidelity check (provenance only) |
