# Five-Stack Board

Team planner for a League of Legends five-stack.

- **Roster**: players (starters and subs), roles, champion pools by tier, strengths and weaknesses
- **Team map**: role coverage, champion depth per position, shared champions, damage spread
- **Comps**: five-player drafts checked against each player's pool
- **Draft**: tournament draft simulator (6 bans, 6 picks, 4 bans, 4 picks in the real order) with our pools, fearless locks and scouted threats marked; save the result as a comp or lock it into the fearless series
- **Rank sync**: Solo/Duo and Flex rank, LP and win rate from the Riot API for every player with a Riot ID
- **Schedule**: week view (Mon–Sun) of scrims and availability. Players tap green (available) or red (busy); a day lights up as "Ready for scrims" once five players are free. "I am" pins your own row, the week copies as a Discord message, upcoming scrims export as a calendar (.ics), and past scrims keep a result, review and VOD link with a running win–loss record
- **Fearless**: comfort picks by position (Top, Jungle, Mid, ADC, Support) with a fearless-draft switch. Lock champions used in game 1/2/3 and they grey out everywhere, so the team sees what's left
- **Scouting**: next opponent, their power picks and bans, weaknesses, and our gameplan, with a save button. Shows our record and last reviews against that team

English and German, switchable in the header (defaults to the browser language).

- `public/index.html`, `app.css`, `app.js` – the app; `i18n.js` – German translations (keys are the English strings)
- `public/champ-icons.json` – champion portraits
- `api/board.js` – shared storage, backed by Upstash Redis

## Setup on Vercel

1. Import this repo as a Vercel project (no build step; framework preset "Other").
2. In the project, open **Storage → Create Database → Upstash for Redis** and connect it to the project. The API works with either `REDIS_URL` or `KV_REST_API_URL` + `KV_REST_API_TOKEN`.
3. Add an environment variable `TEAM_CODE` with the code your team uses to unlock editing.
4. Optional: add `RIOT_API_KEY` (a Riot personal API key) to turn on rank sync. `RIOT_DEFAULT_PLATFORM` sets the default server (`euw1` if unset).
5. Redeploy.

Anyone with the link can view the board. Adding or changing players and comps needs the team code; each device remembers it after the first unlock.
