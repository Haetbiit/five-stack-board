# Five-Stack Board

Team planner for a League of Legends five-stack: roster and champion pools, role coverage, and draft comps.

- `public/` – the app (a single page) and champion icons
- `api/board.js` – shared storage, backed by Upstash Redis

## Setup on Vercel

1. Import this repo as a Vercel project (no build step; framework preset "Other").
2. In the project, open **Storage → Create Database → Upstash for Redis** and connect it to the project. The API works with either `REDIS_URL` or `KV_REST_API_URL` + `KV_REST_API_TOKEN`.
3. Add an environment variable `TEAM_CODE` with the code your team uses to unlock editing.
4. Redeploy.

Anyone with the link can view the board. Adding or changing players and comps needs the team code; each device remembers it after the first unlock.
