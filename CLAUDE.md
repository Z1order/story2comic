# Story 2 Comic

A static web application that converts user stories into comic panels using free AI services.

## Project Overview

Users input a story, the app parses it into scenes using Pollinations.ai (GPT), then generates comic-style images for each panel using Stable Horde (crowdsourced Stable Diffusion). Runs entirely in the browser with no backend required.

## Architecture

```
Frontend (Vanilla JS) → Pollinations.ai (text) → Stable Horde (images)
```

- **No backend** - all API calls made directly from browser
- **No API keys required** - uses anonymous/free tier services
- Hosted on GitHub Pages from `/docs` folder

## Key Files

| File | Purpose |
|------|---------|
| `docs/index.html` | Main page with story input form, panel selector, art style dropdown |
| `docs/app.js` | Core logic: story parsing, image generation, comic display |
| `docs/styles.css` | Dark theme UI, comic panel styling |
| `backend/` | Legacy Node.js backend (not used in production) |

## External Services

### Pollinations.ai (Story Parsing)
- Endpoint: `https://text.pollinations.ai/{prompt}?model=openai`
- Free, no authentication
- Returns JSON with panel descriptions

### Stable Horde (Image Generation)
- Endpoint: `https://stablehorde.net/api/v2`
- Anonymous API key: `0000000000`
- Async job submission → polling for completion
- 512x512 images, ~30-60 seconds per image
- Rate limit: 2 requests/second (1.5s delay between panels)

## Art Styles

8 available styles defined in `ART_STYLES` object: comic, manga, pixar, watercolor, noir, retro, fantasy, minimal.

## Common Issues

1. **Censored images**: Stable Horde may censor content. App retries with simpler prompt, then falls back to placeholder.
2. **Slow generation**: Anonymous users get lower priority. Each panel takes 30-60 seconds.
3. **Nested panels in images**: Negative prompts prevent this but occasionally still occurs.
4. **Rate limiting**: 1.5s delay between requests prevents 429 errors.

## Commands

```bash
# Local development (static files)
cd docs && python3 -m http.server 8000

# Or use any static file server
npx serve docs

# Deploy (GitHub Pages)
git add . && git commit -m "message" && git push
```

## Live Site

https://z1order.github.io/story2comic/
