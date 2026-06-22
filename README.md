# AlgoMentor — Adaptive DSA Interview Preparation

AlgoMentor is a full-stack learning system that turns solved-problem history into a personalized interview-preparation loop. It combines manual tracking, LeetCode and Codeforces sync, topic analytics, adaptive spaced repetition, recommendation feedback, and timed mock interviews.

The application also includes an interactive demo mode, so it can be explored without creating an account or connecting MongoDB.

## What AlgoMentor answers

- Which topics are genuinely strong or weak?
- What should I revise today, and when should I see it again?
- Which problem should I solve next?
- Are the recommendations too easy, too hard, or irrelevant?
- How do I perform under interview time pressure?
- What should I practice after a failed mock interview?

## Features

### Practice tracking and platform sync

- JWT authentication with bcrypt password hashing and user-scoped data access
- Manual solved-problem CRUD with topics, status, confidence, notes, links, and solved date
- Direct edit URLs that survive refreshes and new-tab navigation
- LeetCode recent-submission sync and complete-history manual import
- Complete Codeforces accepted-submission sync
- Idempotent imports protected by a compound MongoDB unique index
- Synced-problem annotations:
  - `Strong`, `Revision`, or `Weak`
  - confidence
  - notes
  - last reviewed date
- Re-syncing updates platform metadata without overwriting user annotations

### Analytics and roadmap

- Dashboard totals, weekly goals, platform counts, streaks, and activity heatmaps
- Difficulty balance and an explainable 0–100 interview-readiness score
- Normalized topic analytics that merge aliases such as `Array`, `Arrays`, and `array`
- Interactive Topic Mastery Bubble Map:
  - bubble size represents solved volume
  - color represents topic strength
  - hover reveals difficulty and status breakdowns
  - selecting a bubble opens the filtered problem list
- Weak-topic detection from solved, revision, weak, and confidence signals
- Dependency-aware roadmap generated from a directed DSA topic graph
- Optional OpenAI-generated roadmap coaching
- MongoDB-side analytics aggregation and deduplication, with bounded projections for revision and recommendation queries
- Graceful roadmap fallback when optional AI coaching is unavailable

### Adaptive Revision Engine

Every revision completion creates a persistent `ReviewAttempt` containing:

```text
userId, problemId, result, timeTaken, confidence,
reviewedAt, nextReviewAt, interval, easeFactor
```

The scheduler adapts after each review:

```text
Solved     → interval × easeFactor, easeFactor + 0.1
Used hint  → retain interval,       easeFactor - 0.1
Failed     → interval = 1 day,      easeFactor - 0.2
```

- Ease factor is safely floored at `1.3`
- Reviews appear on their actual due day
- Reviews beyond the next seven days stay out of the current sprint
- The revision UI captures result, confidence, and optional time spent

### Adaptive recommendations

- Recommendations use weak-topic overlap, company alignment, difficulty balance, solved history, and user feedback
- Available feedback:
  - Too easy
  - Too hard
  - Already solved
  - Not relevant
  - Save for later
- Dismissed recommendations do not repeat
- Too-easy feedback shifts future recommendations harder
- Too-hard feedback favors easier prerequisite practice
- Not-relevant feedback reduces related-topic weighting
- Saved problems remain visible and are ranked first

### Mock Interview Mode

1. Select company, difficulty, and duration
2. Generate two or three suitable unsolved problems
3. Start a persistent countdown timer
4. Record each result as solved, used hint, or failed
5. Receive a score, weak-topic analysis, and next-practice plan

Active sessions survive browser refreshes. Scoring is transparent:

```text
Solved: 100%   Used hint: 60%   Failed/skipped: 0%
```

### Reliability and UX

- Shared loading, error, empty, and retry states
- Null-safe and partial-response-safe page rendering
- Race-safe API refetching
- Responsive layout and dark mode
- Helmet, CORS, rate limiting, and centralized API error handling

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, React Router |
| Charts | Recharts, custom responsive SVG |
| Backend | Node.js, Express 5 |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcrypt |
| Testing | Node test runner, Vitest, Testing Library, jsdom |
| Optional AI | OpenAI Responses API |
| Security | Helmet, CORS, Express rate limiting |

## Algorithms and data structures

- **Hash maps and sets:** O(n) analytics aggregation, normalization, deduplication, and feedback lookup
- **Directed graph:** adjacency-list representation of DSA prerequisites
- **BFS:** backward prerequisite discovery
- **DFS:** forward dependency traversal for roadmap generation
- **Binary max-heap:** O(log n) priority scheduling for revision candidates
- **Spaced repetition:** adaptive interval and ease-factor updates
- **Weighted ranking:** recommendations combine topic, company, difficulty, relevance, and saved-item signals
- **Deterministic SVG packing:** responsive topic bubble placement without restarting a force simulation

Core product logic lives in `server/src/services`, keeping algorithms independently testable.

## Project structure

```text
AlgoMentor/
├── client/
│   └── src/
│       ├── api/          # Axios client and auth interception
│       ├── components/   # Shared states, charts, sync UI, and primitives
│       ├── context/      # Authentication and demo mode
│       ├── data/         # Demo dataset
│       ├── hooks/        # Remote-data loading and retry behavior
│       ├── layouts/      # Responsive application shell
│       └── pages/        # Product flows and page tests
├── server/
│   ├── test/             # Service, model, auth, ownership, and API tests
│   └── src/
│       ├── controllers/
│       ├── data/         # Topic graph and recommendation bank
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── services/
│       └── utils/
├── screenshots/
└── README.md
```

## Run locally

Requirements:

- Node.js 20+
- MongoDB 7+ locally or through MongoDB Atlas

Install and start both applications:

```bash
cp .env.example server/.env
cp .env.example client/.env
npm run install:all
npm run dev
```

Open:

- Client: `http://localhost:5173`
- API: `http://localhost:5002`
- Health check: `http://localhost:5002/api/health`

### Demo data

Seed a database-backed demo account:

```bash
npm run seed --prefix server
```

Credentials:

```text
demo@algomentor.dev
DemoPass123!
```

Alternatively, select the demo workspace from the landing page. Demo mode does not require MongoDB.

## Environment variables

The provided `.env.example` contains:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/algomentor
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
PORT=5002
CLIENT_URL=http://localhost:5173
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
VITE_API_URL=http://localhost:5002/api
```

`OPENAI_API_KEY` is optional. The core product works without AI.

## Deployment guide

The recommended beginner-friendly setup is:

- **MongoDB Atlas** for the database
- **Render** for the Express API
- **Vercel** for the Vite client

### 1. Create the MongoDB Atlas database

1. Create an Atlas project and cluster.
2. Create a database user with a strong, unique password.
3. Add the backend host to the Atlas IP access list. For an initial test deployment, Atlas also supports temporary broader access, but restrict it before a serious public launch.
4. Copy the application connection string and set the database name to `algomentor`.

Example:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/algomentor?retryWrites=true&w=majority
```

Atlas is recommended because revision completion uses MongoDB transactions, which require a replica set or sharded cluster.

### 2. Deploy the backend on Render

Create a Render **Web Service** from the repository with:

```text
Root Directory: server
Build Command: npm ci
Start Command: npm start
Health Check Path: /api/health
```

Configure these environment variables:

```env
NODE_ENV=production
MONGODB_URI=your_atlas_connection_string
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-frontend.vercel.app
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Generate a strong JWT secret locally:

```bash
openssl rand -base64 48
```

Render provides `PORT` automatically. After deployment, confirm the API is healthy:

```text
https://your-backend.onrender.com/api/health
```

### 3. Deploy the frontend on Vercel

Import the same repository into Vercel with:

```text
Root Directory: client
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

Set the production environment variable:

```env
VITE_API_URL=https://your-backend.onrender.com/api
```

The included `client/vercel.json` rewrites browser routes to `index.html`, so refreshing routes such as `/app/analytics` continues to work.

### 4. Finalize CORS

Once Vercel gives you the production frontend URL:

1. Set Render's `CLIENT_URL` to that exact URL.
2. Do not include a trailing slash.
3. Redeploy the backend.
4. Test login and registration from the production frontend.

### Post-deployment checklist

- Open the frontend and refresh a deep route such as `/app/analytics`.
- Register a new account and log in again.
- Add, edit, and delete a problem.
- Complete a revision task and verify its next review date.
- Test an active and an expired mock interview.
- Test manual import and connected-platform sync.
- Verify the roadmap works without `OPENAI_API_KEY`.
- Check mobile navigation and dark mode.
- Confirm the browser console has no CORS or mixed-content errors.
- Confirm `/api/health` returns a successful JSON response.

> **Important:** Do not deploy seeded demo credentials such as `demo@algomentor.dev / DemoPass123!` to a public production database. Demo mode in the client does not require a database account.

## API overview

All routes except registration, login, and health require:

```http
Authorization: Bearer <token>
```

### Authentication and profile

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Authenticate and return a JWT |
| GET | `/api/auth/me` | Get the current profile |
| PUT | `/api/auth/me` | Update goals and preferences |
| PUT | `/api/profile/platforms` | Save platform handles |

### Problems and analytics

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/problems` | Search and filter manual and synced problems |
| POST | `/api/problems` | Add a manual solved problem |
| GET | `/api/problems/:id` | Fetch an owned manual problem for direct editing |
| PUT | `/api/problems/:id` | Update an owned manual problem |
| DELETE | `/api/problems/:id` | Delete an owned manual problem |
| GET | `/api/analytics` | Analytics, readiness, and topic mastery |
| GET | `/api/roadmap` | Dependency-aware roadmap |
| GET | `/api/roadmap?explain=true` | Roadmap with optional AI coaching |

### Revision and recommendations

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/revision-plan` | Generate the adaptive seven-day revision plan |
| PATCH | `/api/revision-plan/:taskId/complete` | Record a review result and schedule the next review |
| GET | `/api/recommendations` | Get adaptive ranked recommendations |
| PUT | `/api/recommendations/:problemId/feedback` | Save recommendation feedback |

### Platform sync

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/sync/leetcode` | Sync recent LeetCode submissions |
| POST | `/api/sync/codeforces` | Sync accepted Codeforces submissions |
| POST | `/api/sync/all` | Sync all connected platforms |
| POST | `/api/sync/manual-import` | Import solved-problem JSON |
| GET | `/api/sync/status` | Get handles, coverage, counts, and history |
| GET | `/api/sync/problems` | List synced problems |
| PATCH | `/api/sync/problems/:id/annotations` | Update synced-problem learning annotations |

### Mock interviews

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/mock-interviews` | Generate and persist an interview |
| GET | `/api/mock-interviews/:id` | Resume an owned interview |
| PATCH | `/api/mock-interviews/:id/complete` | Score and complete an interview |
| GET | `/api/health` | Service health check |

## Platform sync notes

### Codeforces

AlgoMentor uses `user.status`, keeps submissions with verdict `OK`, and deduplicates by `contestId + problem index`. Ratings are normalized into Easy, Medium, and Hard bands, and known tags are mapped to canonical AlgoMentor topics.

### LeetCode

LeetCode's public GraphQL profile endpoint exposes the latest accepted submissions and the total solved count, but not every older solved problem identity. For complete history:

1. Open **Platform Sync → Manual import**
2. Copy the provided exporter
3. Run it on the authenticated LeetCode problemset page
4. Upload the downloaded JSON file

The exporter runs on LeetCode's origin. Cookies and credentials are not included in the export or sent to AlgoMentor. Imports support up to 5,000 records and remain idempotent.

Example:

```json
[
  {
    "platform": "LeetCode",
    "title": "Two Sum",
    "difficulty": "Easy",
    "topics": ["array", "hash-table"],
    "problemUrl": "https://leetcode.com/problems/two-sum/"
  }
]
```

## Testing

Run the complete quality gate:

```bash
npm run check
```

Available commands:

```bash
npm run test:server   # Node server tests
npm run test:client   # Vitest client tests
npm test              # Both test suites
npm run lint          # ESLint across server and client source/tests
npm run format:check  # Prettier checks for project configuration
npm run build:client  # Production Vite build
npm run security:audit # Production dependency audit for root, server, and client
npm run check         # Lint, format, tests, and production build
```

Current coverage includes:

- topic normalization, analytics, mastery scoring, and bubble interactions
- API loading, failure, null-response, retry, and partial-response states
- direct edit URL loading, authentication, and ownership
- adaptive revision intervals, persistence, due dates, and UI feedback
- synced-problem annotation validation and resync preservation
- recommendation feedback persistence and adaptive ranking
- mock interview generation, scoring, weak topics, ownership, timer flow, and refresh recovery

At the time of this update:

```text
Server: 81 passing tests
Client: 29 passing tests
```

## Readiness formula

```text
score =
  topicCoverage × 0.35 +
  difficultyBalance × 0.25 +
  recentConsistency × 0.20 +
  totalSolvedScore × 0.20
```

Every component is normalized to 0–100. Weak and revision-heavy topic signals reduce coverage credit, preventing raw volume from inflating readiness.

## Screenshots

Screenshots are stored in [`screenshots/`](screenshots/).

### Dashboard
![AlgoMentor dashboard](<screenshots/Screenshot 2026-06-22 at 1.54.45 PM.png>)

### Problems
![AlgoMentor analytics](<screenshots/Screenshot 2026-06-22 at 1.55.01 PM.png>)

### Analytics
![AlgoMentor roadmap](<screenshots/Screenshot 2026-06-22 at 1.55.13 PM.png>)

### Roadmap
![AlgoMentor revision plan](<screenshots/Screenshot 2026-06-22 at 1.55.20 PM.png>)

### Revision Plan
![AlgoMentor revision plan](<screenshots/Screenshot 2026-06-22 at 1.55.32 PM.png>)

### Recommended
![AlgoMentor revision plan](<screenshots/Screenshot 2026-06-22 at 1.55.41 PM.png>)

### Mock Interview
![AlgoMentor revision plan](<screenshots/Screenshot 2026-06-22 at 1.55.50 PM.png>)

### Problem sync
![AlgoMentor revision plan](<screenshots/Screenshot 2026-06-22 at 1.55.59 PM.png>)

### Prrofile
![AlgoMentor revision plan](<screenshots/Screenshot 2026-06-22 at 1.56.08 PM.png>)

### Dark Mode
![AlgoMentor revision plan](<screenshots/Screenshot 2026-06-22 at 1.56.19 PM.png>)

## Future improvements

- Mock-interview history and performance trends
- Scheduled email or push revision reminders
- Larger curated problem catalog
- Redis caching for aggregate analytics
- CI/CD pipeline and deployment health monitoring
- Cohort benchmarking
- LLM-generated hints grounded in the user's own notes


