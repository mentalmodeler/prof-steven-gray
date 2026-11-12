# Extraction issues for Dr. Gray

Found while moving `index.html` into `site-content.json`. Source content was kept **verbatim** (typos included);
nothing below was silently corrected unless the section says "Changed". Please decide each item; an agent can then apply it.

Counts verified against the source: 60 publications, 11 people, 14 funding rows, 8 news items.

## Needs a decision

### Identity and metadata
1. **Which institution?** The home text and your bio say Michigan State University, but the browser title says
   "Human-Environment Interactions Lab - **UMass Boston**". `meta.institution` is set to Michigan State University;
   `meta.siteTitle` keeps the original UMass Boston text.
2. **Favicons** pointed at `jonnybomb.com/umasslab/...` (the original developer's host). `meta.favicon` now points at the
   local `favicon.ico`.
3. **No site description** exists for search engines (`meta.description` is `null`).

### News
4. **Wrong link:** the "new paper in *Ecological Economics*" item and the "new paper in *Conservation Biology*" item both
   link to the same DOI (`10.1111/cobi.12316`, the *Conservation Biology* paper). The *Ecological Economics* item should
   likely link elsewhere.
5. **Stale and undated:** the news items appear to date from 2014 to 2016. No dates exist in the source (`date: null`).

### Publications
6. **Ambiguous "Gray, S."** appears twice in one author list in 6 entries (`gray-2017-participatory`,
   `gray-2017-introduction`, `gray-2015-fuzzy`, `gray-2014-fuzzy`, `gray-2014-local`, `gray-2013-mental`). Probably two
   different people. Those Grays are left unlinked (`personId: null`) instead of guessing.
7. **Year mismatch:** "Voices of Flint" (`gray-2017-voices`) is printed as **2016** but sits under the
   **2017** heading. The data keeps the page's 2017 grouping. Should it be 2016?
8. **Possibly outdated "in press"** (10 entries): four are from 2015 (`hmelo-silver-2015-representational`, `gray-2015-impact`,
   `gray-2015-fuzzy`, `mellor-2015-troubled`) and are probably published by now. Please confirm status, volume and pages.
9. **Five 2017 entries had no printed year** (the "in press" ones at the top). They take the 2017 heading's year.
10. **Peer-review flag:** everything under the "Refereed/Peer Reviewed" heading is `peerReviewed: true`, including the
    Flint and BLM reports and the FRDC report chapter, which probably are not. Only the book is `false`.
11. **Book authors are editors** ("(Eds.)"). They are stored as `authors` with `note: "Edited volume (Eds.)"`.
12. **Tags are my proposal.** All 60 entries were tagged by keyword rules from the title and journal, then spot-checked.
    One entry (`jordan-2013-rising`) is untagged. Please review the 14-tag vocabulary and the assignments.
13. **Not found in the source, so left empty:** DOIs, `featured` flags, and `sortKey`. The data layout is ready for them.

### Probable typos in the source (kept verbatim)
| Where | Source text | Probably |
|---|---|---|
| Author | `Nayaki, A.` (2014 citation) vs `Nyaki` (People page) | Nyaki |
| Author | `Halbrendt` (citations) vs `Halbrednt` (People page, Jackie Chan-Halbrednt) | Halbrendt |
| Author | `Aminpour` (2017 citation) vs `Aminpor` (People page) | one spelling |
| Author | `Palissio, M.` (book) vs `Paolisso` (elsewhere) | Paolisso |
| Author | `Handerson, J.` (Environmental Justice) vs `Henderson*, J.` (Flint report) | Henderson |
| Author | `Alison, S.` (Flint report, 4th author) | Singer, A. |
| Author | `Lepcyzk` | Lepczyk |
| Author | `Hemlo-Silver`, `Rugabar`, `S.Varrtam` | Hmelo-Silver, Rugaber, Vattam |
| Author | `Li., O.`, `Wallace1`/`Sadler1` (stray footnote digits), `1N. Kolagani` | |
| Pages | `44-457` (Htun et al. 2016) | 444-457 |
| Journal | `Ecological Modeling` (2012) | *Ecological Modelling* |
| Title | `Learning with ecosystem. models` | stray period |
| Funding | `Fuzzy Cognitive Maps:A novel approach`; `Freshwater Understanding the relationship...` | missing space; duplicated "Freshwater" |
| Bio | `Angela‘s research interest are` | grammar |

Stray digits and the `1N.` were removed from author *names* in the structured data (e.g. `Wallace`, `Kolagani`); all other
spellings are as printed.

### Software section
14. The text ends with "The following examples illustrate how this approach has been used in a range of studies", but
    **no examples follow** (the source has two empty columns). First-person ("I have been developing... for the last
    four years") and dated.
15. The hidden **Teaching** section lists University of Hawaii courses (EEOS/NREM). It is stored with
    `sections[].visible: false`.

## Changed during extraction (everything else is verbatim)
- **Your bio link:** `http:///www.mentalmodeler.com` (three slashes) became `http://www.mentalmodeler.com`.
- **`(in press)`** text was removed from citations and replaced by `status: "in-press"`. **"View Article"** links moved
  to `links`; "*Cover Article for January 2015*" moved to `note`.
- **Underline and asterisk markup** became `authors[].role` (`student` / `undergraduate`); "and" connectors in author
  lists were dropped.
- **Garbled author lists were reconstructed by hand** (19 entries), e.g. `Hubacek J. Introne` became two authors.
- **Paragraph breaks** (`<br><br>`) became separate paragraph blocks. `target`/`taget` attributes were dropped.
- The CV link moved from the bio text to `members[].links` (`resources/Gray CV.pdf`).

## Authored by me (not in the source)
- `meta.institution`, `meta.labName.parts`, `meta.lastUpdated`, `research.supportedBy` (parsed from the intro prose).
- Image `alt` text for people photos (the person's name) and the software screenshot ("Mental Modeler scenario
  screenshot"); all other alt text is the original.
- Publication `tags`, `personId` links, `peerReviewed`, `status`, and ids for every list item.
