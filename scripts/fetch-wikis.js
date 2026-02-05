#!/usr/bin/env node
// Fetch contributions from Wikimedia wikis and other MediaWiki-based wikis
// Output: TSV (id, ecosystem, type, date, title, url, project, icon)

const WIKIS = [
  // Wikimedia
  { id: 'commons', api: 'https://commons.wikimedia.org/w/api.php', name: 'Commons' },
  { id: 'wikidata', api: 'https://www.wikidata.org/w/api.php', name: 'Wikidata' },
  { id: 'enwiki', api: 'https://en.wikipedia.org/w/api.php', name: 'Wikipedia (en)' },
  { id: 'ptwiki', api: 'https://pt.wikipedia.org/w/api.php', name: 'Wikipedia (pt)' },
  { id: 'mediawiki', api: 'https://www.mediawiki.org/w/api.php', name: 'MediaWiki' },
  { id: 'meta', api: 'https://meta.wikimedia.org/w/api.php', name: 'Meta-Wiki' },
  { id: 'enwiktionary', api: 'https://en.wiktionary.org/w/api.php', name: 'Wiktionary (en)' },
  { id: 'enwikisource', api: 'https://en.wikisource.org/w/api.php', name: 'Wikisource (en)' },
  { id: 'translatewiki', api: 'https://translatewiki.net/w/api.php', name: 'translatewiki.net' },

  // Other wikis
  { id: 'osmwiki', api: 'https://wiki.openstreetmap.org/w/api.php', name: 'OpenStreetMap Wiki', ecosystem: 'osm', username: 'Waldyrious' },
  { id: 'explainxkcd', api: 'https://www.explainxkcd.com/wiki/api.php', name: 'explain xkcd', ecosystem: 'explainxkcd', username: 'Waldir', articleBase: 'https://www.explainxkcd.com/wiki/index.php' },
  { id: 'fandom-community', api: 'https://community.fandom.com/api.php', name: 'Fandom (Community)', ecosystem: 'fandom', username: 'Waldir' },
];

const DEFAULT_USERNAME = 'Waldyrious';

async function fetchContribs(wiki, limit = 50) {
  const username = wiki.username || DEFAULT_USERNAME;
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
  console.error(`Fetching ${wiki.name} as ${username}...`);

  try {
    const res = await fetch(url);
    const data = await res.json();

    let articleUrlBase;
    if (wiki.articleBase) {
      articleUrlBase = wiki.articleBase;
    } else {
      let base = wiki.api.replace('/w/api.php', '').replace('/api.php', '');
      if (base.endsWith('/')) base = base.slice(0, -1);
      articleUrlBase = `${base}/wiki`;
    }

    // Extract domain from API URL for favicon
    const iconDomain = new URL(wiki.api).hostname;

    return (data.query?.usercontribs || []).map(edit => [
      `${wiki.id}-${edit.revid}`,
      wiki.ecosystem || 'wikimedia',
      'edit',
      edit.timestamp,
      edit.title,
      `${articleUrlBase}/${encodeURIComponent(edit.title)}?oldid=${edit.revid}`,
      wiki.name,
      iconDomain,
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
    const contribs = await fetchContribs(wiki);
    rows.push(...contribs);
    console.error(`  Got ${contribs.length} edits`);
  }

  // Sort by date descending
  rows.sort((a, b) => new Date(b[3]) - new Date(a[3]));

  // Output TSV
  console.log(['id', 'ecosystem', 'type', 'date', 'title', 'url', 'project', 'icon'].join('\t'));
  for (const row of rows) {
    console.log(row.map(escapeField).join('\t'));
  }
}

main();
