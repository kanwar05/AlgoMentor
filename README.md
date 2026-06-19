# AlgoMentor — AI-Powered DSA Roadmap & Analytics Platform

AlgoMentor is a full-stack interview-preparation workspace that turns a student's solved-problem history into actionable feedback. Instead of serving a static question sheet, it detects weak concepts, builds a dependency-aware learning path, schedules revision with priority-queue logic, and recommends unsolved questions aligned with a target company.

The app includes a one-click interactive demo, so portfolio reviewers can explore it without a database or account.

## Why this project exists

DSA students often track volume but lack a feedback loop. Raw counts do not answer:

- Which topic should I strengthen next?
- Am I practicing at the right difficulty?
- What should I revise this week?
- Is my preparation broad and consistent enough for interviews?

AlgoMentor answers those questions using transparent scoring and actual DSA data structures.

## Features

- JWT signup/login with bcrypt password hashing and user-scoped protected routes
- Full problem tracker with search, filters, CRUD, topics, notes, links, and learning status
- Dashboard with total solved, difficulty distribution, topic coverage, streaks, activity heatmap, and weekly goals
- Automatic weak-topic detection based on practice volume and `Revision` / `Weak` ratios
- Dependency-aware roadmap generated from a directed DSA topic graph
- Seven-day revision plan generated with a binary max-heap
- Company-aware recommendations for Google, Amazon, Microsoft, Meta, or a general track
- Explainable interview-readiness score with four visible sub-scores
- Optional OpenAI-generated roadmap coaching
- LeetCode and Codeforces account connections with accepted-submission sync
- Idempotent platform imports backed by a compound MongoDB unique index
- Manual JSON import fallback when LeetCode blocks or rate-limits GraphQL requests
- Platform-specific solved counts and sync-powered analytics, heatmaps, weak topics, readiness, roadmaps, and recommendations
- Responsive UI, dark mode, production error handling, rate limiting, and security headers
- Interactive demo mode for portfolio reviewers

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Router |
| Charts | Recharts |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcrypt |
| Optional AI | OpenAI Responses API |
| Security | Helmet, CORS, rate limiting |

## DSA concepts implemented

- **Hash Maps:** O(n) topic, status, difficulty, and daily-activity counting in `analyticsService.js`
- **Deduplication:** in-memory sets plus a `userId + platform + platformProblemId` unique index prevent repeated accepted submissions
- **Directed Graph:** adjacency-list representation of DSA prerequisites in `topicGraph.js`
- **BFS:** backward prerequisite discovery for weak topics
- **DFS:** forward traversal through dependent concepts to form a focused learning sequence
- **Priority Queue / Binary Max-Heap:** O(log n) revision scheduling, prioritizing weak status, medium difficulty, topic overlap, and spaced-review age
- **Dynamic scoring:** normalized weighted interview-readiness score

The core algorithms are deliberately isolated in `server/src/services`, making them testable and easy to explain in an interview.

## Project structure

```text
AlgoMentor/
├── client/
│   └── src/
│       ├── api/          # Axios client and auth interception
│       ├── components/   # Reusable UI primitives
│       ├── context/      # Authentication and demo-mode state
│       ├── data/         # Demo portfolio dataset
│       ├── hooks/        # Remote/demo data adapter
│       ├── layouts/      # Responsive application shell
│       └── pages/        # All product pages
├── server/
│   └── src/
│       ├── controllers/
│       ├── data/         # Topic graph and recommendation bank
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── services/     # Analytics and DSA algorithms
│       └── utils/
└── README.md
```

## API routes

All routes except register, login, and health require `Authorization: Bearer <token>`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Authenticate and return a JWT |
| GET | `/api/auth/me` | Get profile |
| PUT | `/api/auth/me` | Update goals and preferences |
| PUT | `/api/profile/platforms` | Save LeetCode and Codeforces handles |
| GET | `/api/problems` | List/search/filter problems |
| POST | `/api/problems` | Add a solved problem |
| PUT | `/api/problems/:id` | Update a problem |
| DELETE | `/api/problems/:id` | Delete a problem |
| GET | `/api/analytics` | Dashboard analytics and readiness |
| GET | `/api/roadmap` | Personalized graph roadmap |
| GET | `/api/roadmap?explain=true` | Include optional AI coaching |
| GET | `/api/revision-plan` | Seven-day priority plan |
| GET | `/api/recommendations` | Ranked unsolved questions |
| POST | `/api/sync/leetcode` | Import recent accepted LeetCode submissions |
| POST | `/api/sync/codeforces` | Import unique accepted Codeforces submissions |
| POST | `/api/sync/all` | Sync every connected platform |
| POST | `/api/sync/manual-import` | Import a JSON array of solved problems |
| GET | `/api/sync/status` | Connected handles, counts, timestamps, and history |
| GET | `/api/sync/problems` | Paginated synced-problem list |
| GET | `/api/health` | Service health check |

## Run locally

Requirements: Node.js 20+ and MongoDB 7+ (local or Atlas).

```bash
cp .env.example server/.env
npm run install:all
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:5001`.

To add a portfolio-ready demo account:

```bash
npm run seed --prefix server
```

Credentials: `demo@algomentor.dev` / `DemoPass123!`

You can also click **Explore live demo** on the landing page without running MongoDB.

### Optional AI explanation

Add these values to `server/.env`:

```env
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-4o-mini
```

The product works fully without an AI key; AI is an enhancement, not a dependency.

### Environment variables

```env
MONGODB_URI=mongodb://127.0.0.1:27017/algomentor
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
PORT=5001
CLIENT_URL=http://localhost:5173
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Platform sync uses public LeetCode and Codeforces endpoints and requires no platform API keys.

## Platform Sync

Open **Platform Sync** in the authenticated sidebar, save one or both handles, and run an individual or combined sync.

### How Codeforces sync works

AlgoMentor calls `user.status`, keeps submissions whose verdict is `OK`, and deduplicates them by `contestId + problem index`. It imports the problem name, tags, rating, language, accepted timestamp, submission ID, and canonical problem URL. Codeforces ratings are normalized into Easy, Medium, and Hard bands, while known tags are mapped to AlgoMentor topics.

### LeetCode limitations

LeetCode does not provide a stable public API for complete submission history by username. Its public GraphQL query currently hard-caps accepted submissions at the latest 20 records; requesting larger limits still returns 20. The profile API provides the full solved count but not the identities of older solved problems.

For a complete history, open **Manual import** and copy the supplied exporter into the browser console on the logged-in LeetCode problemset page. The script paginates through the problem list, selects every accepted problem, and downloads one JSON file that can be uploaded to AlgoMentor. It executes on LeetCode's own origin; session cookies are not written to the export or sent to AlgoMentor. Imports support up to 5,000 problems and remain idempotent.

Example manual import:

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

```bash
npm test
npm run build
```

The server test suite covers Codeforces accepted-submission filtering, duplicate prevention, platform topic mapping, readiness changes after sync, and manual-import validation.

## Readiness formula

```text
score =
  topicCoverage × 0.35 +
  difficultyBalance × 0.25 +
  recentConsistency × 0.20 +
  totalSolvedScore × 0.20
```

Every component is normalized to 0–100. Weak-topic count reduces the coverage component, preventing shallow practice volume from inflating readiness.

## Screenshots

Add deployed captures under `docs/screenshots/`:

1. Landing page
2. Analytics dashboard
3. Dependency roadmap
4. Seven-day revision plan
5. Recommendations
6. Platform Sync connections and history
7. Mobile and dark-mode views

## Future improvements

- Trie-based instant title/topic suggestions
- Redis caching for aggregate analytics
- Scheduled email revision reminders
- Cohort benchmarking and mock-interview history
- CI pipeline and expanded API integration tests
- Drag-and-drop roadmap customization
- LLM-generated hints grounded in the user's own notes

## Resume bullet points

- Engineered a production-style MERN analytics platform that transforms DSA practice history into topic coverage, streaks, heatmaps, and an explainable interview-readiness score using hash-map aggregations and weighted scoring.
- Designed a dependency-aware recommendation engine using directed graphs, BFS/DFS traversal, and a binary max-heap to generate personalized learning roadmaps and priority-ranked seven-day revision plans.
- Built secure JWT authentication, user-scoped CRUD APIs, company-targeted problem recommendations, optional AI coaching, and a responsive React/Tailwind dashboard with Recharts and dark mode.
- Implemented idempotent LeetCode and Codeforces synchronization with GraphQL/REST adapters, compound-index deduplication, rate-limit handling, manual import fallback, and unified analytics across manual and synced practice data.
