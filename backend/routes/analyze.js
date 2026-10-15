/**
 * routes/analyze.js
 * POST /api/analyze
 *
 * Accepts the structured issue payload already returned by /api/github-issue
 * and sends a concise prompt to Groq's llama-3.1-8b-instant model.
 *
 * No extra npm packages are needed: we use the native Node fetch, exactly as
 * the GitHub route does.  Groq exposes an OpenAI-compatible REST endpoint so
 * no SDK is required.
 *
 * Free-tier limits (as of 2025):
 *   30 req / min · 14,400 req / day · 6,000 tokens / min · no credit card
 *
 * Environment variable required (backend/.env):
 *   GROQ_API_KEY=gsk_...
 */

const express = require('express')
const router = express.Router()

// ── constants ─────────────────────────────────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'openai/gpt-oss-20b'

// Keep the prompt small to stay well inside the 6 000 TPM free-tier limit.
// Title + first 800 chars of body is more than enough for a useful analysis.
const MAX_BODY_CHARS = 800

// ── prompt builder ────────────────────────────────────────────────────────────

/**
 * Build a compact system + user prompt from the github-issue payload.
 * Total input tokens stay well under 1 000, leaving room for the reply.
 */
function buildMessages(issuePayload) {
  const { repository, issue, comments } = issuePayload

  // Truncate the issue body to keep tokens in check
  const body = (issue.body || '').trim().slice(0, MAX_BODY_CHARS)
  const labelNames = issue.labels.map((l) => l.name).join(', ') || 'none'

  // Include the first comment (if any) for extra context — also truncated
  const firstComment =
    comments && comments.length > 0
      ? `\nFirst comment (${comments[0].author}): ${comments[0].body.trim().slice(0, 300)}`
      : ''

  const userMessage = `
Repository: ${repository.fullName}
Issue #${issue.number}: ${issue.title}
State: ${issue.state}
Labels: ${labelNames}
Body:
${body || '(no description)'}${firstComment}
`.trim()

  return [
    {
      role: 'system',
      content:
        'You are IssuePilot AI, a helpful assistant for open-source contributors. ' +
        'When given a GitHub issue, respond with a structured analysis using exactly these three sections:\n' +
        '1. **Explanation** – A 2-3 sentence beginner-friendly explanation of what the issue is about.\n' +
        '2. **Difficulty** – One of: Beginner / Intermediate / Advanced, with a one-sentence reason.\n' +
        '3. **Next Steps** – 2-4 bullet points of concrete, actionable investigation or contribution steps.\n' +
        'Be concise. Do not repeat the issue title.',
    },
    {
      role: 'user',
      content: userMessage,
    },
  ]
}

// ── route handler ─────────────────────────────────────────────────────────────

/**
 * POST /api/analyze
 * Body: the full JSON object returned by POST /api/github-issue
 *
 * Success response:
 * {
 *   ok: true,
 *   model: "llama-3.1-8b-instant",
 *   analysis: "<markdown string>",
 *   usage: { prompt_tokens, completion_tokens, total_tokens }
 * }
 */
router.post('/', async (req, res) => {
  // ── 1. Check API key is configured ────────────────────────────────────────
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error:
        'GROQ_API_KEY is not set in backend/.env. ' +
        'Create a free key at https://console.groq.com/keys and add it.',
    })
  }

  // ── 2. Validate that we received a github-issue payload ───────────────────
  const payload = req.body
  if (!payload || !payload.issue || !payload.repository) {
    return res.status(400).json({
      ok: false,
      error:
        'Request body must be the JSON object returned by POST /api/github-issue ' +
        '(must include at minimum "issue" and "repository" fields).',
    })
  }

  // ── 3. Build messages and call Groq ───────────────────────────────────────
  const messages = buildMessages(payload)

  let groqRes
  try {
    groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 512, // Enough for the 3-section reply; keeps usage low
        temperature: 0.4, // Slightly creative but still factual
      }),
    })
  } catch (err) {
    console.error('[/api/analyze] Network error reaching Groq:', err)
    return res.status(502).json({
      ok: false,
      error: 'Could not reach the Groq API. Check your internet connection.',
    })
  }

  // ── 4. Handle Groq error responses ────────────────────────────────────────
  if (!groqRes.ok) {
    let errBody = {}
    try {
      errBody = await groqRes.json()
    } catch {
      // ignore parse failure
    }

    const groqMsg = errBody?.error?.message || `HTTP ${groqRes.status}`

    if (groqRes.status === 401) {
      return res.status(401).json({
        ok: false,
        error: `Groq API key is invalid or expired. ${groqMsg}`,
      })
    }
    if (groqRes.status === 429) {
      return res.status(429).json({
        ok: false,
        error: `Groq rate limit reached. ${groqMsg}. Wait a moment and try again.`,
      })
    }
    return res.status(502).json({
      ok: false,
      error: `Groq API error: ${groqMsg}`,
    })
  }

  // ── 5. Extract the analysis text ──────────────────────────────────────────
  let groqData
  try {
    groqData = await groqRes.json()
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: 'Received an unreadable response from Groq.',
    })
  }

  const analysis = groqData?.choices?.[0]?.message?.content
  if (!analysis) {
    return res.status(502).json({
      ok: false,
      error: 'Groq returned an empty response. Please try again.',
    })
  }

  // ── 6. Return structured response ─────────────────────────────────────────
  return res.json({
    ok: true,
    model: MODEL,
    analysis,
    usage: groqData.usage || null,
  })
})

module.exports = router
