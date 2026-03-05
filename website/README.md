# Segna Website

Frontend website for Segna, powered by Next.js and Sanity.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.example .env.local
```

3. Start development server:

```bash
npm run dev
```

## Pages

- `/` uses `homePage` document from Sanity.
- `/newsroom` uses `newsroomPage` and `post` documents from Sanity.

## Instant CMS sync (Sanity webhook)

This project includes `POST /api/revalidate` to trigger immediate cache refresh after content changes.

1. Set a secret in Vercel / local env:

```bash
SANITY_REVALIDATE_SECRET=your-long-random-secret
```

2. In Sanity Manage > API > Webhooks, create a webhook:

- URL: `https://YOUR_DOMAIN/api/revalidate?secret=your-long-random-secret`
- Trigger: all document changes (create/update/delete/publish) with no type filter
- Method: `POST`

3. After each content change, the root layout is revalidated so all routes refresh, including `/` and `/newsroom`.
