# Five-Stack Board

Team planner for a League of Legends five-stack.

- **Roster**: players (starters and subs), roles, champion pools by tier, strengths and weaknesses
- **Team map**: role coverage, champion depth per position, shared champions, damage spread
- **Comps**: five-player drafts checked against each player's pool
- **Draft**: tournament draft simulator (6 bans, 6 picks, 4 bans, 4 picks in the real order) with our pools, fearless locks and scouted threats marked; save the result as a comp or lock it into the fearless series. When the enemy locks a champion, the side panel lists answers to it (the team's own counters first, then a built-in list), with who on the roster plays each one
- **Fearless** (on the Draft page): a fearless-draft switch with game 1/2/3. Champions used in a game are locked and grey out everywhere; the series bar shows what's used, and a collapsible section lists the comfort picks still open in each position
- **Rank sync**: Solo/Duo and Flex rank, LP and win rate from the Riot API for every player with a Riot ID
- **Match history**: each player's last 30 ranked games, shown per champion (games and win rate) on their card, with one-click suggestions to add champions they play a lot to their pool or move them up from Learning/Pocket
- **Schedule**: week view (Mon–Sun) of scrims and availability. Players tap green (available) or red (busy); a day lights up as "Ready for scrims" once five players are free. "I am" pins your own row, the week copies as a Discord message, upcoming scrims export as a calendar (.ics), and past scrims keep a result, review and VOD link with a running win–loss record
- **Stats**: scrim record by side, comp, opponent and champion, recent form, and the enemy picks you lose to (from the side, comp and picks entered with each scrim result)
- **Scouting**: next opponent, their power picks and bans, weaknesses, and our gameplan, with a save button. Shows our record and last reviews against that team. Paste their Riot IDs to pull each player's rank, main role and most-played champions; those count as threats in the draft

English and German, switchable in the header (defaults to the browser language).

- `public/index.html`, `app.css`, `app.js` – the app; `i18n.js` – German translations (keys are the English strings)
- `public/champ-icons.json` – champion portraits
- `api/board.js` – shared storage, backed by Upstash Redis
- `api/rank.js`, `api/games.js`, `api/scout.js` – rank sync, match history and opponent scouting; `api/_lib/riot.js` holds the shared Riot API helpers

## Setup on Vercel

1. Import this repo as a Vercel project (no build step; framework preset "Other").
2. In the project, open **Storage → Create Database → Upstash for Redis** and connect it to the project. The API works with either `REDIS_URL` or `KV_REST_API_URL` + `KV_REST_API_TOKEN`.
3. Add an environment variable `TEAM_CODE` with the code your team uses to unlock editing.
4. Optional: add `RIOT_API_KEY` (a Riot personal API key) to turn on rank sync, match history and scouting with Riot. `RIOT_DEFAULT_PLATFORM` sets the default server (`euw1` if unset).
   A development key allows 100 requests per 2 minutes and expires after 24 hours. Match history loads in batches of 30 games, so the first load for a full team takes a few minutes; if Riot's limit is reached, press "Load match history" again later and it continues where it stopped.
5. Redeploy.

Anyone with the link can view the board. Adding or changing players and comps needs the team code; each device remembers it after the first unlock.
