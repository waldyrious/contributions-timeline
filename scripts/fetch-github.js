#!/usr/bin/env node
// Fetch GitHub contributions using the GraphQL API
// Output: TSV (id, ecosystem, type, date, title, url, project)

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

  if (!res.ok) {
    console.error(`GraphQL request failed: ${res.status} ${res.statusText}`);
    return { data: null };
  }

  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (data.errors) {
      console.error('GraphQL errors:', JSON.stringify(data.errors, null, 2));
    }
    return data;
  } catch (e) {
    console.error('Failed to parse GraphQL response:', text.slice(0, 200));
    return { data: null };
  }
}

async function fetchPullRequests(username, limit = 100) {
  console.error('Fetching pull requests...');
  const query = `
    query($username: String!, $limit: Int!) {
      user(login: $username) {
        pullRequests(first: $limit, orderBy: {field: CREATED_AT, direction: DESC}) {
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

  const data = await graphql(query, { username, limit });
  const prs = data.data?.user?.pullRequests?.nodes || [];
  console.error(`  Got ${prs.length} PRs`);

  return prs.map(pr => [
    `github-pr-${pr.repository.nameWithOwner}-${pr.number}`,
    'github',
    'pr',
    pr.createdAt,
    `Opened PR: ${pr.title}`,
    pr.url,
    pr.repository.nameWithOwner,
  ]);
}

async function fetchIssues(username, limit = 100) {
  console.error('Fetching issues...');
  const query = `
    query($username: String!, $limit: Int!) {
      user(login: $username) {
        issues(first: $limit, orderBy: {field: CREATED_AT, direction: DESC}) {
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

  const data = await graphql(query, { username, limit });
  const issues = data.data?.user?.issues?.nodes || [];
  console.error(`  Got ${issues.length} issues`);

  return issues.map(issue => [
    `github-issue-${issue.repository.nameWithOwner}-${issue.number}`,
    'github',
    'issue',
    issue.createdAt,
    `Opened issue: ${issue.title}`,
    issue.url,
    issue.repository.nameWithOwner,
  ]);
}

async function fetchPullRequestReviews(username, limit = 100) {
  console.error('Fetching PR reviews...');
  const query = `
    query($username: String!, $limit: Int!) {
      user(login: $username) {
        contributionsCollection {
          pullRequestReviewContributions(first: $limit) {
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

  const data = await graphql(query, { username, limit });
  const contribs = data.data?.user?.contributionsCollection?.pullRequestReviewContributions?.nodes || [];
  console.error(`  Got ${contribs.length} reviews`);

  return contribs
    .filter(contrib => contrib.pullRequestReview)
    .map(contrib => {
      const review = contrib.pullRequestReview;
      const pr = review.pullRequest;
      return [
        `github-review-${pr.repository.nameWithOwner}-${pr.number}-${contrib.occurredAt}`,
        'github',
        'review',
        contrib.occurredAt,
        `Reviewed PR: ${pr.title}`,
        review.url,
        pr.repository.nameWithOwner,
      ];
    });
}

async function fetchIssueComments(username, limit = 100) {
  console.error('Fetching issue comments...');
  const query = `
    query($username: String!, $limit: Int!) {
      user(login: $username) {
        issueComments(first: $limit, orderBy: {field: UPDATED_AT, direction: DESC}) {
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

  const data = await graphql(query, { username, limit });
  const comments = data.data?.user?.issueComments?.nodes || [];
  console.error(`  Got ${comments.length} comments`);

  return comments.map(comment => [
    `github-comment-${comment.id}`,
    'github',
    'comment',
    comment.createdAt,
    `Commented on: ${comment.issue.title}`,
    comment.url,
    comment.issue.repository.nameWithOwner,
  ]);
}

async function fetchCommits(username, limit = 20) {
  console.error('Fetching recent commits...');

  const rows = [];

  // Get recently pushed repos and user ID
  const repoQuery = `
    query($username: String!) {
      user(login: $username) {
        id
        repositories(first: 10, ownerAffiliations: OWNER, orderBy: {field: PUSHED_AT, direction: DESC}) {
          nodes { nameWithOwner }
        }
      }
    }
  `;

  const repoData = await graphql(repoQuery, { username });
  const userId = repoData.data?.user?.id;
  const repoNames = repoData.data?.user?.repositories?.nodes?.map(repo => repo.nameWithOwner) || [];

  if (!userId || repoNames.length === 0) {
    console.error('  Could not get user data');
    return [];
  }

  // Fetch recent commits from each repo
  for (const repoFullName of repoNames.slice(0, 10)) { // Limit to 10 repos
    const [owner, name] = repoFullName.split('/');
    const commitQuery = `
      query($owner: String!, $name: String!, $authorId: ID!, $limit: Int!) {
        repository(owner: $owner, name: $name) {
          defaultBranchRef {
            target {
              ... on Commit {
                history(first: $limit, author: {id: $authorId}) {
                  nodes {
                    oid
                    message
                    committedDate
                    url
                  }
                }
              }
            }
          }
        }
      }
    `;

    const data = await graphql(commitQuery, { owner, name, authorId: userId, limit });
    const commits = data.data?.repository?.defaultBranchRef?.target?.history?.nodes || [];

    for (const commit of commits) {
      rows.push([
        `github-commit-${commit.oid.slice(0, 7)}`,
        'github',
        'commit',
        commit.committedDate,
        commit.message.split('\n')[0],
        commit.url,
        repoFullName,
      ]);
    }

    if (commits.length > 0) {
      console.error(`  ${repoFullName}: ${commits.length} commits`);
    }
  }

  console.error(`  Total: ${rows.length} commits`);
  return rows;
}

async function fetchRepositoriesCreated(username, limit = 100) {
  console.error('Fetching repositories created...');
  const query = `
    query($username: String!, $limit: Int!) {
      user(login: $username) {
        repositories(first: $limit, ownerAffiliations: OWNER, orderBy: {field: CREATED_AT, direction: DESC}) {
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

  const data = await graphql(query, { username, limit });
  const repos = data.data?.user?.repositories?.nodes || [];
  const nonForks = repos.filter(repo => !repo.isFork);
  console.error(`  Got ${nonForks.length} repos (${repos.length - nonForks.length} forks skipped)`);

  return nonForks.map(repo => [
    `github-repo-${repo.nameWithOwner}`,
    'github',
    'repo',
    repo.createdAt,
    `Created repository: ${repo.name}`,
    repo.url,
    repo.nameWithOwner,
  ]);
}

function escapeField(str) {
  return String(str).replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '');
}

async function main() {
  // Run sequentially to avoid rate limits
  const prs = await fetchPullRequests(USERNAME);
  const issues = await fetchIssues(USERNAME);
  const reviews = await fetchPullRequestReviews(USERNAME);
  const comments = await fetchIssueComments(USERNAME);
  const commits = await fetchCommits(USERNAME);
  const repos = await fetchRepositoriesCreated(USERNAME);

  const rows = [...prs, ...issues, ...reviews, ...comments, ...commits, ...repos];

  // Sort by date descending
  rows.sort((a, b) => new Date(b[3]) - new Date(a[3]));

  // Output TSV
  console.log(['id', 'ecosystem', 'type', 'date', 'title', 'url', 'project'].join('\t'));
  for (const row of rows) {
    console.log(row.map(escapeField).join('\t'));
  }

  console.error(`\nTotal: ${rows.length} contributions`);
}

main();
