require('dotenv').config() // loads GROQ_API_KEY and GITHUB_TOKEN from backend/.env
const express = require('express')
const cors = require('cors')

// Route modules
const githubRoute = require('./routes/github')

const app = express()
const PORT = process.env.PORT || 3000

// Allow the Vite dev server to call this API (5173 is the default; Vite
// may use 5174+ if 5173 is already taken).
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
    ],
  }),
)

app.use(express.json())

// ── existing routes (unchanged) ───────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'Backend is running. Hello from Express!',
  })
})

app.get('/api/hello', (req, res) => {
  res.json({
    message: 'Hello from the Express server!',
  })
})

// ── Phase 1: GitHub issue fetching ────────────────────────────────────────────
// POST /api/github-issue  { issueUrl: "https://github.com/owner/repo/issues/N" }
app.use('/api/github-issue', githubRoute)

// ── Phase 2: AI analysis via Groq (llama-3.1-8b-instant) ────────────────────
// POST /api/analyze  — body: the JSON object from /api/github-issue
app.use('/api/analyze', require('./routes/analyze'))

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
  console.log(`Health check:   http://localhost:${PORT}/api/health`)
  console.log(`GitHub issue:   POST http://localhost:${PORT}/api/github-issue`)
  console.log(`AI analysis:    POST http://localhost:${PORT}/api/analyze`)
})
