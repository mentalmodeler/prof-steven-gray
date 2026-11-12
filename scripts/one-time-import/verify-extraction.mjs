// Word-level fidelity check: text of each index.html section vs text rendered from site-content.json.
// Prints words present on one side only. Every difference should be explainable (markup, removed boilerplate).
import fs from 'node:fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const d = JSON.parse(fs.readFileSync(new URL('../../content/site-content.json', import.meta.url), 'utf8'));
const $ = cheerio.load(html);

const toks = (s) =>
  s.replace(/\[([^\]]*)\]\(([^)]*)\)/g, '$1 ') // keep link label, drop url
    .replace(/[ ]/g, ' ').replace(/[*\\]/g, '')
    .toLowerCase().split(/[^a-z0-9'’]+/).map((w) => w.replace(/^['’]+|['’]+$/g, '')).filter(Boolean);
const bag = (arr) => arr.reduce((m, w) => (m.set(w, (m.get(w) || 0) + 1), m), new Map());
function diff(a, b) {
  const A = bag(a), B = bag(b), onlyA = [], onlyB = [];
  for (const [w, n] of A) { const k = n - (B.get(w) || 0); if (k > 0) onlyA.push(k > 1 ? `${w}×${k}` : w); }
  for (const [w, n] of B) { const k = n - (A.get(w) || 0); if (k > 0) onlyB.push(k > 1 ? `${w}×${k}` : w); }
  return { onlyHtml: onlyA, onlyJson: onlyB };
}

const blocks = (bs) => bs.map((b) => (b.type === 'paragraph' ? b.text : b.images.map((i) => i.alt).join(' '))).join(' ');
const secText = (id) => { const $s = $(`#${id}`).clone(); $s.find('.section-header-bg').remove(); $s.find('img').each((_, i) => { $(i).replaceWith(` ${$(i).attr('alt') || ''} `); }); return $s.text(); };

const author = (a) => a.display;
const pub = (e) => [e.authors.map(author).join(' '), e.year, e.title, e.venue ? [e.venue.name, e.venue.volume, e.venue.issue, e.venue.pages].join(' ') : '', (e.editors || []).join(' '), e.publisher || '', e.note || '', e.links.map((l) => l.label).join(' ')].join(' ');

const sections = {
  home: [secText('home'), blocks(d.home.body) + ' ' + d.news.heading + ' ' + d.news.items.map((n) => n.text).join(' ')],
  people: [secText('people'), d.people.groups.map((g) => `${g.label} ${g.badge || ''}`).join(' ') + ' ' + d.people.members.map((m) => `${m.name.display} ${m.role} ${blocks(m.bio)} ${m.links.map((l) => l.label).join(' ')} ${m.photo ? m.photo.alt : ''}`).join(' ')],
  publications: [secText('publications'), d.publications.entries.map(pub).join(' ')],
  research: [secText('research'), blocks(d.research.intro) + ' ' + d.research.funding.map((f) => `${f.startYear}-${f.endYear || ''} ${f.funder} ${f.title}`).join(' ') + ' Research Funding Current Selected Past'],
  software: [secText('software'), `${d.software.name} ${d.software.tagline} ${blocks(d.software.body)}`],
};
const comm = html.match(/<!-- Teaching -->\s*<!--([\s\S]*?)-->/);
sections.teaching = [cheerio.load(comm[1]).text(), blocks(d.teaching.intro) + ' ' + d.teaching.courses.map((c) => `${c.code} ${c.title} ${c.note || ''}`).join(' ') + ' Recent News ' + d.teaching.news.map((n) => n.text).join(' ')];

let bad = 0;
for (const [name, [h, j]] of Object.entries(sections)) {
  const r = diff(toks(h), toks(j));
  console.log(`\n## ${name}: html words=${toks(h).length} json words=${toks(j).length}`);
  console.log('  only in HTML :', r.onlyHtml.join(' ') || '—');
  console.log('  only in JSON :', r.onlyJson.join(' ') || '—');
  bad += r.onlyHtml.length + r.onlyJson.length;
}
console.log(`\nTotal differing word types: ${bad}`);
