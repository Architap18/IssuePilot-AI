
import { useState } from 'react'
import './App.css'

// Use the deployed backend in production and localhost during development.
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000' : '')
).replace(/\/$/, '')

// ── Utility helpers ──────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return { r, g, b }
}

function labelTextColor(hex) {
  const { r, g, b } = hexToRgb(hex)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#1a1a2e' : '#f5f5fa'
}

function formatDate(iso) {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 30) return `${diffDays} days ago`

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ── Sub-components ───────────────────────────────────────────────────────────

function LabelChip({ label }) {
  const bg = `#${label.color}`
  const color = labelTextColor(label.color)

  return (
    <span
      className="label-chip"
      style={{ backgroundColor: bg, color }}
      title={label.description || label.name}
    >
      {label.name}
    </span>
  )
}

function CommentItem({ comment }) {
  const initial = comment.author.charAt(0)

  return (
    <article className="comment-item">
      <div className="comment-header">
        <div className="comment-avatar" aria-hidden="true">
          {initial}
        </div>
        <span className="comment-author">{comment.author}</span>
        <span className="comment-date">{formatDate(comment.createdAt)}</span>
      </div>

      <div className="comment-body">
        {comment.body.trim() || <em>Empty comment</em>}
      </div>
    </article>
  )
}

function IssueResult({ data, onAnalyze, aiState, aiResult, aiError }) {
  const { repository, issue, comments, meta } = data

  return (
    <section className="result-panel" aria-label="Issue analysis results">
      {/* Issue overview */}
      <div className="card">
        <div className="card-header">
          <span className="card-header-icon" aria-hidden="true">
            📋
          </span>
          <h2>Issue Overview</h2>
        </div>

        <div className="card-body">
          <div className="issue-meta-row">
            <a
              className="repo-link"
              href={`https://github.com/${repository.fullName}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${repository.fullName} on GitHub`}
            >
              {repository.fullName}
            </a>

            <span className="issue-number">#{issue.number}</span>

            <span className={`state-badge ${issue.state}`}>
              {issue.state === 'open' ? '● Open' : '✓ Closed'}
            </span>
          </div>

          <h3 className="issue-title">
            <a
              href={issue.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {issue.title}
            </a>
          </h3>

          {issue.labels.length > 0 && (
            <div className="labels-row" aria-label="Issue labels">
              {issue.labels.map((lbl) => (
                <LabelChip key={lbl.name} label={lbl} />
              ))}
            </div>
          )}

          <p className="issue-byline">
            Opened by <strong>{issue.author}</strong> ·{' '}
            {formatDate(issue.createdAt)}
            {issue.commentsCount > 0 &&
              ` · ${issue.commentsCount} comment${
                issue.commentsCount !== 1 ? 's' : ''
              }`}
          </p>
        </div>
      </div>

      {/* Issue description */}
      <div className="card">
        <div className="card-header">
          <span className="card-header-icon" aria-hidden="true">
            📝
          </span>
          <h2>Description</h2>
        </div>

        <div className="card-body">
          {issue.body.trim() ? (
            <div className="issue-body">{issue.body}</div>
          ) : (
            <p className="no-body">
              No description provided for this issue.
            </p>
          )}
        </div>
      </div>

      {/* Issue comments */}
      {comments.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-header-icon" aria-hidden="true">
              💬
            </span>

            <h2>
              Comments ({comments.length}
              {meta.totalComments > comments.length
                ? ` of ${meta.totalComments}`
                : ''}
              )
            </h2>
          </div>

          <div className="card-body">
            <div className="comments-list">
              {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>

            {meta.totalComments > meta.commentsFetched && (
              <p className="comments-note">
                Showing first {meta.commentsFetched} of{' '}
                {meta.totalComments} comments.{' '}
                <a
                  href={issue.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View all on GitHub ↗
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {/* AI analysis */}
      <div className="card ai-card">
        <div className="card-header">
          <span className="card-header-icon" aria-hidden="true">
            🤖
          </span>
          <h2>AI Analysis</h2>

          {aiState === 'success' && aiResult && (
            <span className="ai-model-badge" title="Model used">
              {aiResult.model}
            </span>
          )}
        </div>

        <div className="card-body">
          {aiState === 'idle' && (
            <div className="ai-cta">
              <p className="ai-cta-desc">
                Get a beginner-friendly explanation, difficulty estimate,
                and actionable next steps — powered by{' '}
                <strong>Llama 3.1 8B</strong> via Groq.
              </p>

              <button
                id="ai-analyze-btn"
                className="btn-ai-analyze"
                onClick={onAnalyze}
                aria-label="Analyze this issue with AI"
              >
                🤖 Analyze with AI
              </button>
            </div>
          )}

          {aiState === 'loading' && (
            <div className="ai-loading" aria-live="polite">
              <div className="loading-ring" aria-hidden="true" />
              <p>Asking Llama 3.1 8B…</p>
            </div>
          )}

          {aiState === 'error' && (
            <>
              <div className="error-banner" role="alert">
                <span className="error-icon" aria-hidden="true">
                  ⚠️
                </span>
                <span>{aiError}</span>
              </div>

              <button
                className="btn-ai-analyze"
                onClick={onAnalyze}
                style={{ marginTop: '1rem' }}
              >
                Retry
              </button>
            </>
          )}

          {aiState === 'success' && aiResult && (
            <div className="ai-result">
              <pre className="ai-analysis-text">
                {aiResult.analysis}
              </pre>

              {aiResult.usage && (
                <p className="ai-usage-note">
                  Tokens used: {aiResult.usage.total_tokens} (
                  {aiResult.usage.prompt_tokens} prompt +{' '}
                  {aiResult.usage.completion_tokens} completion)
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ── Main application ─────────────────────────────────────────────────────────

function App() {
  const [url, setUrl] = useState('')
  const [state, setState] = useState('idle')
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const [aiState, setAiState] = useState('idle')
  const [aiResult, setAiResult] = useState(null)
  const [aiError, setAiError] = useState('')

  // Fetch and display the GitHub issue.
  async function handleAnalyze(e) {
    e.preventDefault()

    const trimmed = url.trim()

    if (!trimmed) {
      setErrorMsg('Please enter a GitHub issue URL.')
      setState('error')
      return
    }

    setState('loading')
    setResult(null)
    setErrorMsg('')
    setAiState('idle')
    setAiResult(null)
    setAiError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/github-issue`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issueUrl: trimmed }),
        },
      )

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            `Could not fetch the GitHub issue (HTTP ${response.status}).`,
        )
      }

      setResult(data)
      setState('success')
    } catch (err) {
      setErrorMsg(
        err.message ||
          'Network error. Please check the backend connection.',
      )
      setState('error')
    }
  }

  // Request AI analysis for the fetched issue.
  async function handleAiAnalyze() {
    if (!result) return

    setAiState('loading')
    setAiResult(null)
    setAiError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/analyze`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result),
        },
      )

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            `AI analysis failed (HTTP ${response.status}).`,
        )
      }

      setAiResult(data)
      setAiState('success')
    } catch (err) {
      setAiError(
        err.message ||
          'Could not reach the backend. Please try again.',
      )
      setAiState('error')
    }
  }

  const isLoading = state === 'loading'

  return (
    <div className="app">
      {/* Hero */}
      <header className="hero">
        <div
          className="hero-badge"
          aria-label="Hacktoberfest 2026 challenge"
        >
          🎃 Hacktoberfest Challenge
        </div>

        <h1 className="hero-title">
          <span className="highlight">IssuePilot</span> AI
        </h1>

        <p className="hero-subtitle">
          Paste any public GitHub issue URL and get a beginner-friendly
          breakdown powered by open-source AI.
        </p>
      </header>

      {/* Main content */}
      <main className="content">
        <section
          className="search-card"
          aria-label="Issue URL input"
        >
          <label htmlFor="issue-url-input">
            GitHub Issue URL
          </label>

          <form
            className="input-row"
            onSubmit={handleAnalyze}
            noValidate
          >
            <input
              id="issue-url-input"
              className="url-input"
              type="url"
              placeholder="https://github.com/owner/repo/issues/123"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              aria-describedby={
                state === 'error' ? 'error-message' : undefined
              }
              aria-invalid={state === 'error' ? 'true' : 'false'}
              autoComplete="url"
              spellCheck="false"
            />

            <button
              id="analyze-btn"
              type="submit"
              className="btn-analyze"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Fetching…
                </>
              ) : (
                <>🔍 Analyze Issue</>
              )}
            </button>
          </form>

          {state === 'error' && (
            <div
              id="error-message"
              className="error-banner"
              role="alert"
            >
              <span className="error-icon" aria-hidden="true">
                ⚠️
              </span>
              <span>{errorMsg}</span>
            </div>
          )}
        </section>

        {/* Issue fetching state */}
        {isLoading && (
          <div
            className="loading-state"
            aria-live="polite"
            aria-label="Fetching issue from GitHub"
          >
            <div className="loading-ring" aria-hidden="true" />
            <p>Fetching issue from GitHub…</p>
          </div>
        )}

        {/* Results */}
        {state === 'success' && result && (
          <IssueResult
            data={result}
            onAnalyze={handleAiAnalyze}
            aiState={aiState}
            aiResult={aiResult}
            aiError={aiError}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>
          IssuePilot AI &mdash; Phase 2 &mdash; GitHub data via the{' '}
          <a
            href="https://docs.github.com/en/rest"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub REST API
          </a>{' '}
          &amp; AI analysis via{' '}
          <a
            href="https://groq.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Groq
          </a>{' '}
          (llama-3.1-8b-instant).
        </p>
      </footer>
    </div>
  )
}

export default App
