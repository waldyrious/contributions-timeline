# Contributions Timeline

A static site showing my open contributions across GitHub, Wikimedia, and OpenStreetMap.

**Live site:** https://waldyrious.github.io/contributions-timeline/

## Data sources

- **GitHub**: commits, issues, PRs, reviews, comments
- **Wikimedia**: edits across Commons, Wikidata, English/Portuguese Wikipedia, MediaWiki, Meta, Wiktionary, Wikisource, and Translatewiki.net
- **OpenStreetMap**: changesets

## How it works

1. Node.js scripts fetch data from each platform's API
2. Data is merged into a unified timeline
3. Static HTML (with CSS-only interactivity) is generated
4. GitHub Actions runs the scripts daily and publishes to GitHub Pages

## Local development

```bash
# Fetch fresh data
node scripts/fetch-github.js > data/github.json
node scripts/fetch-wikimedia.js > data/wikimedia.json
node scripts/fetch-osm.js > data/osm.json

# Merge and build
node scripts/merge.js > data/timeline.json
node scripts/build.js

# Preview
cd site && python3 -m http.server 8000
```

## Limitations

- GitHub Events API only returns last 90 days (~300 events)
- For full historical data, would need GraphQL `contributionsCollection`
- Currently fetches last 50-100 items per source for MVP

## License

[ISC](LICENSE.md)
