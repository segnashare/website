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
