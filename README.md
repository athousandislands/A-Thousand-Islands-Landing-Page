# A Thousand Islands redesign

Environment setup only. Visual direction, layouts, interactions and content await creative direction. The supplied `01_Studio_and_Website_Brief.pdf` is the primary project reference.

This checkout belongs to `athousandislands/A-Thousand-Islands-Landing-Page`. Work on `redesign`; do not merge or deploy to production without explicit approval. The existing root HTML files and media are preserved. Vite serves only `site/`, and builds only that directory into `dist-redesign/`.

## Local development

Use Node.js 24 (`nvm use` if available), then from this directory:

```sh
npm ci
npm run dev
```

Open http://localhost:5174. The server also prints a network URL; open that URL on a phone connected to the same Wi-Fi network. Keep the server running while testing.

## Build preview

```sh
npm run build
npm run preview
```

Open http://localhost:4174, or the printed network URL on a phone. This serves the built output separately from the development server. Rebuild and reload after changes.

## Hosted preview

Vercel configuration is scoped to this branch and builds `site/` into `dist-redesign/`. Use only a Preview deployment of `redesign` on the existing Vercel project. Never use a production deployment, promote a preview, or assign the production domain during redesign work. Preview pages request no indexing.

No application dependencies, motion system, CMS, or design system have been selected. Vite is development tooling only.
