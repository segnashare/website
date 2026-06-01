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

**Sans cette config, les changements Sanity ne s’affichent pas sur le site** (cache + webhook inactif).

### 1. Secret sur Vercel

Vercel → projet website → **Settings → Environment Variables** :

```
SANITY_REVALIDATE_SECRET=your-long-random-secret
```

Puis **redéployer**.

Vérifier : `GET https://www.segnashare.com/api/revalidate` → `{"ok":true,"webhookReady":true}`.

### 2. Webhook Sanity

Sanity Manage → API → Webhooks :

- URL : `https://www.segnashare.com/api/revalidate?secret=your-long-random-secret`
- Dataset : `production`
- Trigger : create / update / delete / **publish**
- Method : `POST`

### 3. Publier dans Sanity

Le site lit la version **publiée** (bouton Publish), pas le brouillon.

Avec webhook OK : mise à jour en quelques secondes. Sans webhook : filet de sécurité ~60 s.
