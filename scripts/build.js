#!/usr/bin/env node
// Generate static HTML from TSV timeline data

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SITE_DIR = path.join(__dirname, '..', 'site');

const PLATFORM_INFO = {
  github: { icon: 'github.com', name: 'GitHub' },
  wikipedia: { icon: 'wikipedia.org', name: 'Wikipedia' },
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
    <img class="icon" src="${iconUrl}" alt="" width="16" height="16">
    <a href="${escapeHtml(contrib.url)}" target="_blank" rel="noopener">${title}</a>
    <small class="source">${source}</small>
  </li>`;
}

function generateHTML(contributions) {
  // Group by year
  const byYear = {};
  const counts = { github: 0, wikipedia: 0, osm: 0 };
  
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
    return `<label><input type="checkbox" name="platform" value="${id}" checked> <img src="${iconUrl}" alt="" width="16" height="16"> ${info.name}</label>`;
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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Waldir's Open Contributions</title>
  <style>
    :root {
      --bg: #fafafa;
      --fg: #222;
      --muted: #666;
      --border: #ddd;
      --link: #0066cc;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1a1a1a;
        --fg: #eee;
        --muted: #999;
        --border: #444;
        --link: #6699ff;
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 1rem;
      background: var(--bg);
      color: var(--fg);
    }
    header {
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
    h1 { margin: 0 0 0.5rem; }
    .subtitle { color: var(--muted); margin: 0; }
    
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin: 1rem 0;
      padding: 1rem;
      background: var(--border);
      border-radius: 4px;
    }
    .filters label {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      cursor: pointer;
    }
    
    .year-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .year-nav a {
      padding: 0.25rem 0.5rem;
      background: var(--border);
      border-radius: 4px;
      text-decoration: none;
      color: var(--fg);
    }
    .year-nav a:hover {
      background: var(--link);
      color: white;
    }
    
    section { margin-bottom: 2rem; }
    h2 {
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.5rem;
    }
    h2 small { color: var(--muted); font-weight: normal; }
    
    .timeline {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .timeline li {
      display: grid;
      grid-template-columns: 100px auto 1fr auto;
      gap: 0.5rem;
      align-items: baseline;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border);
      transition: opacity 0.2s ease, max-height 0.2s ease;
      max-height: 100px;
      overflow: hidden;
    }
    .timeline li:last-child { border-bottom: none; }
    .timeline time {
      color: var(--muted);
      font-size: 0.9em;
    }
    .timeline .icon { 
      width: 16px;
      height: 16px;
      vertical-align: middle;
    }
    @media (prefers-color-scheme: dark) {
      [data-platform="github"] .icon,
      label:has([value="github"]) img {
        filter: invert(1);
      }
    }
    .timeline a {
      color: var(--link);
      text-decoration: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .timeline a:hover { text-decoration: underline; }
    .timeline .source {
      color: var(--muted);
      font-size: 0.85em;
      text-align: right;
    }
    
    /* CSS-only filtering using :has() */
    body:has([name="platform"][value="github"]:not(:checked)) [data-platform="github"],
    body:has([name="platform"][value="wikipedia"]:not(:checked)) [data-platform="wikipedia"],
    body:has([name="platform"][value="osm"]:not(:checked)) [data-platform="osm"] {
      opacity: 0;
      max-height: 0;
      padding: 0;
      border: none;
    }
    
    footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-size: 0.9em;
    }
    
    @media (max-width: 600px) {
      .timeline li {
        grid-template-columns: 1fr;
        gap: 0.25rem;
      }
      .timeline .source { text-align: left; }
    }
  </style>
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
        ${counts.wikipedia} Wikipedia, 
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
  
  const outPath = path.join(SITE_DIR, 'index.html');
  fs.writeFileSync(outPath, html);
  console.error(`Generated ${outPath} (${contributions.length} contributions)`);
}

main();
