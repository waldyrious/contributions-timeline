#!/usr/bin/env node
// Generate static HTML from TSV timeline data

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SITE_DIR = path.join(__dirname, '..', 'site');

// Fallback icons by ecosystem (used when contrib.icon is not set)
const ECOSYSTEM_ICONS = {
  github: 'github.com',
  wikimedia: 'wikipedia.org',
  osm: 'openstreetmap.org',
  explainxkcd: 'explainxkcd.com',
  fandom: 'fandom.com',
};

const ECOSYSTEMS = {
  wikimedia: { label: 'Wikimedia' },
  osm: { label: 'OpenStreetMap' },
  github: { label: 'GitHub' },
  explainxkcd: { label: 'explain xkcd' },
  fandom: { label: 'Fandom' },
};

const TYPES = {
  wiki: { label: 'Wiki edits' },
  code: { label: 'Code' },
  talk: { label: 'Discussion' },
  map: { label: 'Map edits' },
  i18n: { label: 'Translation' },
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(isoDate) {
  const d = new Date(isoDate);
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function loadTSV(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.error(`Error: ${filename} not found`);
    process.exit(1);
  }
  const lines = fs.readFileSync(filepath, 'utf-8').trim().split('\n');
  const header = lines[0].split('\t');

  return lines.slice(1).map(line => {
    const values = line.split('\t');
    const obj = {};
    header.forEach((key, i) => obj[key] = values[i] || '');
    return obj;
  });
}

function classifyType(contrib) {
  const title = contrib.title || '';
  const isTalk = /([ _]|^)[Tt]alk:/.test(title);

  if (contrib.type === 'changeset') {
    return 'map';
  } else if (isTalk) {
    return 'talk';
  } else if (contrib.project === 'translatewiki.net') {
    return 'i18n';
  } else if (['edit'].includes(contrib.type)) {
    return 'wiki';
  } else if (['commit', 'pr', 'repo'].includes(contrib.type)) {
    return 'code';
  } else if (['review', 'issue', 'comment'].includes(contrib.type)) {
    return 'talk';
  } else if (contrib.ecosystem === 'github') {
    // Fallback for other GitHub events not explicitly handled
    return 'code';
  }

  return 'other';
}

function renderContribution(contrib) {
  const ecosystem = contrib.ecosystem || 'other';
  const type = classifyType(contrib);
  // Use contrib-specific icon if available, otherwise fall back to ecosystem default
  const iconDomain = contrib.icon || ECOSYSTEM_ICONS[ecosystem] || 'example.com';
  const iconUrl = `https://icons.duckduckgo.com/ip3/${iconDomain}.ico`;
  const title = escapeHtml(contrib.title);
  const date = formatDate(contrib.date);
  const project = escapeHtml(contrib.project);

  return `<li data-ecosystem="${ecosystem}" data-type="${type}">
    <time datetime="${contrib.date}">${date}</time>
    <img class="icon" src="${iconUrl}" alt="" width="16" height="16" />
    <a href="${escapeHtml(contrib.url)}" target="_blank" rel="noopener">${title}</a>
    <small class="project">${project}</small>
  </li>`;
}

function generateHTML(contributions) {
  // Group by year
  const byYear = {};
  const counts = { ecosystem: {}, type: {} };

  for (const c of contributions) {
    const year = new Date(c.date).getFullYear();
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(c);

    const ecosystem = c.ecosystem || 'other';
    const type = classifyType(c);
    counts.ecosystem[ecosystem] = (counts.ecosystem[ecosystem] || 0) + 1;
    counts.type[type] = (counts.type[type] || 0) + 1;
  }

  const years = Object.keys(byYear).sort((a, b) => b - a);

  // Generate filters
  const ecosystemFilters = Object.entries(ECOSYSTEMS).map(([id, info]) => {
    return `<label><input type="checkbox" name="ecosystem" value="${id}" checked="checked" /> ${info.label}</label>`;
  }).join('\n        ');

  const typeFilters = Object.entries(TYPES).map(([id, info]) => {
    return `<label><input type="checkbox" name="type" value="${id}" checked="checked" /> ${info.label}</label>`;
  }).join('\n        ');

  // Generate year sections
  const yearSections = years.map(year => {
    const items = byYear[year].map(renderContribution).join('\n      ');
    return `<section id="year-${year}">
    <h2>${year} <small>(${byYear[year].length})</small></h2>
    <ul class="timeline">
      ${items}
    </ul>
  </section>`;
  }).join('\n\n  ');

  // Generate footer counts
  const ecoCounts = Object.entries(ECOSYSTEMS).map(([id, info]) => `${counts.ecosystem[id] || 0} ${info.label}`).join(', ');
  const typeCounts = Object.entries(TYPES).map(([id, info]) => `${counts.type[id] || 0} ${info.label}`).join(', ');

  const generated = new Date().toISOString();

  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Waldir's Open Contributions</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <header>
    <h1>Waldir's Open Contributions</h1>
    <p class="subtitle">Small contributions add up over time.</p>

    <div class="filter-group">
      <strong>Ecosystem:</strong>
      <div class="filters">
        ${ecosystemFilters}
      </div>
    </div>

    <div class="filter-group">
      <strong>Type:</strong>
      <div class="filters">
        ${typeFilters}
      </div>
    </div>

    <nav class="year-nav">
      <strong>Jump to:</strong>
      ${years.map(y => `<a href="#year-${y}">${y}</a>`).join(' ')}
    </nav>
  </header>

  <main>
  ${yearSections}
  </main>

  <footer>
    <p>Total: ${contributions.length} contributions</p>
    <p>By Ecosystem: ${ecoCounts}</p>
    <p>By Type: ${typeCounts}</p>
    <p>Last updated: ${new Date(generated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
    <p><a href="https://github.com/waldyrious/contributions-timeline">Source code</a></p>
  </footer>
</body>
</html>`;
}

function main() {
  const contributions = loadTSV('timeline.tsv');
  const html = generateHTML(contributions);

  if (!fs.existsSync(SITE_DIR)) {
    fs.mkdirSync(SITE_DIR, { recursive: true });
  }

  const outPath = path.join(SITE_DIR, 'index.xhtml');
  fs.writeFileSync(outPath, html);
  console.error(`Generated ${outPath} (${contributions.length} contributions)`);
}

main();
