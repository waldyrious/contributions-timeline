.DEFAULT_GOAL := site/index.xhtml

# Fetch GitHub data
data/github.tsv:
	@echo "Fetching GitHub data..."
	node scripts/fetch-github.js > data/github.tsv

# Fetch Wikimedia data
data/wikimedia.tsv:
	@echo "Fetching Wikimedia data..."
	node scripts/fetch-wikimedia.js > data/wikimedia.tsv

# Fetch OSM data
data/osm.tsv:
	@echo "Fetching OSM data..."
	node scripts/fetch-osm.js > data/osm.tsv

# Build the combined timeline, which depends on the individual data files
data/timeline.tsv: data/github.tsv data/wikimedia.tsv data/osm.tsv
	@echo "Merging timeline data..."
	node scripts/merge.js > data/timeline.tsv

# Build the site, which depends on the combined timeline data file
site/index.xhtml: data/timeline.tsv
	@echo "Building the site..."
	node scripts/build.js
