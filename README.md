# Client Management (Super Admin)

A starter admin panel for the developer who builds and delivers projects. It answers three questions:

1. **Is each project running?** Health checks ping every project's URL.
2. **Is a delivered project running in more than one place?** Delivered copies check in with a licence key; a second site is flagged.
3. **What do I do about it?** Block or approve a copy, suspend a licence, or replace the key, from the UI or over REST.

## Quick start

```bash
npm install
npm run setup          # creates .env.local (secrets, signing keys) and .first-login.txt
npm run dev            # http://localhost:3000
```

Sign in with the email and password in `.first-login.txt` (git-ignored), then delete that file.
To choose your own login: `node scripts/setup.mjs you@example.com "a long password"` before the first run, or later
`npm run hash-password -- "new password"` and paste the result into `ADMIN_PASSWORD_HASH`.

Locally the data lives in `data/local.db` (SQLite). For Vercel, create a free [Turso](https://turso.tech) database and set
`DATABASE_URL` and `DATABASE_AUTH_TOKEN`; the same code runs on both.

## How the two-copies check works

```
Delivered project ──POST /api/v1/verify {key, host}──▶ Super Admin
                  ◀── signed answer (valid / blocked) ──
```

* The first site that uses a key becomes the approved copy.
* A different site using the same key is recorded as **Under review** and raises an alert. By default it keeps working
  until you decide (policy `warn`); set the policy to `block` to reject new sites automatically.
* You can also set a **licensed domain**; any other domain is treated as a second copy.
* `localhost`, `127.*` and `*.local` are ignored so the client's developers are never flagged.
* Answers are signed with an Ed25519 private key that only this panel holds. A copy cannot fake approval.
* If this panel is unreachable the delivered project keeps its last good answer for 72 hours (configurable).

Add `client-sdk/license-check.ts` to the delivered project, set the three environment variables shown on the project page,
and call `checkLicense(host)` from a server component or route. The panel never receives patient or customer data, only the key, host and version.

> No licence check can stop someone who has the full source code from deleting it. Pair this with delivering a build or
> hosting the project from your own account, and keep the check in more than one place in the delivered code.

## REST API (manage any project)

Create a token in **Settings**, then send `Authorization: Bearer <token>`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET, POST | `/api/v1/admin/clients` | List or create clients |
| GET, PATCH, DELETE | `/api/v1/admin/clients/:id` | One client and its projects |
| GET, POST | `/api/v1/admin/projects` | List or create projects (create returns the licence key) |
| GET, PATCH, DELETE | `/api/v1/admin/projects/:id` | Health history, licence, copies, events (`?reveal=1` shows the full key) |
| POST | `/api/v1/admin/projects/:id/actions` | `health-check`, `suspend`, `reactivate`, `rotate-key`, `set-policy`, `set-domain` |
| PATCH, DELETE | `/api/v1/admin/instances/:id` | `{"status":"blocked"\|"allowed"}` or remove a copy |
| GET | `/api/v1/admin/events` | `?open=1` for unresolved alerts |
| POST | `/api/v1/verify` | Public. Called by delivered projects |

## Security notes

* Login is a single owner account. Passwords are stored as scrypt hashes, sessions are signed httpOnly cookies, and five
  failed sign-ins from one address lock it out for 15 minutes.
* Every page and server action re-checks the session; `src/proxy.ts` is only an early redirect.
* API tokens are stored as SHA-256 hashes and shown once.
* Health checks request the URL you enter, so only add URLs you control.
* The public verify endpoint is not rate limited. On Vercel, add a firewall rate-limit rule for `/api/v1/verify`.

## Deploy

Push to your own Vercel project, set the environment variables from `.env.example`, and use Turso for `DATABASE_URL`.
`vercel.json` runs `/api/cron/health` every 6 hours (Vercel Hobby allows daily crons, so change the schedule if needed).
