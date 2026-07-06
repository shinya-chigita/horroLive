<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1408e784-3ab1-47a0-8f8b-0d1046475255

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

> Note: This is a fully client-side React + Vite app. The `GEMINI_API_KEY` /
> `@google/genai` scaffolding from the AI Studio template is currently unused,
> so no environment variables are required to build or run it.

## Deploy (Cloudflare Pages + GitHub Actions CI/CD)

This repo auto-deploys to **Cloudflare Pages** via GitHub Actions
([.github/workflows/deploy.yml](.github/workflows/deploy.yml)):

- **Push to `main`** → production deploy
- **Open a pull request** → preview deploy (unique preview URL per PR)

### One-time setup: add GitHub Secrets

The workflow needs two repository secrets. Add them under
**GitHub → repo → Settings → Secrets and variables → Actions → New repository secret**,
or with the GitHub CLI:

```bash
# 1. A Cloudflare API token with the "Cloudflare Pages: Edit" permission.
#    Create it at: https://dash.cloudflare.com/profile/api-tokens
#    (use the "Cloudflare Pages — Edit" template)
gh secret set CLOUDFLARE_API_TOKEN --repo shinya-chigita/horroLive

# 2. Your Cloudflare Account ID (found on the Cloudflare dashboard sidebar,
#    or via `wrangler whoami`).
gh secret set CLOUDFLARE_ACCOUNT_ID --repo shinya-chigita/horroLive
```

On the first push to `main` after the secrets are set, the workflow creates the
`horrolive` Pages project automatically and publishes it. The production URL will
be `https://horrolive.pages.dev`.

### Build settings (for reference)

| Setting            | Value           |
| ------------------ | --------------- |
| Build command      | `npm run build` |
| Build output dir   | `dist`          |
| Framework          | Vite (React)    |
