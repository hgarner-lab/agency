# The Agency — Vercel source

This is the latest playable pixel game, prepared for GitHub and Vercel. It includes the phone game, original character artwork, solo play, live-room API, host controls, central screen, scoring and downloadable role cards. The older question-based prototype is not included in this export.

## 1. Put the files in GitHub

Unzip the download. Upload the **source files** to the root of your new GitHub repository.

The repository’s top level should contain `package.json`, `vercel.json`, `src`, `assets`, `api`, `server`, `scripts`, `database` and `tests`. Do not upload the ZIP itself as the website. Do not put everything inside an extra nested folder.

## 2. Import the repository into Vercel

Create one Vercel project and import your GitHub repository. The frontend and API are in the same project.

| Vercel setting | Value |
| --- | --- |
| Framework preset | Other |
| Root directory | Repository root |
| Build command | `npm run build` |
| Output directory | `public` |
| Node.js version | 24.x |

The settings are already declared in `vercel.json` and `package.json`. Deploy without environment variables to try **Play solo** immediately.

The browser game has no runtime package dependencies. All fonts and character images are included.

## 3. Add the database for group games

Solo play needs no database. Group games need shared storage for rooms, player positions, points and highlights.

1. Create a Turso **libSQL-compatible database** in the [Turso dashboard](https://turso.tech/). Use a dedicated database for this game.
2. Copy its database URL and create a read/write database auth token. Use a **database token**, not an organisation API token.
3. In **Vercel → your project → Settings → Environment Variables**, add:

| Name | Value |
| --- | --- |
| `TURSO_DATABASE_URL` | Your database URL, such as `libsql://your-database-your-org.turso.io` |
| `TURSO_AUTH_TOKEN` | The database’s read/write auth token |

4. Set them for Production. Include Preview as well if you want preview deployments to use this database.
5. Redeploy the Vercel project after saving the variables.

The game creates its three tables and indexes automatically on the first group-game API request. You do not need to paste SQL into an editor. The schema is included in `database/schema.sql` for reference.

Keep these values in Vercel’s environment settings. Never add a real `.env` file or token to GitHub. `.env.example` documents the variable names and contains no credentials.

## 4. Run a session

1. Open the production URL on the laptop connected to the projector and choose **Host a game**.
2. Pick five or ten minutes and choose **Create room**. This tab is now the big screen, with your controls in a bar along the bottom (including **Full screen**). It opens on three short screens to talk through with phones away: **Welcome** (what an agency and marketing are, and the four teams), **The brief** (what a brief is, then today's one) and **How it works**. Press → or a clicker to move on, ← to go back, or **Skip to QR code**. The QR screen keeps the brief on show while players join, and the end slides ask **Did we answer the brief?** If you close the tab, **Back to your game** on the home page reopens it on the same laptop and browser.
3. Players scan the QR code, pick a look and get a random game name (they can shuffle it). They then try the controls in a short practice. The big screen shows who has joined and who is ready.
4. Choose **Start the game** (or **Start anyway** if some are still practising). The big screen shows everyone moving on one map, a race between the four departments, the leaderboard and the campaign wall. Every finished job adds a piece: an insight, an ad, a client sign-off or a launch moment.
5. Choose **End game + show job roles**, or let the clock run out. Use the arrow keys or a clicker to move through **The campaign**, **Meet the team**, **Go deeper** and **Scores**. Each player sees their own role on their phone.

To show the job role slides without playing, choose **Skip to job roles** on the home page, or open `/?view=roles`. **Play solo** on the home page is useful for testing or for showing someone the game.

During the game, three extras keep the room busy:

- **Urgent jobs:** about every 70 seconds Jamie flashes up a team on the big screen and phones. The first player to finish a job there gets double points.
- **Team-ups:** when two players in different teams finish jobs within 20 seconds of each other, both get 40 bonus points.
- **Make it yours:** after a Creative task, players choose the ad's background, trainer colourway, format and sticker.

When the game ends, players vote on their phones for the best ad someone else made. The campaign slide shows the leader live. Jamie reacts on the big screen to urgent jobs, team-ups and finished work.

Players need to complete two jobs to get a role card. Practice does not count towards points or roles. The room cap is 50. Player names come from a fixed list, so nothing typed by a player appears on the big screen.

## The twelve agency tasks

New games have three different tasks in each department. Return to a teammate to get the next one. The first Strategy, Creative and Production tasks use floor items; later tasks start at the teammate.

| Role | First visit | Second visit | Third visit |
| --- | --- | --- | --- |
| Strategy | Turn research into an insight | Write Audience → Problem → Goal | Choose a priority and a way to check it |
| Creative | Build a campaign concept | Revise an ad using feedback | Develop a launch experience |
| Accounts | Agree a realistic scope | Manage a late change | Clarify a request and hand it over |
| Production | Plan a shoot within £900 | Put a schedule in order | Put a backup location into action |

On the phone, players tap short tiles to build three parts of a work product. They can change a tile before submitting. Clear feedback lets them revise a plan without losing points; creative tasks and the budget task allow several valid solutions. Accounts players must deliver the agreement to the named teammate to finish. The clock stays visible while building work, and the host can pause everyone.

Completed work appears on the campaign wall. Click a wall item to see the player's plan. Players with a role card can also review their completed work below their result. Role classification still reflects the jobs they chose; it is not a test of career aptitude. Existing saved games retain their original rules; start a new game to use the expanded tasks.

## Troubleshooting

**Solo works, but Create room says a database is needed:** add both Turso environment variables, then redeploy.

**The database could not connect:** check the database URL, token, database type and token read/write access in Turso. A database auth token is different from an organisation API token. The Vercel Function logs contain the database error without printing the auth token.

**404 immediately after importing:** check that `package.json` and `vercel.json` are at the repository root. Use Other, `npm run build`, and output `public`.

**Players are asked to log in to Vercel:** check the deployment’s access/protection settings and make sure you are sharing the intended production URL.

**API health:** opening `/api/arcade/health` on your deployed site returns whether the two database settings are present. This checks configuration presence, not database connectivity.

**Phone disconnected:** keep the tab open. Movement is predicted locally; input batches and the scoreboard retry over HTTP. A prolonged disconnection pauses movement until pending inputs sync.

## Development and checks

Requires Node 24.x. No application dependencies.

```
npm install
npm run build
npm test
```

`npm test` also builds the frontend before running. The suite includes the game rules and solo controller, plus the Turso HTTP transport exercised against a local SQLite protocol emulator. The adapter and endpoint follow the current official Vercel/Turso contracts. The source is configured for the linked Vercel project. Automated checks cover practice, readiness, two-thumb input, stable targets, scoring and the Turso adapter. Physical-phone QA and a simultaneous-phone load test are still needed before the event.

## Project files

| Path | Purpose |
| --- | --- |
| `src/arcade-app.js` | Phone, solo, host and central-screen UI |
| `src/agency-tasks.js` | Twelve tasks, plan checks and campaign work products |
| `src/arcade-world.js` | Movement, pickups, jobs, points and roles |
| `src/arcade-renderer.js` | Pixel map, characters and poster drawing |
| `src/arcade-server.js` | Authoritative room and input API |
| `api/arcade/[action].js` | Vercel Function entry point |
| `server/turso.js` | Server-only database connection |
| `database/schema.sql` | Idempotent live-room schema |
| `scripts/build.mjs` | Builds the browser files into `public` |
| `assets` | Included character sheets, fonts and font license |
| `tests` | Automated game, UI-controller and deployment-adapter checks |

This Vercel version uses short HTTP updates: shared-room updates about every 1.5 seconds and phone input batches about every 650 ms. It has no WebSocket server or Cloudflare dependency. Game positions and scoring remain server-checked. The earlier hosted prototype is unchanged.

Rooms expire after twelve hours. Expiry blocks access; it does not delete event records automatically. Remove event data from your database after use as appropriate.

## References

- [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [Turso SQL over HTTP reference](https://docs.turso.tech/sdk/http/reference)

The 3D character sheets were generated for this project. In-game pixel art is code-native. Nimbus fonts are URW Base35 fonts, supplied under AGPL with font exception; retain `assets/FONT-LICENSE.txt` when distributing.


## McCann branding

The supplied white-on-black McCann wordmark is included unchanged as `assets/mccann-logo.png`. A self-contained SVG uses the original image as a luminance mask to remove its background without redrawing the letters. It appears white on dark pages and black directly on the role-card colours. Downloaded cards include the McCann mark, game name, chosen character, role and score, and use a `McCann-The-Agency-` filename. `src/role-card.js` draws the PNG itself so the branding is embedded in the saved image.
