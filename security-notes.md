# Clara's Stories Security Notes

These are the minimum security rules for this project.

## Secrets

- Never ship API keys, access tokens, or provider secrets in `index.html`, `script.js`, `story.js`, `stories.js`, or any other browser-served file.
- Keep secrets in local environment variables for local tooling and in server or edge-function environment variables for deployed features.
- Never commit `.env` files that contain real secrets.

## Client Input Handling

- Treat all user-controlled values as untrusted, including search text, query-string parameters, and any future form inputs.
- Normalize and sanitize search text before using it.
- Validate URL parameters against strict allow-lists before using them.
- Escape dynamic text before interpolating it into HTML.

## API Design

- Any future provider call must run server-side only, preferably in an edge function or server route.
- Validate every request body on the server with a strict schema and reject malformed input early.
- Sanitize any text that will be logged, echoed, or stored.
- Return only the minimum data needed by the browser.

## Rate Limiting

- Every future public API route must have rate limiting before production use.
- Rate limiting should key on a combination of IP, user/session identifier, and route sensitivity where possible.
- Expensive routes such as search, generation, and third-party proxy routes should have tighter limits than simple reads.

## Current Repo State

- This repository is currently a static front end plus local generation scripts.
- There are no API routes in this repo to rate-limit yet.
- The current search box and story URL handling are sanitized client-side, but real abuse protection belongs in the future server or edge layer.
