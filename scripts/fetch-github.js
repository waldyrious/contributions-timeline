#!/usr/bin/env node
// Fetch GitHub contributions using the GraphQL API
// Output: TSV (id, platform, type, date, title, url, source)

const USERNAME = 'waldyrious';
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error('Error: GITHUB_TOKEN environment variable is required');
  console.error('Set it in .env file or export it in your shell');
  process.exit(1);
}

async function graphql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'contributions-timeline',
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await res.json();
  if (data.errors) {
    console.error('GraphQL errors:', JSON.stringify(data.errors, null, 2));
  }
  return data;
}

async function fetchPullRequests(username, limit = 100) {
  console.error('Fetching pull requests...');
  const query = `
    query($username: String!, $limit: Int!, $cursor: String) {
      user(login: $username) {
        pullRequests(first: $limit, after: $cursor, orderBy: {field: CREATED_AT, direction: DESC}) {
          pageInfo { hasNextPage endCursor }
          nodes {
            number
            title
            url
            createdAt
            repository { nameWithOwner }
          }
        }
      }
    }
  `;

  const rows = [];
  let cursor = null;
  let page = 0;

  do {
    const data = await graphql(query, { username, limit, cursor });
    const prs = data.data?.user?.pullRequests;
    if (!prs) break;

    for (const pr of prs.nodes) {
      rows.push([
        `github-pr-${pr.repository.nameWithOwner}-${pr.number}`,
        'github',
        'pr',
        pr.createdAt,
        `Opened PR: ${pr.title}`,
        pr.url,
        pr.repository.nameWithOwner,
      ]);
    }

    cursor = prs.pageInfo.hasNextPage ? prs.pageInfo.endCursor : null;
    page++;
    console.error(`  Page ${page}: ${prs.nodes.length} PRs (total: ${rows.length})`);
  } while (cursor && page < 5); // Limit pages to avoid too many requests

  return rows;
}

async function fetchIssues(username, limit = 100) {
  console.error('Fetching issues...');
  const query = `
    query($username: String!, $limit: Int!, $cursor: String) {
      user(login: $username) {
        issues(first: $limit, after: $cursor, orderBy: {field: CREATED_AT, direction: DESC}) {
          pageInfo { hasNextPage endCursor }
          nodes {
            number
            title
            url
            createdAt
            repository { nameWithOwner }
          }
        }
      }
    }
  `;

  const rows = [];
  let cursor = null;
  let page = 0;

  do {
    const data = await graphql(query, { username, limit, cursor });
    const issues = data.data?.user?.issues;
    if (!issues) break;

    for (const issue of issues.nodes) {
      rows.push([
        `github-issue-${issue.repository.nameWithOwner}-${issue.number}`,
        'github',
        'issue',
        issue.createdAt,
        `Opened issue: ${issue.title}`,
        issue.url,
        issue.repository.nameWithOwner,
      ]);
    }

    cursor = issues.pageInfo.hasNextPage ? issues.pageInfo.endCursor : null;
    page++;
    console.error(`  Page ${page}: ${issues.nodes.length} issues (total: ${rows.length})`);
  } while (cursor && page < 5);

  return rows;
}

async function fetchPullRequestReviews(username, limit = 100) {
  console.error('Fetching PR reviews...');
  // Use contributionsCollection to get reviews
  const query = `
    query($username: String!, $limit: Int!, $cursor: String) {
      user(login: $username) {
        contributionsCollection {
          pullRequestReviewContributions(first: $limit, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes {
              occurredAt
              pullRequestReview {
                url
                pullRequest {
                  number
                  title
                  repository { nameWithOwner }
                }
              }
            }
          }
        }
      }
    }
  `;

  const rows = [];
  let cursor = null;
  let page = 0;

  do {
    const data = await graphql(query, { username, limit, cursor });
    const reviews = data.data?.user?.contributionsCollection?.pullRequestReviewContributions;
    if (!reviews) break;

    for (const contrib of reviews.nodes) {
      const review = contrib.pullRequestReview;
      if (!review) continue;
      const pr = review.pullRequest;
      rows.push([
        `github-review-${pr.repository.nameWithOwner}-${pr.number}-${contrib.occurredAt}`,
        'github',
        'review',
        contrib.occurredAt,
        `Reviewed PR: ${pr.title}`,
        review.url,
        pr.repository.nameWithOwner,
      ]);
    }

    cursor = reviews.pageInfo.hasNextPage ? reviews.pageInfo.endCursor : null;
    page++;
    console.error(`  Page ${page}: ${reviews.nodes.length} reviews (total: ${rows.length})`);
  } while (cursor && page < 5);

  return rows;
}

async function fetchIssueComments(username, limit = 100) {
  console.error('Fetching issue comments...');
  const query = `
    query($username: String!, $limit: Int!, $cursor: String) {
      user(login: $username) {
        issueComments(first: $limit, after: $cursor, orderBy: {field: UPDATED_AT, direction: DESC}) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            url
            createdAt
            issue {
              number
              title
              repository { nameWithOwner }
            }
          }
        }
      }
    }
  `;

  const rows = [];
  let cursor = null;
  let page = 0;

  do {
    const data = await graphql(query, { username, limit, cursor });
    const comments = data.data?.user?.issueComments;
    if (!comments) break;

    for (const comment of comments.nodes) {
      const issue = comment.issue;
      rows.push([
        `github-comment-${comment.id}`,
        'github',
        'comment',
        comment.createdAt,
        `Commented on: ${issue.title}`,
        comment.url,
        issue.repository.nameWithOwner,
      ]);
    }

    cursor = comments.pageInfo.hasNextPage ? comments.pageInfo.endCursor : null;
    page++;
    console.error(`  Page ${page}: ${comments.nodes.length} comments (total: ${rows.length})`);
  } while (cursor && page < 3); // Fewer pages for comments (there can be many)

  return rows;
}

async function fetchCommits(username, limit = 30) {
  console.error('Fetching recent commits via Events API...');
  // GraphQL doesn't easily expose all commits across repos
  // Use REST Events API for recent commits (it's good enough for this)
  const rows = [];
  
  for (let page = 1; page <= 3; page++) {
    const url = `https://api.github.com/users/${username}/events/public?per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'User-Agent': 'contributions-timeline',
      },
    });
    
    if (!res.ok) break;
    const events = await res.json();
    if (events.length === 0) break;

    for (const event of events) {
      if (event.type === 'PushEvent') {
        for (const commit of event.payload.commits || []) {
          rows.push([
            `github-commit-${commit.sha.slice(0, 7)}`,
            'github',
            'commit',
            event.created_at,
            commit.message.split('\n')[0],
            `https://github.com/${event.repo.name}/commit/${commit.sha}`,
            event.repo.name,
          ]);
        }
      }
    }
    console.error(`  Page ${page}: ${events.length} events`);
  }
  
  console.error(`  Total: ${rows.length} commits`);
  return rows;
}

async function fetchRepositoriesCreated(username, limit = 100) {
  console.error('Fetching repositories created...');
  const query = `
    query($username: String!, $limit: Int!, $cursor: String) {
      user(login: $username) {
        repositories(first: $limit, after: $cursor, ownerAffiliations: OWNER, orderBy: {field: CREATED_AT, direction: DESC}) {
          pageInfo { hasNextPage endCursor }
          nodes {
            name
            nameWithOwner
            url
            createdAt
            isFork
          }
        }
      }
    }
  `;

  const rows = [];
  let cursor = null;
  let page = 0;

  do {
    const data = await graphql(query, { username, limit, cursor });
    const repos = data.data?.user?.repositories;
    if (!repos) break;

    for (const repo of repos.nodes) {
      if (repo.isFork) continue; // Skip forks
      rows.push([
        `github-repo-${repo.nameWithOwner}`,
        'github',
        'repo',
        repo.createdAt,
        `Created repository: ${repo.name}`,
        repo.url,
        repo.nameWithOwner,
      ]);
    }

    cursor = repos.pageInfo.hasNextPage ? repos.pageInfo.endCursor : null;
    page++;
    console.error(`  Page ${page}: ${repos.nodes.length} repos (total: ${rows.length})`);
  } while (cursor && page < 5);

  return rows;
}

function escapeField(str) {
  return String(str).replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '');
}

async function main() {
  const [prs, issues, reviews, comments, commits, repos] = await Promise.all([
    fetchPullRequests(USERNAME),
    fetchIssues(USERNAME),
    fetchPullRequestReviews(USERNAME),
    fetchIssueComments(USERNAME),
    fetchCommits(USERNAME),
    fetchRepositoriesCreated(USERNAME),
  ]);

  const rows = [...prs, ...issues, ...reviews, ...comments, ...commits, ...repos];

  // Sort by date descending
  rows.sort((a, b) => new Date(b[3]) - new Date(a[3]));

  // Output TSV
  console.log(['id', 'platform', 'type', 'date', 'title', 'url', 'source'].join('\t'));
  for (const row of rows) {
    console.log(row.map(escapeField).join('\t'));
  }

  console.error(`\nTotal: ${rows.length} contributions`);
}

main();
