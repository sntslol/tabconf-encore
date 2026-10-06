# TABCONF ENCORE

A public community petition for another year of TABCONF. Next.js App Router, TypeScript, React, and plain CSS. Two fields, no account, public names, private email fingerprints.

## Develop

Requires Node.js 22.13 or newer. Production uses Node.js 24.

```sh
npm ci
cp .env.example .env.local
# Fill the server-only values using your hosting account.
npm run dev
```

Open http://127.0.0.1:3000. The existing ignored `.env.local` is configured in this workspace. The form fails clearly if the signature service is unavailable; it never pretends to save locally.

## Check

```sh
npm test
npm run typecheck
npm run build
```

The tests exercise the real SQL schema through SQLite: privacy, simultaneous duplicate submissions, validation, bot traps, pagination, moderation, and persistent rate limits. They use a separate in-memory database and never write live petition signatures.

## Hosting and persistence

The Next.js website runs on Vercel. The small `petition-api/` Worker runs on Sites with its managed Cloudflare D1 database. This keeps petition records independent of application instances and deployments. The browser talks only to the Next.js `/api/signatures` endpoint; Next.js authenticates to the data service.

Website environment variables:

| Variable | Purpose |
| --- | --- |
| `PETITION_API_URL` | Published data service origin |
| `PETITION_API_SECRET` | Shared server credential, matching the Worker's `API_SECRET` |
| `PETITION_SERVICE_TOKEN` | Sites service access token, sent only to the data service |
| `NEXT_PUBLIC_SITE_URL` | Public website origin, for sharing metadata and the sitemap |

The data service uses `API_SECRET`, `HASH_SECRET`, and the managed `DB` binding declared in `petition-api/.openai/hosting.json`. Set its secrets through Sites environment settings. Keep `HASH_SECRET` stable: changing it without migrating existing fingerprints would allow repeat signatures. It is separate from the API credential so the API credential can be rotated independently.

To update the database schema, edit `petition-api/db/schema.ts`, run `npm run db:generate` from `petition-api/`, and publish through the Sites source workflow. Sites applies the generated Drizzle migrations. Applied migration files must not be edited.

`npm run build` creates the Next.js production build. The project is linked to the Vercel `tabconf-encore` project in the local ignored `.vercel/` folder. Deploy subsequent changes with:

```sh
npx vercel --prod --scope nirgalsofts-projects
```

To connect `tabconf.com` or `encore.tabconf.com`, add the chosen domain in Vercel and configure the DNS records Vercel supplies. Update `NEXT_PUBLIC_SITE_URL` to that origin and redeploy. The current TABCONF conference website has not been replaced.

## Privacy and moderation

Only name, signature ID, and signing time are returned publicly. The email is normalized and transformed with HMAC-SHA256; the raw email is not stored. A unique database index prevents duplicate signatures, including simultaneous requests. Network fingerprints provide a persistent limit of 15 attempts per ten-minute window. Expired rate records are removed on later submissions. Names render as text, never HTML.

Maintainers can remove spam or fulfill a removal request using the protected `DELETE /signatures/<id>` endpoint on the data service. Authenticate server-side with `Authorization: Bearer <API_SECRET>` and `OAI-Sites-Authorization: Bearer <PETITION_SERVICE_TOKEN>`. There is no public deletion endpoint or browser admin credential. Never paste these tokens into issues or commits.

Signatures are expressions of support, not email-verified identities. This intentionally keeps the petition easy to sign.

## Design

Barlow Condensed and DM Sans are served locally through `next/font/local`. Their OFL licenses are included in `public/fonts/`. The website includes mobile form shortcuts, keyboard focus states, reduced-motion support, and a PNG share preview. No analytics or advertising cookies are installed by this application.
