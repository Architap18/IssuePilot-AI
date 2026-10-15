/**
 * routes/github.js
 * POST /api/github-issue
 *
 * Fetches a public GitHub issue and its first 5 comments.
 * Returns a clean, structured JSON payload ready for Phase 2 AI analysis.
 *
 * No GitHub token is required for public repos (60 req/hr unauthenticated).
 * If you add a GITHUB_TOKEN environment variable the limit rises to 5,000/hr.
 */

const express = require('express')
const router = express.Router()

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse a GitHub issue URL and return { owner, repo, issueNumber }.
 * Throws a descriptive Error if the URL is not a valid GitHub issue URL.
 */
function parseGitHubIssueUrl(raw) {
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error('The URL you provided is not valid. Please check it and try again.')
  }

  if (url.hostname !== 'github.com') {
    throw new Error('Only github.com URLs are supported.')
  }

  // Expected path: /owner/repo/issues/123
  const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/issues\/(\d+)\/?$/)
  if (!match) {
    throw new Error(
      'The URL does not point to a GitHub issue. ' +
        'Expected format: https://github.com/owner/repo/issues/123',
    )
  }

  const [, owner, repo, issueNumber] = match
  return { owner, repo, issueNumber: parseInt(issueNumber, 10) }
}

/**
 * Build the Authorization header if a token is available, otherwise return
 * an empty object so the request is still sent (unauthenticated, lower limit).
 */
function authHeaders() {
  const token = process.env.GITHUB_TOKEN
  if (token) {
    return { Authorization: `Bearer ${token}` }
  }
  return {}
}

/**
 * A thin wrapper around the native fetch that:
 *  - Adds common GitHub API headers
 *  - Detects rate-limit errors
 *  - Throws descriptive errors for non-2xx responses
 */
async function githubFetch(apiUrl) {
  const res = await fetch(apiUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'IssuePilot-AI/1.0',
      ...authHeaders(),
    },
  })

  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset')
    const resetTime = reset
      ? new Date(parseInt(reset, 10) * 1000).toLocaleTimeString()
      : 'unknown'
    throw Object.assign(
      new Error(`GitHub API rate limit exceeded. Resets at ${resetTime}.`),
      { status: 429 },
    )
  }

  if (res.status === 404) {
    throw Object.assign(new Error('Issue not found. Check the URL and make sure the repo is public.'), {
      status: 404,
    })
  }

  if (!res.ok) {
    throw Object.assign(
      new Error(`GitHub API responded with status ${res.status}. Please try again later.`),
      { status: res.status },
    )
  }

  return res.json()
}

/**
 * Shape a raw GitHub issue object into only the fields the app needs.
 * This prevents leaking any sensitive data and keeps the payload small.
 */
function formatIssue(raw) {
  return {
    number: raw.number,
    title: raw.title,
    state: raw.state,
    htmlUrl: raw.html_url,
    body: raw.body || '',
    labels: (raw.labels || []).map((l) => ({
      name: l.name,
      color: l.color,
      description: l.description || null,
    })),
    author: raw.user?.login || 'unknown',
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    commentsCount: raw.comments,
  }
}

/**
 * Shape a raw GitHub comment object into only the fields the app needs.
 */
function formatComment(raw) {
  return {
    id: raw.id,
    author: raw.user?.login || 'unknown',
    body: raw.body || '',
    createdAt: raw.created_at,
  }
}

// ── route handler ─────────────────────────────────────────────────────────────

/**
 * POST /api/github-issue
 * Body: { "issueUrl": "https://github.com/owner/repo/issues/123" }
 *
 * Success response shape (ready for Phase 2 AI):
 * {
 *   ok: true,
 *   repository: { owner, name, fullName },
 *   issue: { number, title, state, htmlUrl, body, labels, author, ... },
 *   comments: [ { id, author, body, createdAt }, ... ],
 *   meta: { fetchedAt, commentsFetched, totalComments }
 * }
 */
router.post('/', async (req, res) => {
  try {
    // ── 1. Validate input ──────────────────────────────────────────────────
    const { issueUrl } = req.body

    if (!issueUrl || typeof issueUrl !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Request body must include an "issueUrl" string.',
      })
    }

    const trimmedUrl = issueUrl.trim()
    if (trimmedUrl.length === 0) {
      return res.status(400).json({
        ok: false,
        error: '"issueUrl" cannot be empty.',
      })
    }

    // ── 2. Parse URL ──────────────────────────────────────────────────────
    let parsed
    try {
      parsed = parseGitHubIssueUrl(trimmedUrl)
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message })
    }

    const { owner, repo, issueNumber } = parsed

    // ── 3. Fetch issue from GitHub REST API ───────────────────────────────
    const issueApiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`

    let rawIssue
    try {
      rawIssue = await githubFetch(issueApiUrl)
    } catch (err) {
      return res.status(err.status || 502).json({ ok: false, error: err.message })
    }

    // Pull requests also live under /issues/ in the GitHub API; reject them.
    if (rawIssue.pull_request) {
      return res.status(400).json({
        ok: false,
        error:
          'That URL points to a pull request, not an issue. ' +
          'Please paste an issue URL (…/issues/NNN).',
      })
    }

    // ── 4. Fetch up to 5 comments ─────────────────────────────────────────
    let comments = []
    if (rawIssue.comments > 0) {
      const commentsApiUrl =
        `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments` +
        '?per_page=5&page=1'

      try {
        const rawComments = await githubFetch(commentsApiUrl)
        comments = rawComments.map(formatComment)
      } catch {
        // Non-fatal: return the issue without comments rather than failing.
        comments = []
      }
    }

    // ── 5. Return structured response ─────────────────────────────────────
    return res.json({
      ok: true,
      repository: {
        owner,
        name: repo,
        fullName: `${owner}/${repo}`,
      },
      issue: formatIssue(rawIssue),
      comments,
      meta: {
        fetchedAt: new Date().toISOString(),
        commentsFetched: comments.length,
        totalComments: rawIssue.comments,
        // Phase 2 hook: this field will be populated by the AI analysis route
        aiAnalysis: null,
      },
    })
  } catch (err) {
    // Catch-all: network failures, JSON parse errors, etc.
    console.error('[/api/github-issue] Unexpected error:', err)
    return res.status(502).json({
      ok: false,
      error:
        'Could not reach the GitHub API. Check your internet connection and try again.',
    })
  }
})

module.exports = router
