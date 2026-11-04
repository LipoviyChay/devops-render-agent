# Nexus — AI Workspace

Real chat UI for the DevOps homework. The browser sends conversation history to
`POST /api/chat`. The Node.js server calls Pollinations' anonymous legacy chat
endpoint and returns its actual generated answer. There are no canned answers.
The app is a conversational assistant; it does not execute cloud commands.

## Run

Node.js 22 or later:

```sh
npm ci
npm start
```

Render: Free instance, build `npm ci`, start `npm start`. The server uses
`PORT` and binds to `0.0.0.0`. For this public-repository Render service, launch
deploys manually; a Git push alone does not trigger a deploy.

## API and limitations

- Provider: Pollinations, `https://text.pollinations.ai/openai` (POST).
- Anonymous free tier was tested on 2026-11-04. It allows approximately one
  response per 45 seconds per outbound IP. Shared IP limits and availability
  can change. The modern Pollinations API requires a key and is not used here.
- Model selection is provider-controlled. The UI does not claim a specific model.
- The backend limits simultaneous requests, enforces a cooldown, caps request
  size/history, times out upstream requests and reports provider limits honestly.
- No prompts or replies are logged on this server or persisted in browser storage.
  Messages are sent to Pollinations for inference; do not send secrets.
- AI output is rendered as text, never executable HTML. Chats have in-memory
  context; refresh or New dialogue clears it. This is a public homework demo.
- Endpoints: `GET /api/health`, `POST /api/chat` with `{messages:[{role,content}]}`.

Dependency: Express. Node's built-in fetch makes the upstream request; no
unofficial ChatGPT browser automation packages or user cookies are needed.
