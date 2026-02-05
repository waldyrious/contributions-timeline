#!/usr/bin/env node
// Merge TSV files from all sources into a single timeline

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function loadTSV(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.error(`Warning: ${filename} not found`);
    return [];
  }
  const lines = fs.readFileSync(filepath, 'utf-8').trim().split('\n');
  if (lines.length < 2) return [];

  // Skip header, parse rows
  return lines.slice(1).map(line => line.split('\t'));
}

function main() {
  const github = loadTSV('github.tsv');
  const wikis = loadTSV('wikis.tsv');
  const osm = loadTSV('osm.tsv');

  console.error(`Loaded: ${github.length} GitHub, ${wikis.length} Wikis, ${osm.length} OSM`);

  const all = [...github, ...wikis, ...osm];

  // Sort by date descending (date is column 3)
  all.sort((a, b) => new Date(b[3]) - new Date(a[3]));

  // Output TSV with header
  console.log(['id', 'ecosystem', 'type', 'date', 'title', 'url', 'project', 'icon'].join('\t'));
  for (const row of all) {
    console.log(row.join('\t'));
  }

  console.error(`Total: ${all.length} contributions`);
}

main();
