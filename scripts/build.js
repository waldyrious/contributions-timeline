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
};

const ECOSYSTEMS = {
  wikimedia: { label: 'Wikimedia' },
  osm: { label: 'OpenStreetMap' },
  github: { label: 'GitHub' },
  otherwikis: { label: 'Other wikis' },
};

const TYPES = {
  wiki: { label: 'Wiki edits', icon: '✏️' },
  code: { label: 'Code', icon: '🖥️' },
  talk: { label: 'Discussion', icon: '💬' },
  map: { label: 'Map edits', icon: '🌎️' },
  i18n: { label: 'Translation', icon: '🔠' },
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function formatWeek(isoDate) {
  const d = new Date(isoDate);
  const week = getISOWeek(d).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `W${week} ${year}`;
}

function formatFullTimestamp(isoDate) {
  const d = new Date(isoDate);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  const secs = d.getSeconds().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
}

function getMonthKey(isoDate) {
  const d = new Date(isoDate);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

function formatMonthHeader(monthKey) {
  const [year, month] = monthKey.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  const monthName = d.toLocaleDateString('en-US', { month: 'short' });
  return `${monthName} ${year}`;
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

// Classify a wiki edit based on its page title
function classifyWikiEdit(contrib) {
  const LANG_SUBPAGE = /\/[a-z]{2,3}(-[a-z0-9]{2,6})?$/;
  const DOC_SUBPAGE = /\/(doc(umentation)?|qqq)$/i;
  const CODE_PAGE = /^(Template|Module|MediaWiki):|\.(css|js|json)$/;
  const TALK_PAGE = /([ _]|^)[Tt]alk:/;

  const title = contrib.title || '';

  if (title.match(TALK_PAGE)) return 'talk';
  if (contrib.project === 'translatewiki.net') {
    if (title.match(LANG_SUBPAGE) && !(title.match(DOC_SUBPAGE))) return 'i18n';
  }
  if (title.match(CODE_PAGE) && !(title.match(DOC_SUBPAGE))) return 'code';
  return 'wiki';
}

function classifyType(contrib) {
  switch (contrib.ecosystem) {
    case 'github':
      return contrib.type.match(/review|issue|comment/) ? 'talk' : 'code';

    case 'osm':
      return contrib.type === 'changeset' ? 'map' : classifyWikiEdit(contrib);

    default: // assume the remaining contributions are wikis
      return classifyWikiEdit(contrib);
  }
}

function renderContribution(contrib) {
  const ecosystem = contrib.ecosystem || 'otherwikis';
  const type = classifyType(contrib);
  const typeInfo = TYPES[type] || { icon: '❓' };
  // Use contrib-specific icon if available, otherwise fall back to ecosystem default
  const iconDomain = contrib.icon || ECOSYSTEM_ICONS[ecosystem] || 'example.com';
  const iconUrl = `https://icons.duckduckgo.com/ip3/${iconDomain}.ico`;
  const title = escapeHtml(contrib.title);
  const dateDisplay = formatWeek(contrib.date);
  const fullTimestamp = formatFullTimestamp(contrib.date);
  const project = escapeHtml(contrib.project);

  return `<tr data-ecosystem="${ecosystem}" data-type="${type}">
    <td class="date"><time datetime="${contrib.date}" title="${fullTimestamp}">${dateDisplay}</time></td>
    <td class="project"><img class="icon" src="${iconUrl}" alt="" width="16" height="16" />${project}</td>
    <td class="contribution"><span class="type-icon">${typeInfo.icon}</span><a href="${escapeHtml(contrib.url)}" target="_blank" rel="noopener">${title}</a></td>
  </tr>`;
}

function generateHTML(contributions) {
  // Filter to last 3 years
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const recentContribs = contributions.filter(c => new Date(c.date) >= threeYearsAgo);

  // Group by month
  const byMonth = {};
  const counts = { ecosystem: {}, type: {} };

  for (const c of recentContribs) {
    const monthKey = getMonthKey(c.date);
    if (!byMonth[monthKey]) byMonth[monthKey] = [];
    byMonth[monthKey].push(c);

    const ecosystem = c.ecosystem || 'otherwikis';
    const type = classifyType(c);
    counts.ecosystem[ecosystem] = (counts.ecosystem[ecosystem] || 0) + 1;
    counts.type[type] = (counts.type[type] || 0) + 1;
  }

  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  // Generate filters as table cells
  const ecosystemFilters = Object.entries(ECOSYSTEMS).map(([id, info]) => {
    return `<td><label><input type="checkbox" name="ecosystem" value="${id}" checked="checked" /> ${info.label}</label></td>`;
  }).join('\n          ');

  const typeFilters = Object.entries(TYPES).map(([id, info]) => {
    return `<td data-type="${id}"><label><input type="checkbox" name="type" value="${id}" checked="checked" /> <span class="type-icon">${info.icon}</span> ${info.label}</label></td>`;
  }).join('\n          ');

  // Generate month sections as table row groups
  const monthSections = months.map((monthKey, index) => {
    const rows = byMonth[monthKey].map(renderContribution).join('\n        ');
    const header = formatMonthHeader(monthKey);
    const prevMonth = index > 0 ? months[index - 1] : null;
    const nextMonth = index < months.length - 1 ? months[index + 1] : null;
    const upLink = prevMonth ? `<a href="#month-${prevMonth}" class="nav-arrow" title="Previous month">↑</a>` : `<span class="nav-arrow disabled">↑</span>`;
    const downLink = nextMonth ? `<a href="#month-${nextMonth}" class="nav-arrow" title="Next month">↓</a>` : `<span class="nav-arrow disabled">↓</span>`;
    return `<tbody id="month-${monthKey}">
        <tr class="month-header">
          <th colspan="3">${upLink} ${header} <small>(${byMonth[monthKey].length})</small> ${downLink} <a href="#" class="nav-top">top</a></th>
        </tr>
        ${rows}
      </tbody>`;
  }).join('\n      ');

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
      <table class="filters">
        <tr>
          ${ecosystemFilters}
        </tr>
      </table>
    </div>

    <div class="filter-group">
      <strong>Type:</strong>
      <table class="filters filters-type">
        <tr>
          ${typeFilters}
        </tr>
      </table>
    </div>

  </header>

  <main>
    <table class="timeline">
      ${monthSections}
    </table>
  </main>

  <footer>
    <p>Total: ${recentContribs.length} contributions (last 3 years)</p>
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
