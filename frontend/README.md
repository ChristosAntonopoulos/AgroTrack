# Olive Lifecycle Web Frontend

React + TypeScript web app for field owners and producers.

## Connect to the backend (local dev)

**Terminal 1 — API + MongoDB**

```bash
cd backend
dotnet run --project OliveLifecycle.API
```

API listens on `http://localhost:5149` (and `https://localhost:7261`).

**Terminal 2 — Frontend**

```bash
cd frontend
npm install
npm start
```

| Variable | Default | Purpose |
|----------|---------|---------|
| `REACT_APP_USE_MOCK_DATA` | `false` in `.env` | `true` = demo data, no backend |
| `REACT_APP_API_URL` | empty in dev | Leave empty to use dev proxy; set for direct/staging URLs |
| `REACT_APP_PROXY_TARGET` | `http://localhost:5149` | Backend target for `setupProxy.js` |

### Scripts

- `npm start` — API mode (reads `.env`)
- `npm run start:api` — API mode (explicit)
- `npm run start:mock` — Demo mode with local mock data

### First login (API mode)

Register a field owner at `/register`, then create fields and tasks through the UI. Demo quick-login buttons only appear in mock mode.

## Build for staging/production

```bash
REACT_APP_USE_MOCK_DATA=false REACT_APP_API_URL=https://api.example.com npm run build
```

Ensure the API `Cors:AllowedOrigins` includes your frontend URL.

See [backend/ARCHITECTURE.md](../backend/ARCHITECTURE.md) for API endpoints and configuration.
