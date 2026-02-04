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

## Running the project locally

1. Run `make` to fetch fresh data and build the site.
2. Open the resulting `site/index.xhtml` file in a browser.

## Limitations

- GitHub Events API only returns last 90 days (~300 events)
- For full historical data, would need GraphQL `contributionsCollection`
- Currently fetches last 50-100 items per source for MVP

## License

[ISC](LICENSE.md)
