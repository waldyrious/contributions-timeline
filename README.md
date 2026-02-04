# Contributions Timeline

A static site showing my open contributions across GitHub, Wikimedia, and OpenStreetMap.

**Live site:** https://waldyrious.github.io/contributions-timeline/

## Data sources

- **GitHub**: commits, issues, PRs, reviews, comments
- **Wikis**: edits across Wikimedia wikis (Wikipedia, Wikidata, etc.) and other wikis (Translatewiki.net, Fandom, etc.)
- **OpenStreetMap**: changesets, OSM wiki edits

## How it works

1. Node.js scripts fetch data from each platform's API and combime them into a unified timeline
2. Another script transforms the raw data into a static HTML page (with togglable filters)
3. A GitHub Actions workflow runs these scripts daily and publishes the result via GitHub Pages

## Running the project locally

1. Create a GitHub Personal Access Token (PAT):
   - Go to https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Select scopes: `read:user` and `public_repo`
   - Copy the generated token

2. Create a `.env` file in the project root, with the following content:
   ```
   GITHUB_TOKEN=your_token_here
   ```

3. Run `make` to fetch fresh data and build the site.

4. Open the resulting `site/index.xhtml` file in a browser.

### Publishing via GitHub Actions

If you fork this repo and want to deploy your own version:

1. Create a PAT as described above
2. In your repo, navigate to Settings → Secrets and variables → Actions
3. Create a new repository secret named `GH_TOKEN` with your token
   (Note: `GITHUB_TOKEN` is reserved by GitHub Actions)

## Limitations

- GitHub data is fetched via GraphQL API with pagination limits (500 items per type)
- Commits are fetched via Events API (last 90 days only)
- Wiki/OSM data fetches last 50 items per source

## License

[ISC](LICENSE.md)
