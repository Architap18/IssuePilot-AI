IssuePilot AI 🤖

Understand GitHub issues. Find your starting point. Contribute to open source with confidence.

IssuePilot AI helps beginners understand public GitHub issues without getting overwhelmed by technical jargon. Paste an issue URL to retrieve its details, then generate an AI-powered explanation, difficulty estimate, and actionable investigation steps.

Built for the Hacktoberfest Open-Source AI Challenge — Week 2: Side Hustle.

🔗 Project Links

🚀 Live Demo: https://issue-pilot-ai-six.vercel.app

💻 GitHub Repository: https://github.com/Architap18/IssuePilot-AI

📝 DEV.to Challenge Post: https://dev.to/architap18/issuepilot-ai-your-ai-powered-guide-to-open-source-contributions-557d

✨ Features

GitHub Issue Analysis

Accepts public GitHub issue URLs.

Validates issue URLs and rejects pull requests.

Retrieves issue titles, descriptions, labels, state, and author information.

Fetches up to five comments for additional context.

Handles invalid URLs, missing issues, rate limits, and network errors.

AI-Powered Insights

Explains technical issues in beginner-friendly language.

Estimates difficulty: beginner, intermediate, or advanced.

Suggests actionable steps for investigating an issue.

Uses GPT-OSS 20B through the Groq API.

User Interface

Dark-themed React interface.

Loading and error states.

GitHub label colors displayed in the issue overview.

Separate issue-fetching and AI-analysis steps.

🛠️ Tech Stack

Component

Technology

Frontend

React, Vite, CSS

Backend

Node.js, Express.js

Issue data

GitHub REST API

AI model

openai/gpt-oss-20b

AI inference

Groq API

Frontend hosting

Vercel

Backend hosting

Render

🔄 How It Works

A user pastes a public GitHub issue URL.

The React frontend sends the URL to the Express backend.

The backend validates the URL and fetches issue details and comments through the GitHub REST API.

The frontend displays the issue information.

The user requests an AI analysis.

The backend sends the relevant issue data to the Groq API.

The generated explanation, difficulty estimate, and investigation steps are displayed to the user.

User
  |
  v
React Frontend (Vercel)
  |
  | POST /api/github-issue
  v
Express Backend (Render)
  |
  v
GitHub REST API
  |
  v
Issue Details + Comments
  |
  | POST /api/analyze
  v
Groq API (GPT-OSS 20B)
  |
  v
Beginner-Friendly Analysis

🚀 Run Locally

Prerequisites

Node.js 18 or newer

npm

A Groq API key for AI analysis

1. Clone the repository

git clone https://github.com/Architap18/IssuePilot-AI.git
cd IssuePilot-AI

2. Install dependencies

cd backend
npm install

cd ../frontend
npm install

3. Configure environment variables

From the project root:

cp backend/.env.example backend/.env

Open backend/.env and configure your values:

GROQ_API_KEY=your_groq_api_key_here
GITHUB_TOKEN=
PORT=3000

Get a Groq API key at console.groq.com/keys.

A GitHub token is optional. Without one, requests use GitHub's unauthenticated API rate limit.

Never commit real API keys or secrets. Keep your local .env file out of Git.

4. Start the backend

In the first terminal:

cd backend
npm run dev

The backend normally runs at:

http://localhost:3000

Check the health endpoint:

http://localhost:3000/api/health

5. Start the frontend

In a second terminal:

cd frontend
npm run dev

Open the local URL printed by Vite, usually:

http://localhost:5173

The frontend's Vite configuration proxies API requests to the local backend during development.

🔐 Environment Variables

Backend

Variable

Required

Description

GROQ_API_KEY

For AI analysis

Authenticates requests to Groq

GITHUB_TOKEN

No

Increases the GitHub REST API rate limit

PORT

No

Port used by Express; defaults to 3000

FRONTEND_URL

For deployed frontend access

Production frontend origin allowed by CORS

Frontend

Variable

Description

VITE_API_BASE_URL

Base URL of the backend API

For the deployed frontend, configure:

VITE_API_BASE_URL=https://issuepilot-ai.onrender.com

Set this variable in the Vercel project environment settings and redeploy after changing it.

For the deployed backend, configure GROQ_API_KEY and FRONTEND_URL in Render's environment settings. Set FRONTEND_URL to the production frontend origin.

Security note: Never put API keys in frontend variables prefixed with VITE_. These values can be exposed to users through the browser.

📡 API Reference

GET /api/health

Checks whether the backend is running.

Example response:

{
  "ok": true,
  "message": "Server is running"
}

The exact message depends on the backend implementation.

POST /api/github-issue

Fetches a GitHub issue and its comments.

Request body:

{
  "issueUrl": "https://github.com/vercel/next.js/issues/92961"
}

A successful response contains repository information, issue details, comments, and metadata.

POST /api/analyze

Generates an AI analysis using the issue data returned by /api/github-issue.

The request body should contain the JSON object returned by the issue-fetching endpoint.

A successful response includes the model name, generated analysis, and token usage when available.

Both endpoints return errors when a request cannot be processed. Refer to the backend implementation for the exact response fields and HTTP status codes.

📁 Project Structure

IssuePilot-AI/
├── backend/
│   ├── routes/
│   │   ├── github.js
│   │   └── analyze.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── .gitignore

🧪 Useful Commands

Run each command from its relevant directory.

Backend

npm run dev
npm start

Frontend

npm run dev
npm run lint
npm run build

🌱 Why Open Innovation Matters

Open source makes software development more collaborative and accessible. However, newcomers often struggle to understand unfamiliar codebases, technical issue descriptions, and the first steps required to contribute.

IssuePilot AI aims to lower this initial barrier by translating issue context into a clearer starting point. It supports learning and investigation while encouraging contributors to read the original issue, explore the codebase, and communicate with maintainers.

🔮 Future Improvements

Recommend relevant files and directories to investigate.

Identify the skills and technologies needed for an issue.

Suggest related documentation and learning resources.

Generate structured contribution plans.

Add automated tests and broader error-handling coverage.

🤝 Contributing

Contributions, suggestions, and feedback are welcome.

Fork this repository.

Create a feature branch.

Make your changes and test them.

Open a pull request describing your contribution.

Please never commit credentials, API keys, or other secrets.

📄 License

No license is specified in this README yet. Add a LICENSE file before claiming the project is distributed under a particular open-source license.