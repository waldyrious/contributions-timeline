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
  { id: 'explainxkcd', api: 'https://www.explainxkcd.com/wiki/api.php', name: 'explain xkcd', ecosystem: 'otherwikis', username: 'Waldir', articleBase: 'https://www.explainxkcd.com/wiki/index.php' },
  { id: 'qtwiki', api: 'https://wiki.qt.io/api.php', name: 'Qt Wiki', ecosystem: 'otherwikis', articleBase: 'https://wiki.qt.io' },

  // Fandom
  { id: 'fandom-community', api: 'https://community.fandom.com/api.php', name: 'Community Central', ecosystem: 'otherwikis' },
  { id: 'fandom-ergoproxy', api: 'https://ergoproxy.fandom.com/api.php', name: 'Ergo Proxy Wiki', ecosystem: 'otherwikis' },
  { id: 'fandom-impossiblequiz', api: 'https://impossiblequiz.fandom.com/api.php', name: 'The Impossible Quiz Wiki', ecosystem: 'otherwikis' },
  { id: 'fandom-expanse', api: 'https://expanse.fandom.com/api.php', name: 'The Expanse Wiki', ecosystem: 'otherwikis' },
  { id: 'fandom-thementalist', api: 'https://thementalist.fandom.com/api.php', name: 'The Mentalist Wiki', ecosystem: 'otherwikis' },
  { id: 'fandom-graphics', api: 'https://graphics.fandom.com/api.php', name: 'Computer Graphics', ecosystem: 'otherwikis' },
  { id: 'fandom-soaps', api: 'https://soaps.fandom.com/api.php', name: 'Soap Opera Wiki', ecosystem: 'otherwikis' },
  { id: 'fandom-questionablecontent', api: 'https://questionablecontent.fandom.com/api.php', name: 'Questionable Content Wiki', ecosystem: 'otherwikis' },
  { id: 'fandom-community-sitcom', api: 'https://community-sitcom.fandom.com/api.php', name: 'Community Wiki', ecosystem: 'otherwikis' },
  { id: 'fandom-sims', api: 'https://sims.fandom.com/api.php', name: 'The Sims Wiki', ecosystem: 'otherwikis' },
  { id: 'fandom-gameofthrones', api: 'https://gameofthrones.fandom.com/api.php', name: 'Wiki of Westeros', ecosystem: 'otherwikis' },
  { id: 'fandom-criticalmass', api: 'https://criticalmass.fandom.com/api.php', name: 'Critical Mass', ecosystem: 'otherwikis' },
  { id: 'fandom-recess', api: 'https://recess.fandom.com/api.php', name: 'Recess Wiki', ecosystem: 'otherwikis' },
  { id: 'fandom-memoryalpha', api: 'https://memory-alpha.fandom.com/api.php', name: 'Memory Alpha', ecosystem: 'otherwikis' },
];

const DEFAULT_USERNAME = 'Waldyrious';

async function fetchContribs(wiki, { limit = 500, quiet = false } = {}) {
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
  if (!quiet) console.error(`Fetching ${wiki.name} as ${username}...`);

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
  const fandomWikis = WIKIS.filter(w => w.id.startsWith('fandom-'));
  const otherWikis = WIKIS.filter(w => !w.id.startsWith('fandom-'));

  for (const wiki of otherWikis) {
    const contribs = await fetchContribs(wiki);
    rows.push(...contribs);
    console.error(`  Got ${contribs.length} edits`);
  }

  console.error(`Fetching Fandom wikis as ${DEFAULT_USERNAME}...`);
  let fandomCount = 0;
  for (const wiki of fandomWikis) {
    const contribs = await fetchContribs(wiki, { quiet: true });
    rows.push(...contribs);
    fandomCount += contribs.length;
  }
  console.error(`  Got ${fandomCount} edits across ${fandomWikis.length} wikis`);

  // Sort by date descending
  rows.sort((a, b) => new Date(b[3]) - new Date(a[3]));

  // Output TSV
  console.log(['id', 'ecosystem', 'type', 'date', 'title', 'url', 'project', 'icon'].join('\t'));
  for (const row of rows) {
    console.log(row.map(escapeField).join('\t'));
  }
}

main();
