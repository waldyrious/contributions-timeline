#!/usr/bin/env node
// Fetch Wikimedia contributions across multiple wikis
// Output: TSV (id, platform, type, date, title, url, source)

const WIKIS = [
  { id: 'commons', api: 'https://commons.wikimedia.org/w/api.php', name: 'Commons' },
  { id: 'wikidata', api: 'https://www.wikidata.org/w/api.php', name: 'Wikidata' },
  { id: 'enwiki', api: 'https://en.wikipedia.org/w/api.php', name: 'Wikipedia (en)' },
  { id: 'ptwiki', api: 'https://pt.wikipedia.org/w/api.php', name: 'Wikipedia (pt)' },
  { id: 'mediawiki', api: 'https://www.mediawiki.org/w/api.php', name: 'MediaWiki' },
  { id: 'meta', api: 'https://meta.wikimedia.org/w/api.php', name: 'Meta-Wiki' },
  { id: 'enwiktionary', api: 'https://en.wiktionary.org/w/api.php', name: 'Wiktionary (en)' },
  { id: 'enwikisource', api: 'https://en.wikisource.org/w/api.php', name: 'Wikisource (en)' },
  { id: 'translatewiki', api: 'https://translatewiki.net/w/api.php', name: 'translatewiki.net' },
];

const USERNAME = 'Waldyrious';

async function fetchContribs(wiki, username, limit = 50) {
  const params = new URLSearchParams({
    action: 'query',
    list: 'usercontribs',
    ucuser: username,
    uclimit: limit,
    ucprop: 'ids|title|timestamp|comment|size|sizediff',
    format: 'json',
    origin: '*',
  });

  const url = `${wiki.api}?${params}`;
  console.error(`Fetching ${wiki.name}...`);

  try {
    const res = await fetch(url);
    const data = await res.json();
    const baseUrl = wiki.api.replace('/w/api.php', '');

    return (data.query?.usercontribs || []).map(edit => [
      `${wiki.id}-${edit.revid}`,
      'wikimedia',
      'edit',
      edit.timestamp,
      edit.title,
      `${baseUrl}/wiki/${encodeURIComponent(edit.title)}?oldid=${edit.revid}`,
      wiki.name,
    ]);
  } catch (err) {
    console.error(`Error fetching ${wiki.name}: ${err.message}`);
    return [];
  }
}

function escapeField(str) {
  return String(str).replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '');
}

async function main() {
  const rows = [];

  for (const wiki of WIKIS) {
    const contribs = await fetchContribs(wiki, USERNAME);
    rows.push(...contribs);
    console.error(`  Got ${contribs.length} edits`);
  }

  // Sort by date descending
  rows.sort((a, b) => new Date(b[3]) - new Date(a[3]));

  // Output TSV
  console.log(['id', 'platform', 'type', 'date', 'title', 'url', 'source'].join('\t'));
  for (const row of rows) {
    console.log(row.map(escapeField).join('\t'));
  }
}

main();
