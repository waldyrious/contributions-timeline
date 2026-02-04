.DEFAULT_GOAL := site/index.xhtml

# Fetch GitHub data
data/github.tsv: scripts/fetch-github.js
	@echo "Fetching GitHub data..."
	node scripts/fetch-github.js > data/github.tsv

# Fetch data from MediaWiki-based wikis (Wikimedia, OSM Wiki, Fandom, etc.)
data/wikis.tsv: scripts/fetch-wikis.js
	@echo "Fetching data from MediaWiki-based wikis..."
	node scripts/fetch-wikis.js > data/wikis.tsv

# Fetch OSM data
data/osm.tsv: scripts/fetch-osm.js
	@echo "Fetching OSM data..."
	node scripts/fetch-osm.js > data/osm.tsv

# Build the combined timeline, which depends on the individual data files and the merge script
data/timeline.tsv: data/github.tsv data/wikis.tsv data/osm.tsv scripts/merge.js
	@echo "Merging timeline data..."
	node scripts/merge.js > data/timeline.tsv

# Build the site, which depends on the combined timeline data file and the build script
site/index.xhtml: data/timeline.tsv scripts/build.js
	@echo "Building the site..."
	node scripts/build.js
