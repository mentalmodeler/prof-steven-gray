// One-off extractor: ../index.html -> site-content.json.
// Kept for provenance. After the first extraction, site-content.json is the source of truth
// and this script should NOT be re-run (it would overwrite edits).
import fs from 'node:fs';
import * as cheerio from 'cheerio';
import { PUB_OVERRIDES, TAGS, TAG_RULES } from './extract-config.mjs';

const OUT = new URL('../../content/site-content.json', import.meta.url);
if (fs.existsSync(OUT) && !process.argv.includes('--force')) {
  console.error('site-content.json already exists and is now the source of truth. Refusing to overwrite it (pass --force to regenerate from index.html and lose all edits).');
  process.exit(1);
}
const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const $ = cheerio.load(html);

// ---------- helpers ----------
const slug = (s) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const uniq = (base, seen) => {
  let id = base || 'item', n = 2;
  while (seen.has(id)) id = `${base}-${n++}`;
  seen.add(id);
  return id;
};

const wrap = (inner, mark) => {
  const m = inner.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : inner;
};

const fixUrl = (u) => (u || '').replace(/^http:\/\/\/+/, 'http://').trim();

// element -> inline markdown (links, italics, bold). \u0001 marks <br>.
function md(node) {
  return $(node).contents().toArray().map((c) => {
    if (c.type === 'text') return c.data.replace(/\*/g, '\\*');
    if (c.type !== 'tag') return '';
    const n = c.name, $c = $(c);
    if (n === 'br') return '\u0001';
    if (n === 'img') return '';
    if ((n === 'i') && /(^|\s)fa-/.test($c.attr('class') || '')) return '';
    const inner = md(c);
    if (n === 'a') {
      const href = fixUrl($c.attr('href'));
      return inner.trim() && href ? `[${inner.trim()}](${href})` : inner;
    }
    if (n === 'em' || n === 'i') return wrap(inner, '*');
    if (n === 'strong' || n === 'b') return wrap(inner, '**');
    return inner;
  }).join('');
}

const clean = (s) => s.replace(/ /g, ' ').replace(/[ \t\r\n]+/g, (m) => ' ').replace(/ ?\u0001 ?/g, '\u0001').trim();
const paras = (s) => clean(s).split(/\u0001+/).map((t) => t.trim()).filter(Boolean);

function blocksFrom($els) {
  const out = [];
  $els.each((_, el) => {
    const $el = $(el);
    const imgs = $el.find('img').toArray();
    const text = paras(md(el));
    if (imgs.length && !text.length) {
      out.push({
        type: 'images',
        images: imgs.map((i) => ({ src: $(i).attr('src'), alt: $(i).attr('alt') || '', caption: null })),
      });
    } else {
      text.forEach((t) => out.push({ type: 'paragraph', text: t }));
      if (imgs.length) out.push({ type: 'images', images: imgs.map((i) => ({ src: $(i).attr('src'), alt: $(i).attr('alt') || '', caption: null })) });
    }
  });
  return out;
}

// ---------- meta / sections ----------
const meta = {
  siteTitle: $('title').text().trim(),
  labName: {
    full: 'Human-Environment Interactions Lab',
    parts: ['Human', 'Environment', 'Interactions', 'Lab'],
  },
  institution: 'Michigan State University',
  description: null,
  principalInvestigatorId: 'steven-gray',
  favicon: 'favicon.ico',
  lastUpdated: new Date().toISOString().slice(0, 10),
};

const sections = [
  { id: 'home', label: 'Home', visible: true, includes: ['news'] },
  { id: 'people', label: 'People', visible: true, includes: [] },
  { id: 'publications', label: 'Publications', visible: true, includes: [] },
  { id: 'research', label: 'Research', visible: true, includes: [] },
  { id: 'software', label: 'Software', visible: true, includes: [] },
  { id: 'teaching', label: 'Teaching', visible: false, includes: [] },
];

// ---------- home + news ----------
const $home = $('#home');
const home = { body: blocksFrom($home.find('.col-sm-6').first().children('p')) };

const newsSeen = new Set();
const news = {
  heading: $home.find('.well-header').text().trim(),
  items: $home.find('.recent-news li').toArray().map((li) => {
    const text = clean(md(li));
    const plain = $(li).text().replace(/\s+/g, ' ').trim();
    return { id: uniq(slug(plain.split(' ').slice(0, 7).join(' ')), newsSeen), text, date: null };
  }),
};

// ---------- people ----------
const groups = [{ id: 'principal-investigator', label: 'Principal Investigator', status: 'current', badge: null }];
const members = [];
let currentGroup = 'principal-investigator';
const memberSeen = new Set();
$('#people .section-content').children('.row').each((_, row) => {
  const $row = $(row);
  if ($row.hasClass('divider')) {
    const badge = $row.find('span').text().trim();
    const label = clean($row.find('.col-sm-12').clone().children().remove().end().text());
    const status = /former/i.test(badge) ? 'former' : 'current';
    currentGroup = slug(`${label}-${badge}`);
    groups.push({ id: currentGroup, label, status, badge });
    return;
  }
  const spans = $row.find('.name span');
  const display = $(spans[0]).text().trim();
  const role = $(spans[1]).text().trim();
  const bare = display.replace(/^Dr\.\s*/, '');
  const parts = bare.split(/\s+/);
  const family = parts[parts.length - 1];
  const given = parts.slice(0, -1).join(' ') || null;
  const $descr = $row.find('.descr').clone();
  const links = [];
  $descr.find('a').each((_, a) => {
    if (/\.pdf$/i.test($(a).attr('href') || '')) {
      links.push({ label: $(a).text().replace(/ /g, ' ').trim(), url: ($(a).attr('href') || '').replace(/^\//, ''), kind: 'pdf' });
      $(a).remove();
    }
  });
  const ym = role.match(/(\d{4})/);
  members.push({
    id: uniq(slug(bare), memberSeen),
    name: { display, given, family },
    groupId: currentGroup,
    role,
    degree: /PhD/.test(role) ? 'PhD' : /MS/.test(role) ? 'MS' : null,
    graduationYear: ym ? Number(ym[1]) : null,
    photo: { src: $row.find('.image img').attr('src'), alt: bare, caption: null },
    bio: paras(md($descr[0])).map((text) => ({ type: 'paragraph', text })),
    links,
  });
});
const people = { groups, members };

// ---------- research ----------
const $res = $('#research');
const research = {
  intro: blocksFrom($res.find('.section-content > .row').first().find('p')),
  supportedBy: ['NSF', 'NOAA', 'USEPA', 'BLM', 'USDA', 'Leibniz Institute (Germany)', 'Australian Academy of Sciences'],
  funding: [],
};
const fSeen = new Set();
let fStatus = 'current';
$res.find('.section-content').children('.row').each((_, row) => {
  const $row = $(row);
  if ($row.hasClass('divider')) { fStatus = /past/i.test($row.find('span').text()) ? 'past' : 'current'; return; }
  if (!$row.hasClass('funding')) return;
  const [a, b] = $row.find('.funding-date').text().trim().split('-').map((x) => Number(x));
  const funder = clean($row.find('.name').text());
  research.funding.push({
    id: uniq(`${slug(funder.replace(/\(.*?\)/g, '')).split('-').slice(0, 4).join('-')}-${a}`, fSeen),
    status: fStatus,
    startYear: a,
    endYear: b || null,
    funder,
    title: clean($row.find('.descr').text()),
  });
});

// ---------- software ----------
const $sw = $('#software');
const $title = $sw.find('.title');
const swName = $title.find('span').text().trim();
const software = {
  name: swName,
  tagline: $title.clone().children().remove().end().text().trim(),
  body: blocksFrom($sw.find('.col-sm-6').find('p')),
  links: [{ label: 'www.mentalmodeler.org', url: 'http://www.mentalmodeler.org', kind: 'website' }],
};
software.body.forEach((b) => b.type === 'images' && b.images.forEach((i) => { if (!i.alt) i.alt = 'Mental Modeler scenario screenshot'; }));

// ---------- teaching (commented out in source) ----------
const commented = html.match(/<!-- Teaching -->\s*<!--([\s\S]*?)-->\s*\n\s*<!-- Software -->/);
const $t = cheerio.load(commented ? commented[1] : '');
const teachSeen = new Set();
const teaching = {
  intro: [{ type: 'paragraph', text: clean($t('.col-sm-8').clone().children('.course').remove().end().text()) }],
  courses: $t('.course').toArray().map((c) => {
    const code = $t(c).find('span').text().replace(':', '').trim();
    const title = $t(c).text().replace(/ /g, ' ').replace(/^[^:]*:/, '').trim();
    const note = /\(co-taught\)/.test(title) ? 'co-taught' : null;
    return { id: uniq(slug(code), teachSeen), code, title: title.replace(/\s*\(co-taught\)/, ''), note };
  }),
  news: $t('.recent-news li').toArray().map((li, i) => ({ id: `teaching-news-${i + 1}`, text: clean($t(li).text()) })),
};

// ---------- publications ----------
const tagIds = TAGS.map((t) => t.id);
const entries = [];
const pubSeen = new Set();
const STOP = new Set(['a', 'an', 'the', 'of', 'in', 'on', 'and', 'for', 'to', 'with', 'using', 'is', 'are', 'how', 'what', 'do', 'does', 'from', 'by', 'at', 'as']);
let rawIdx = 0;

function markup(li) {
  const $li = $(li).clone();
  const links = [];
  let note = null;
  $li.find('a').each((_, a) => {
    links.push({ label: clean($(a).text()) || 'View Article', url: fixUrl($(a).attr('href')), kind: 'article' });
    $(a).remove();
  });
  $li.find('strong').each((_, s) => { note = clean($(s).text()).replace(/^\*+/, '').trim(); $(s).remove(); });
  const walk = (node) => $(node).contents().toArray().map((c) => {
    if (c.type === 'text') return c.data;
    if (c.type !== 'tag') return '';
    if (c.name === 'br') return ' ';
    if (c.name === 'sup') return '';
    const inner = walk(c);
    if (c.name === 'u') return `\u0002${inner}\u0003`;
    if (c.name === 'em') return `\u0004${inner}\u0005`;
    return inner;
  }).join('');
  return { text: walk($li[0]).replace(/ /g, ' ').replace(/\s+/g, ' ').trim(), links, note };
}

function splitAuthors(s) {
  // s is the author string with \u0002..\u0003 underline markers
  const flat = s.replace(/\s*&amp;\s*|\s+&\s+/g, ', ').replace(/,?\s+and\s+/g, ', ').replace(/\.\s*,/g, '.,');
  // underline-aware tokenization on commas outside markers is unnecessary: markers contain no commas except in names, so mark per token
  const tokens = [];
  let buf = '', u = false;
  for (const ch of flat) {
    if (ch === '\u0002') { u = true; buf += ch; }
    else if (ch === '\u0003') { u = false; buf += ch; }
    else if (ch === ',' ) { tokens.push(buf); buf = u ? '\u0002' : ''; }
    else buf += ch;
  }
  tokens.push(buf);
  return tokens.map((t) => t.trim()).filter((t) => t.replace(/[\u0002\u0003\s]/g, ''));
}

// Compact author spec for manual overrides: "~Singer, A.@alison-singer"
// ~ = graduate student, + = undergraduate, @id = lab member. "Family, I." or "I. Family" or bare family.
function spec(str) {
  let role = null, personId = null, t = str.trim();
  if (t[0] === '~') { role = 'student'; t = t.slice(1); } else if (t[0] === '+') { role = 'undergraduate'; t = t.slice(1); }
  const at = t.indexOf('@');
  if (at >= 0) { personId = t.slice(at + 1); t = t.slice(0, at); }
  let family, given = null, m;
  if (t.includes(',')) { const [f, g] = t.split(/,\s*(.*)/); family = f.trim(); given = g.trim() || null; }
  else if ((m = t.match(/^((?:[A-Z]\.?\s?){1,4})\s+(\S.*)$/))) { given = m[1].trim(); family = m[2].trim(); }
  else if (/\s/.test(t)) { const k = t.lastIndexOf(' '); given = t.slice(0, k); family = t.slice(k + 1); }
  else family = t;
  return { display: t, family, given, role, personId };
}

const INIT = /^(?:[A-Z]\.?\s?){1,4}\*?$/;
function parseAuthors(authorStr) {
  const toks = splitAuthors(authorStr);
  const authors = [];
  const push = (display, familyRaw, given, role) =>
    authors.push({ display, family: familyRaw, given: given || null, role, personId: null });
  const strip = (t) => t.replace(/[\u0002\u0003]/g, '').trim();
  const roleOf = (t) => (t.includes('\u0002') ? 'student' : /\*\s*$/.test(strip(t)) ? 'undergraduate' : null);
  for (let i = 0; i < toks.length; i++) {
    const raw = toks[i], t = strip(raw);
    const r = roleOf(raw);
    const bare = t.replace(/\*$/, '').trim();
    if (INIT.test(bare) && authors.length && !authors[authors.length - 1].given) {
      const a = authors[authors.length - 1];
      a.given = bare; a.display = `${a.display}, ${t}`; if (!a.role) a.role = r; continue;
    }
    // "I. Family" or "Family I." in one token
    let m = bare.match(/^((?:[A-Z]\.?\s?){1,4})\s+(\S.*)$/);
    if (m && /^[A-Za-z]/.test(m[2]) && !INIT.test(bare)) { push(t, m[2].replace(/\.$/, ''), m[1].trim(), r); continue; }
    m = bare.match(/^(\S.*?)\s+((?:[A-Z]\.?\s?){1,4})$/);
    if (m && !INIT.test(bare)) { push(t, m[1], m[2].trim(), r); continue; }
    push(t, bare.replace(/\.$/, ''), null, r);
  }
  return authors;
}

function classify(text, hasEm, sectionIsBooks, venueName) {
  if (sectionIsBooks) return 'book';
  if (/\bReport\b/.test(text) && !hasEm) return 'report';
  if (/Proceedings|Oceans$|International Congress|Conference/i.test(venueName || '')) return 'conference-paper';
  if (/\bIn\s+[\u0004]|\bEds?:/.test(text)) return 'book-chapter';
  return 'journal-article';
}

function autoTags(title, venue) {
  const hay = `${title} ${venue || ''}`;
  return TAG_RULES.filter(([, re]) => re.test(hay)).map(([id]) => id).filter((id) => tagIds.includes(id));
}

function lines(section) {
  return $(section).find('li').toArray();
}

let curYear = null;
let inBooks = false;
let peer = true;
$('#publications .section-content').children('.row').each((_, row) => {
  const $row = $(row);
  if ($row.hasClass('divider')) { const t = $row.text().trim(); inBooks = /Books/i.test(t); peer = !inBooks; return; }
  if ($row.hasClass('header')) { curYear = Number($row.find('span').text().trim()); return; }
  if (!$row.hasClass('publ-row')) return;
  $row.find('li').each((_, li) => {
    rawIdx += 1;
    const { text: t0, links, note } = markup(li);
    const ov = PUB_OVERRIDES[rawIdx] || {};
    let text = t0;
    let status = 'published';
    if (/\(?\bin press\b\)?/i.test(text)) { status = 'in-press'; text = text.replace(/\s*\(\s*in press\s*\)\.?/ig, '').replace(/\s*\bin press\b\.?/ig, ''); }
    // locate author/title boundary
    let authorStr, rest;
    if (ov.authorsEnd) {
      const k = text.indexOf(ov.authorsEnd);
      if (k < 0) throw new Error(`override #${rawIdx}: authorsEnd not found`);
      authorStr = text.slice(0, k + ov.authorsEnd.length); rest = text.slice(k + ov.authorsEnd.length).replace(/^[\s.]+/, '');
    } else {
      // first 4-digit year outside an <em>
      let depth = 0, pos = -1;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '\u0004') depth++; else if (text[i] === '\u0005') depth--;
        else if (depth === 0 && /(19|20)\d\d/.test(text.slice(i, i + 4)) && !/\d/.test(text[i - 1] || '') && !/\d/.test(text[i + 4] || '')) { pos = i; break; }
      }
      if (pos < 0) { console.log(`NOYEAR #${rawIdx}: ${text}`); authorStr = text; rest = ''; }
      else {
        authorStr = text.slice(0, pos).replace(/[\s.,]+$/, '');
        rest = text.slice(pos + 4).replace(/^[\s.,]+/, '');
      }
    }
    const citedYear = (text.match(/(19|20)\d\d/) || [])[0];
    // title / venue split at first <em>
    const eStart = rest.indexOf('\u0004'), eEnd = rest.indexOf('\u0005');
    let title, venueName = null, tail = '', publisher = null;
    if (inBooks) {
      title = rest.slice(eStart + 1, eEnd).trim().replace(/[.\s]+$/, '');
      publisher = rest.slice(eEnd + 1).replace(/^[\s.]+/, '').replace(/[\s.]+$/, '') || null;
    } else if (eStart >= 0) {
      title = rest.slice(0, eStart).replace(/[\s.,]+$/, '').replace(/\s+In\s*$/, '').replace(/\s+In:\s*$/, '');
      venueName = rest.slice(eStart + 1, eEnd).trim().replace(/[.,\s]+$/, '');
      tail = rest.slice(eEnd + 1).replace(/[\u0002\u0003\u0004\u0005]/g, '').trim();
    } else {
      title = rest.replace(/[.\s]+$/, '');
    }
    title = title.replace(/[\u0002\u0003\u0004\u0005]/g, '').trim();
    const type = ov.type || classify(text, eStart >= 0, inBooks, venueName);
    const authors = ov.authors ? ov.authors.map(spec) : parseAuthors(authorStr);
    entries.push({
      __raw: { idx: rawIdx, text: t0, authorStr, tail, citedYear },
      id: null,
      type,
      year: ov.year || curYear,
      status: ov.status || status,
      peerReviewed: peer,
      authors,
      title: ov.title || title,
      venue: ov.venue === null ? null : (venueName || ov.venue) ? { name: venueName || undefined, volume: null, issue: null, pages: null, ...(ov.venue || {}) } : null,
      ...(ov.editors ? { editors: ov.editors } : {}),
      publisher: ov.publisher !== undefined ? ov.publisher : publisher,
      links,
      note: ov.note !== undefined ? ov.note : note,
      tags: ov.tags || autoTags(ov.title || title, venueName),
      ...(ov.citationOverride ? { citationOverride: ov.citationOverride } : {}),
    });
  });
});

// parse volume/issue/pages from tails
for (const e of entries) {
  const { tail } = e.__raw;
  if (!e.venue || !tail) continue;
  if (PUB_OVERRIDES[e.__raw.idx]?.venue) continue;
  if (e.venue.volume || e.venue.pages) continue;
  const t = tail.replace(/^[\s.,:;]+/, '').replace(/\.$/, '');
  let m;
  if ((m = t.match(/^(\d+)\s*\((\d+)\)[\s,:]*(.*)$/))) { e.venue.volume = m[1]; e.venue.issue = m[2]; e.venue.pages = m[3] || null; }
  else if ((m = t.match(/^\((\d+)\)\s*(.*)$/))) { e.venue.volume = m[1]; e.venue.pages = m[2] || null; }
  else if ((m = t.match(/^(\d+)\s*[:,]\s*(.*)$/))) { e.venue.volume = m[1]; e.venue.pages = m[2] || null; }
  else if ((m = t.match(/^(\d+)\.\s*(\d.*)$/))) { e.venue.volume = m[1]; e.venue.pages = m[2]; }
  else if ((m = t.match(/^(\d+)\s+(\d.*)$/))) { e.venue.volume = m[1]; e.venue.pages = m[2] || null; }
  else if (/^\d+\s*[-–]\s*\d+$/.test(t)) { e.venue.pages = t; }
  else if (/^\d+$/.test(t)) { e.venue.volume = t; }
  else e.venue.__unparsedTail = t;
}
for (const e of entries) if (e.venue && e.venue.__unparsedTail === '') delete e.venue.__unparsedTail;

// link lab members
const MEMBER_MAP = {
  Singer: ['A', 'alison-singer'], Aminpour: ['P', 'payam-aminpor'], Aminpor: ['P', 'payam-aminpor'],
  Punawai: ['N', 'noelani-punawai'], Nyaki: ['A', 'angela-nyaki'], Nayaki: ['A', 'angela-nyaki'],
  Pleasant: ['M', 'mary-pleasant'], Halbrendt: ['J', 'jackie-chan-halbrednt'], Halbrednt: ['J', 'jackie-chan-halbrednt'],
  Miller: ['M', 'molly-miller'], Chikowore: ['N', 'noleen-chikowore'], Young: ['L', 'laura-young'], Metzger: ['A', 'alex-metzger'],
};
for (const e of entries) {
  const grays = e.authors.filter((a) => a.family === 'Gray');
  for (const a of e.authors) {
    const mm = MEMBER_MAP[a.family];
    if (mm && (a.given || '').replace(/[\s.]/g, '').startsWith(mm[0])) a.personId = mm[1];
    if (a.family === 'Gray' && grays.length === 1) a.personId = 'steven-gray';
  }
}

// ids
for (const e of entries) {
  const first = e.authors[0]?.family || 'anon';
  const word = (e.title.toLowerCase().match(/[a-z]+/g) || []).find((w) => !STOP.has(w) && w.length > 2) || 'work';
  e.id = uniq(`${slug(first)}-${e.year}-${word}`, pubSeen);
}

const publications = {
  legend: {
    student: 'Graduate student or advisee co-author',
    undergraduate: 'Undergraduate co-author',
  },
  types: [
    { id: 'book', label: 'Book' },
    { id: 'journal-article', label: 'Journal article' },
    { id: 'book-chapter', label: 'Book chapter' },
    { id: 'conference-paper', label: 'Conference paper' },
    { id: 'report', label: 'Report' },
  ],
  tags: TAGS,
  entries: entries.map(({ __raw, ...e }) => e),
};

news.visible = true;
const out = {
  schemaVersion: '1.0.0',
  meta, sections, home, news, people, publications, research, software, teaching,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
if (process.argv.includes('--debug')) fs.writeFileSync(
  new URL('../../content/draft-review.json', import.meta.url),
  JSON.stringify(entries.map((e) => ({ n: e.__raw.idx, year: e.year, cited: e.__raw.citedYear, type: e.type, authorStr: e.__raw.authorStr, authors: e.authors.map((a) => `${a.family}|${a.given || ''}|${a.role || ''}|${a.personId || ''}`), title: e.title, venue: e.venue, publisher: e.publisher, tags: e.tags, status: e.status, note: e.note, links: e.links.length })), null, 1)
);
console.log(`entries=${entries.length} people=${members.length} funding=${research.funding.length} news=${news.items.length}`);
