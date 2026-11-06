# The War Room — Vercel source

This is the latest playable pixel game, prepared for GitHub and Vercel. It includes the phone game, original character artwork, solo play, live-room API, host controls, central screen, scoring and downloadable role cards. The older question-based prototype is not included in this export.

## 1. Put the files in GitHub

Unzip the download. Upload the **contents of the `war-room-vercel` folder** to the root of your new GitHub repository.

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

## 4. Try a group game

1. Open the production URL and choose **Host a group game**.
2. Create a five- or ten-minute room.
3. Choose **Open big screen** and put that tab on the projector. Keep the host tab for controls.
4. Players scan the QR code on their phones and choose a nickname and character.
5. Start the game. The shared screen shows player spotlights, scores, completed jobs and posters.
6. End the game to reveal the roles, or let the clock run out.

Each player gets their own map. The room cap is 50. Points and role classification are separate: the work and items a player chooses shape their role.

Use the production URL when testing student entry. Confirm that your Vercel deployment access settings allow your intended visitors.

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

`npm test` also builds the frontend before running. The suite includes the game rules and solo controller, plus the Turso HTTP transport exercised against a local SQLite protocol emulator. The adapter and endpoint follow the current official Vercel/Turso contracts. This export has **not** been deployed to your Vercel or connected to your own Turso account. Browser/device QA and a simultaneous-phone load test are still needed before the event.

## Project files

| Path | Purpose |
| --- | --- |
| `src/arcade-app.js` | Phone, solo, host and central-screen UI |
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
