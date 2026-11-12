# Human-Environment Interactions Lab: website content

Everything on the lab website (news, people, publications, research, software) is stored in one file:
[`content/site-content.json`](content/site-content.json). The website pages are generated from it, so you edit the data once and every
version of the site updates.

## Updating the content

The easiest way is to ask an AI coding agent (such as Claude Code) to do it for you. Open a terminal in this
folder, start the agent, and ask in plain language, for example:

- "Add this paper: *(paste the citation)*."
- "Add a news item: *(what happened)*."
- "Move Alison Singer to former students; she graduated in 2027."
- "Add a new grant from NSF."

The agent follows the rules in [`content/AGENT-GUIDE.md`](content/AGENT-GUIDE.md) and checks its work with a validator, so
mistakes like a missing field or a broken reference are caught before they reach the site. Ask it to tell you what it changed
before you publish.

## Publishing

The site is hosted with GitHub Pages from this repository. A change goes live once it is committed and pushed
to the `main` branch. Ask the agent to commit and push, or do it yourself in the usual way. It can take a minute or two for GitHub to
update the page.

## One-time setup

1. Install [Node.js](https://nodejs.org/).
2. In this folder, run `npm install`.

## For developers

- Check the data: `npm run validate`. It prints `OK` when the data matches
  [`content/site-content.schema.json`](content/site-content.schema.json), and it regenerates `content/site-content.js`
  (the copy of the data that the pages load). Commit that file together with the JSON.
- Preview locally: `python3 -m http.server`, then open <http://localhost:8000/>.
- Layout, design decisions and how to add a new site variant: see [`CLAUDE.md`](CLAUDE.md).
- A readable summary of the data structure: [`content/SCHEMA-SUMMARY.md`](content/SCHEMA-SUMMARY.md).

## Open questions

Some things in the original site need a decision from Dr. Gray (for example whether the lab is at UMass Boston
or Michigan State). See [`content/EXTRACTION-ISSUES.md`](content/EXTRACTION-ISSUES.md).

## License

See [`LICENSE`](LICENSE).
