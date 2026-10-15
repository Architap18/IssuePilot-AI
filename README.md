# IssuePilot AI

> **Hacktoberfest Open-Source AI Challenge — Week 2: Side Hustle**

IssuePilot AI helps beginners understand public GitHub issues.
Paste a GitHub issue URL → get the issue data **and** a beginner-friendly AI analysis powered by **Llama 3.1 8B** via [Groq](https://groq.com).

---

## What works right now (Phase 2 — complete)

| Feature | Status |
|---|---|
| Parse and validate a GitHub issue URL | ✅ Working |
| Fetch issue title, body, labels, state, author | ✅ Working |
| Fetch up to 5 comments | ✅ Working |
| Reject pull-request URLs | ✅ Working |
| Handle 404 / rate-limit / network errors | ✅ Working |
| Dark-theme React UI with loading / error states | ✅ Working |
| Colorised label chips using GitHub label colours | ✅ Working |
| Works without a GitHub token (60 req/hr limit) | ✅ Working |
| **Beginner-friendly explanation via AI** | ✅ **Phase 2 — Live** |
| **Difficulty estimate (beginner / intermediate / advanced)** | ✅ **Phase 2 — Live** |
| **Actionable investigation steps** | ✅ **Phase 2 — Live** |

AI analysis uses **`llama-3.1-8b-instant`** via the [Groq API](https://console.groq.com).
Free tier: **no credit card required**, 30 req/min, 14,400 req/day.
**All AI responses are real model output — nothing is faked or hardcoded.**

---

## Requirements

- [Node.js](https://nodejs.org/) v18 or newer
- Two terminal windows
- A free [Groq API key](https://console.groq.com/keys) (for AI analysis)

---

## Setup

### 1. Install dependencies

```bash
# from the project root
cd frontend && npm install
cd ../backend && npm install
```

### 2. Configure environment variables

```bash
cd backend
cp .env.example .env
# Open .env and set GROQ_API_KEY (required for AI analysis)
```

Get a free Groq key at <https://console.groq.com/keys> — no credit card needed.

### 3. Start the backend

```bash
cd backend
npm run dev
# Express listens on http://localhost:3000
```

### 4. Start the frontend

```bash
cd frontend
npm run dev
# Vite opens on http://localhost:5173 (or 5174 if 5173 is taken)
```

Open the URL Vite prints. Paste any public GitHub issue URL, click **Analyze Issue** to fetch the data, then click **🤖 Analyze with AI** to get the AI breakdown.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | **Yes** (for AI) | Free Groq API key. [Get one here.](https://console.groq.com/keys) No credit card. |
| `GITHUB_TOKEN` | No | GitHub personal access token. Raises the rate limit from 60 → 5,000 req/hr. [Create one here.](https://github.com/settings/tokens) |
| `PORT` | No | Port for Express (default: `3000`). |

Copy `backend/.env.example` to `backend/.env`.
`.env` is gitignored — never commit your real keys.

---

## API reference

### `GET /api/health`

Returns `{ "ok": true, "message": "..." }` — confirms the server is running.

### `POST /api/github-issue`

**Request body:**
```json
{ "issueUrl": "https://github.com/owner/repo/issues/123" }
```

**Success response (abbreviated):**
```json
{
  "ok": true,
  "repository": { "owner": "...", "name": "...", "fullName": "owner/repo" },
  "issue": { "number": 123, "title": "...", "state": "open", ... },
  "comments": [{ "id": 1, "author": "...", "body": "...", "createdAt": "..." }],
  "meta": { "fetchedAt": "...", "commentsFetched": 5, "totalComments": 5, "aiAnalysis": null }
}
```

### `POST /api/analyze`

Accepts the JSON object returned by `/api/github-issue` and returns an AI analysis.
Requires `GROQ_API_KEY` to be set.

**Request body:** the full JSON from `POST /api/github-issue`

**Success response:**
```json
{
  "ok": true,
  "model": "llama-3.1-8b-instant",
  "analysis": "1. **Explanation** ...\n2. **Difficulty** ...\n3. **Next Steps** ...",
  "usage": { "prompt_tokens": 312, "completion_tokens": 198, "total_tokens": 510 }
}
```

**Error response:**
```json
{ "ok": false, "error": "Human-readable error message." }
```

---

## Project structure

```
111/
├── backend/
│   ├── routes/
│   │   ├── github.js      # POST /api/github-issue
│   │   └── analyze.js     # POST /api/analyze  (Phase 2 — Groq AI)
│   ├── server.js          # Express entry point
│   ├── package.json
│   └── .env.example       # Copy to .env and set GROQ_API_KEY
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main UI component
│   │   ├── App.css        # Design system (dark theme)
│   │   ├── index.css      # Minimal reset
│   │   └── main.jsx       # React entry point
│   ├── index.html
│   └── vite.config.js     # Proxies /api → localhost:3000
├── .gitignore
└── README.md
```

---

## Scripts

| Directory | Command | Effect |
|---|---|---|
| `backend/` | `npm run dev` | Start Express with `--watch` (auto-restarts on save) |
| `backend/` | `npm start` | Start Express once (no auto-restart) |
| `frontend/` | `npm run dev` | Start Vite dev server |
| `frontend/` | `npm run lint` | Run oxlint |
| `frontend/` | `npm run build` | Build production bundle to `frontend/dist/` |
