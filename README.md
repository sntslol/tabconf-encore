# TABCONF ENCORE

A public community petition for another year of TABCONF. Next.js App Router, TypeScript, React, and plain CSS. Public names, required private email, and no account. Emails are only for letting signers know if the petition gets enough signatures.

The live progress bar aims for 1,000 signatures and updates with the signature count. Signers can optionally choose “Only show my initials.” The data service converts the name before storage, so only initials are saved and returned for those signatures. Existing signatures keep their original public names. Reaching the goal does not automatically send email or guarantee another event.

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

The data service uses `API_SECRET`, `HASH_SECRET`, and the managed `DB` binding declared in `petition-api/.openai/hosting.json`. Set its secrets through Sites environment settings. Keep `HASH_SECRET` stable: changing it without migrating fingerprints would allow repeat signatures and prevent decryption of existing notification emails. The encryption key is derived using a separate HMAC domain, and each email uses a random AES-GCM nonce bound to its signature ID. This secret is separate from the API credential so the API credential can be rotated independently.

To update the database schema, edit `petition-api/db/schema.ts`, run `npm run db:generate` from `petition-api/`, and publish through the Sites source workflow. Sites applies the generated Drizzle migrations. Applied migration files must not be edited.

`npm run build` creates the Next.js production build. The project is linked to the Vercel `tabconf-encore` project in the local ignored `.vercel/` folder. Deploy subsequent changes with:

```sh
npx vercel --prod --scope nirgalsofts-projects
```

The petition's canonical domain is `https://savetabconf.com`. Both `savetabconf.com` and `www.savetabconf.com` are connected to this Vercel project; `www` permanently redirects to the apex with HTTP 308. `NEXT_PUBLIC_SITE_URL` is set to the canonical origin in production, and sharing links, page canonicals, Open Graph URLs, robots, and the sitemap use it.

DNS is managed by the current external registrar nameservers. On October 6, 2026, Vercel confirmed that the existing `@` A record (`76.76.21.21`) and `www` CNAME (`cname.vercel-dns.com`) are valid and HTTPS works. No registrar changes were needed. Vercel's current preferred values are below; it marks switching from the existing records as optional. Use the latest values in the project's Domains screen if they change.

| Type | Name | Preferred value returned by Vercel |
| --- | --- | --- |
| A | `@` | `216.150.1.1` |
| A | `@` | `216.150.16.1` |
| CNAME | `www` | `1e531deca1f4bef9.vercel-dns-016.com` |

The earlier `tabconf.com` attachment still exists in Vercel, but its DNS continues to serve the official conference site. The petition's domain setup does not change that conference domain.

## Privacy and moderation

Only name, signature ID, and signing time are returned publicly, including after a successful submission. Email is required by the form and server, and stored encrypted. It is only for notifying signers if the petition gets enough signatures, not for a newsletter or marketing. The new column is nullable to preserve earlier signatures that were collected without email; missing or blank email is rejected for new signatures. After a successful signature, Next.js sets a random, anonymous `encore-signer` cookie for one year, scoped to `/api/signatures` with HttpOnly, SameSite=Lax, and Secure on HTTPS. The service stores only an HMAC-SHA256 fingerprint of this identifier, with a unique database index to prevent repeat signatures from the same browser. Different people can use the same name; names are not unique. Network fingerprints provide a persistent limit of 100 attempts per minute, allowing attendees on shared conference Wi-Fi to sign. Expired rate records are removed on later submissions. Names render as text, never HTML.

Maintainers can remove spam or fulfill a removal request using the protected `DELETE /signatures/<id>` endpoint on the data service. Authenticate server-side with `Authorization: Bearer <API_SECRET>` and `OAI-Sites-Authorization: Bearer <PETITION_SERVICE_TOKEN>`. There is no public deletion endpoint or browser admin credential. Never paste these tokens into issues or commits.

For the milestone notification, maintainers can retrieve opted-in contacts from the protected data-service `GET /notification-contacts?offset=0` endpoint with those same credentials. It returns at most 100 contacts per page plus `hasMore`; increase the offset by 100 while `hasMore` is true. The public Next.js API never exposes this endpoint. Deduplicate addresses before sending the milestone update, keep exports private, and remove private exports when no longer needed. Deleting a signature also deletes its associated email. This change collects opt-ins; no automatic email sender or signature threshold is configured.

Signatures are expressions of support, not verified identities. Browser-based duplicate detection is a convenience, not proof of one signature per person: cookies can be cleared and devices can be shared. This intentionally keeps the petition easy to sign. The appended database migration renames the old fingerprint column while preserving existing public signatures.

## Design

The design follows [TABCONF’s current website](https://8.tabconf.com): its charcoal surfaces, green links, amber buttons, sidebar layout, and header treatment. Instrument Sans and JetBrains Mono are served locally through `next/font/local`; their OFL licenses are included in `public/fonts/`. The original TABCONF 8 keycap logo and poster are served from `public/brand/`. The poster is credited to [NoGood](https://nogood.studio), as on the official website. These existing edition assets identify the community the petition supports; ENCORE is a request for another year, not an announced event.

The website includes mobile form shortcuts, keyboard focus states, reduced-motion support, and a branded PNG share preview. No analytics or advertising cookies are installed by this application.

Regenerate `public/og.png` from the original brand assets with `npm run generate:share-image` after changing the share image layout in `scripts/generate-share-image.tsx`.
