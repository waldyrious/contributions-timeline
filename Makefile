.DEFAULT_GOAL := site/index.xhtml

# Fetch GitHub data
data/github.tsv:
	@echo "Fetching GitHub data..."
	node scripts/fetch-github.js > data/github.tsv

# Fetch data from MediaWiki-based wikis (Wikimedia, OSM Wiki, Fandom, etc.)
data/wikis.tsv:
	@echo "Fetching data from MediaWiki-based wikis..."
	node scripts/fetch-wikis.js > data/wikis.tsv

# Fetch OSM data
data/osm.tsv:
	@echo "Fetching OSM data..."
	node scripts/fetch-osm.js > data/osm.tsv

# Build the combined timeline, which depends on the individual data files
data/timeline.tsv: data/github.tsv data/wikis.tsv data/osm.tsv
	@echo "Merging timeline data..."
	node scripts/merge.js > data/timeline.tsv

# Build the site, which depends on the combined timeline data file
site/index.xhtml: data/timeline.tsv
	@echo "Building the site..."
	node scripts/build.js
