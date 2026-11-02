# Five-Stack Board

Team planner for a League of Legends five-stack.

- **Roster**: players (starters and subs), roles, champion pools by tier, strengths and weaknesses
- **Team map**: role coverage, champion depth per position, shared champions, damage spread
- **Comps**: five-player drafts checked against each player's pool
- **Schedule**: week view (Mon–Sun) of scrims and availability. Players tap green (available) or red (busy); a day lights up as "Ready for scrims" once five players are free
- **Fearless**: comfort picks by position (Top, Jungle, Mid, ADC, Support) with a fearless-draft switch. Lock champions used in game 1/2/3 and they grey out everywhere, so the team sees what's left
- **Scouting**: next opponent, their power picks and bans, weaknesses, and our gameplan, with a save button

- `public/` – the app (a single page) and champion icons
- `api/board.js` – shared storage, backed by Upstash Redis

## Setup on Vercel

1. Import this repo as a Vercel project (no build step; framework preset "Other").
2. In the project, open **Storage → Create Database → Upstash for Redis** and connect it to the project. The API works with either `REDIS_URL` or `KV_REST_API_URL` + `KV_REST_API_TOKEN`.
3. Add an environment variable `TEAM_CODE` with the code your team uses to unlock editing.
4. Redeploy.

Anyone with the link can view the board. Adding or changing players and comps needs the team code; each device remembers it after the first unlock.
