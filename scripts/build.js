#!/usr/bin/env node
// Generate static HTML from TSV timeline data

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SITE_DIR = path.join(__dirname, '..', 'site');

const PLATFORM_INFO = {
  github: { icon: 'github.com', name: 'GitHub' },
  wikimedia: { icon: 'wikipedia.org', name: 'Wikimedia' },
  osm: { icon: 'openstreetmap.org', name: 'OpenStreetMap' },
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

function renderContribution(contrib) {
  const platform = PLATFORM_INFO[contrib.platform];
  const iconUrl = `https://icons.duckduckgo.com/ip3/${platform?.icon || 'example.com'}.ico`;
  const title = escapeHtml(contrib.title);
  const date = formatDate(contrib.date);
  const source = escapeHtml(contrib.source);

  return `<li data-platform="${contrib.platform}">
    <time datetime="${contrib.date}">${date}</time>
    <img class="icon" src="${iconUrl}" alt="" width="16" height="16" />
    <a href="${escapeHtml(contrib.url)}" target="_blank" rel="noopener">${title}</a>
    <small class="source">${source}</small>
  </li>`;
}

function generateHTML(contributions) {
  // Group by year
  const byYear = {};
  const counts = { github: 0, wikimedia: 0, osm: 0 };

  for (const c of contributions) {
    const year = new Date(c.date).getFullYear();
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(c);
    counts[c.platform] = (counts[c.platform] || 0) + 1;
  }

  const years = Object.keys(byYear).sort((a, b) => b - a);

  // Generate year navigation
  const yearNav = years.map(y => `<a href="#year-${y}">${y}</a>`).join(' ');

  // Generate filter checkboxes
  const platformFilters = Object.entries(PLATFORM_INFO).map(([id, info]) => {
    const iconUrl = `https://icons.duckduckgo.com/ip3/${info.icon}.ico`;
    return `<label><input type="checkbox" name="platform" value="${id}" checked="checked" /> <img src="${iconUrl}" alt="" width="16" height="16" /> ${info.name}</label>`;
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

    <div class="filters">
      <strong>Show:</strong>
      ${platformFilters}
    </div>

    <nav class="year-nav">
      <strong>Jump to:</strong>
      ${yearNav}
    </nav>
  </header>

  <main>
  ${yearSections}
  </main>

  <footer>
    <p>Total: ${contributions.length} contributions
       (${counts.github} GitHub,
        ${counts.wikimedia} Wikimedia,
        ${counts.osm} OSM)</p>
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
