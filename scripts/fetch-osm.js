#!/usr/bin/env node
// Fetch OpenStreetMap contributions
// Output: TSV (id, ecosystem, type, date, title, url, source)

const USERNAME = 'waldyrious';

async function fetchChangesets(username, limit = 100) {
  const url = `https://api.openstreetmap.org/api/0.6/changesets.json?display_name=${encodeURIComponent(username)}&limit=${limit}`;
  console.error(`Fetching OSM changesets...`);
  
  const res = await fetch(url, {
    headers: { 'User-Agent': 'contributions-timeline' }
  });
  
  if (!res.ok) {
    console.error(`Error: ${res.status} ${res.statusText}`);
    return [];
  }
  
  const data = await res.json();
  return (data.changesets || []).map(cs => [
    `osm-changeset-${cs.id}`,
    'osm',
    'changeset',
    cs.created_at,
    cs.tags?.comment || `Changeset ${cs.id}`,
    `https://www.openstreetmap.org/changeset/${cs.id}`,
    'OpenStreetMap',
  ]);
}

function escapeField(str) {
  return String(str).replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '');
}

async function main() {
  const rows = await fetchChangesets(USERNAME);
  console.error(`  Got ${rows.length} changesets`);
  
  // Sort by date descending
  rows.sort((a, b) => new Date(b[3]) - new Date(a[3]));
  
  // Output TSV
  console.log(['id', 'ecosystem', 'type', 'date', 'title', 'url', 'source'].join('\t'));
  for (const row of rows) {
    console.log(row.map(escapeField).join('\t'));
  }
}

main();
