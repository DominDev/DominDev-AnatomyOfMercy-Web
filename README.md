# Anatomy of Mercy Web

Official website source for **Anatomy of Mercy**.

## Technology

- Eleventy for static HTML generation
- Sass and BEM for styles
- Vanilla JavaScript for progressive enhancement
- Cloudflare Workers with Static Assets as the target hosting platform

## Local development

Use Node.js 24 when possible.

```text
npm install
npm run dev
```

The development server provides:

- English at `/`
- Polish at `/pl/`

## Production build

```text
npm run build
npm run check
```

The production output is written to `dist/`. This directory is generated and must not be edited or committed.

## Content and assets

Do not add API keys, passwords, personal data, unapproved artwork or draft publications to this repository. Public story files and images must be approved before they are copied into the website source.

Visual assets and their source filenames are recorded in [ASSETS.md](ASSETS.md).

## Copyright and licensing

No open source license is granted by this repository. See [NOTICE.md](NOTICE.md).
