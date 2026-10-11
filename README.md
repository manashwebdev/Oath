# Oath

**Track every promise you make and see who is waiting on you.**

Oath turns promises ("I'll send the invoice Friday") into a live orbit. Each person is a planet. The closer they are to you, the more urgent the promise. Overdue promises pulse red. It also scores how reliable you are, per person and overall.

## Run
```bash
npm start   # http://localhost:4000
```
Click **Load demo data** for a populated orbit. Zero dependencies, Node 18+.

## API
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/promises` | List promises with status and days left |
| POST | `/api/promises` | Create `{who, what, due: "YYYY-MM-DD"}` |
| POST | `/api/promises/:id/resolve` | Resolve `{result: "kept" \| "broken"}` |
| DELETE | `/api/promises/:id` | Delete |
| GET | `/api/overview` | Trust score, per-person reliability, overdue counts |

## Scoring
Kept on time = 1, kept late = 0.5, broken = 0. Trust score is the average across resolved promises.

## Structure
`server/` (server.js, stats.js, store.js) · `public/` (index.html, styles.css, app.js)
