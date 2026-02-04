#!/usr/bin/env node
// Fetch GitHub contributions using the Events API
// Output: TSV (id, platform, type, date, title, url, source)

const USERNAME = 'waldyrious';
const TOKEN = process.env.GITHUB_TOKEN;

async function fetchEvents(username, page = 1) {
  const headers = { 'User-Agent': 'contributions-timeline' };
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
  
  const url = `https://api.github.com/users/${username}/events/public?per_page=100&page=${page}`;
  console.error(`Fetching GitHub events page ${page}...`);
  
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.error(`Error: ${res.status} ${res.statusText}`);
    return [];
  }
  return res.json();
}

function eventToRows(event) {
  const repo = event.repo?.name || '';
  
  switch (event.type) {
    case 'PushEvent':
      return event.payload.commits?.map(commit => [
        `github-commit-${commit.sha.slice(0, 7)}`,
        'github',
        'commit',
        event.created_at,
        commit.message.split('\n')[0],
        `https://github.com/${event.repo.name}/commit/${commit.sha}`,
        repo,
      ]) || [];
      
    case 'IssuesEvent':
      if (event.payload.action !== 'opened') return [];
      return [[
        `github-issue-${event.payload.issue.number}`,
        'github',
        'issue',
        event.created_at,
        `Opened issue: ${event.payload.issue.title}`,
        event.payload.issue.html_url,
        repo,
      ]];
      
    case 'PullRequestEvent':
      if (event.payload.action !== 'opened') return [];
      return [[
        `github-pr-${event.payload.pull_request.number}`,
        'github',
        'pr',
        event.created_at,
        `Opened PR: ${event.payload.pull_request.title}`,
        event.payload.pull_request.html_url,
        repo,
      ]];
      
    case 'PullRequestReviewEvent':
      return [[
        `github-review-${event.payload.review.id}`,
        'github',
        'review',
        event.created_at,
        `Reviewed PR: ${event.payload.pull_request?.title || ''}`,
        event.payload.review.html_url,
        repo,
      ]];
      
    case 'IssueCommentEvent':
      return [[
        `github-comment-${event.payload.comment.id}`,
        'github',
        'comment',
        event.created_at,
        `Commented on: ${event.payload.issue.title}`,
        event.payload.comment.html_url,
        repo,
      ]];
      
    case 'CreateEvent':
      if (event.payload.ref_type === 'repository') {
        return [[
          `github-repo-${event.repo.name}`,
          'github',
          'repo',
          event.created_at,
          `Created repository: ${event.repo.name}`,
          `https://github.com/${event.repo.name}`,
          repo,
        ]];
      }
      return [];
      
    default:
      return [];
  }
}

function escapeField(str) {
  // Escape tabs and newlines in fields
  return String(str).replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '');
}

async function main() {
  const rows = [];
  
  for (let page = 1; page <= 3; page++) {
    const events = await fetchEvents(USERNAME, page);
    if (events.length === 0) break;
    
    for (const event of events) {
      rows.push(...eventToRows(event));
    }
    
    console.error(`  Got ${events.length} events, ${rows.length} contributions so far`);
    if (events.length < 100) break;
  }
  
  // Sort by date descending
  rows.sort((a, b) => new Date(b[3]) - new Date(a[3]));
  
  // Output TSV
  console.log(['id', 'platform', 'type', 'date', 'title', 'url', 'source'].join('\t'));
  for (const row of rows) {
    console.log(row.map(escapeField).join('\t'));
  }
}

main();
