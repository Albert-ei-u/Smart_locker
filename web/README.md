# RFID Smart Locker — Next.js Admin Dashboard

Modern, responsive web admin dashboard for the **RFID Smart Locker** project (Team 5 · Y2 Robotics Club), built with Next.js (App Router, TypeScript, Tailwind CSS).

---

## 1. System Architecture

```
Browser (Admin)
      │
      ▼
┌──────────────────────────────────────────────┐
│  Next.js Server (:3000 / :8006 in Docker)    │
│  • App Router (RSC + Client SWR)             │
│  • Same-Origin BFF Route Handlers (/api/*)   │
│  • Server-side Cheerio HTML Users Scraper    │
└──────────────┬───────────────────────────────┘
               │ (Server-to-Server, no CORS)
               ▼
┌──────────────────────────────────────────────┐          Direct HTTP
│  Flask Backend (:5001 / :5000 in Docker)     │ ◄───────────────────────── ESP8266 (NodeMCU)
│  • /api/status (Locker state & logs)         │    (X-Device-Key, :8005)    • RC522 RFID Reader
│  • /users/add, /users/delete                 │                             • SG90 Servo
│  • /lockers/<id>/assign|release|open         │                             • POST /api/scan
│  • Legacy HTML Dashboard (/)                 │                             • GET  /api/poll
│  • SQLite Database (locker.db)               │                             • POST /api/door
└──────────────────────────────────────────────┘
```

### Why a Backend-for-Frontend (BFF)?
1. **CORS Isolation:** The Flask backend exposes no CORS headers. Running mutations directly from the browser would be blocked. All backend calls route server-side via Next.js route handlers.
2. **Clean JSON Contract:** Flask returns `302 Found` redirects with URL-encoded messages (`/?msg=...`). The BFF catches these server-side and translates them into typed `{ ok: boolean, message: string }` JSON responses.
3. **Users List Bridge:** The Flask JSON API (`/api/status`) does not return registered users who lack an assigned locker. The Next.js server parses the full user directory directly from the legacy HTML page (`GET /`) using Cheerio.
4. **Security & Validation:** Whitelists allowable backend endpoints, validates tag formats and limits input length, and blocks cross-origin form submissions. The `DEVICE_KEY` is never exposed to the browser or Next.js app.

---

## 2. Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `BACKEND_URL` | `http://127.0.0.1:5001` | URL of the Flask backend. In Docker, set to `http://locker:5000`. |
| `PORT` | `3000` | Port for the Next.js server. |
| `NODE_ENV` | `production` | Node environment. |
| `NEXT_TELEMETRY_DISABLED` | `1` | Disables telemetry calls at build and runtime. |

---

## 3. Known limitations

- There is no authentication on any admin action in the legacy or Next.js dashboard.
- There is no device heartbeat, so the "Server connected" pill only means the browser can reach Next.js and Flask, not that the physical locker board is healthy.
- The users list is read from the legacy dashboard HTML and depends on `frontend/templates/dashboard.html` staying unchanged.
- The feed shows the 15 newest events from the server plus any activity accumulated in the browser during the current session.
- Remote-opening Locker 2 or 3 shows the door as open for roughly 20 s because only Locker 1 has real hardware attached.

## 4. Design system

The dashboard is a single-page operations view styled with local CSS tokens in
`app/globals.css`. The dark theme is the default; the header toggle stores the
selection in `localStorage` under `theme`.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0a0a0b` | `#f5f5f6` | Page background |
| `--surface` | `#111113` | `#ffffff` | Cards and controls |
| `--surface-2` | `#18181b` | `#f0f0f2` | Subtle inset surfaces |
| `--border` | `#6b6b72` | `#85858e` | Accessible dividers and outlines |
| `--text` / `--text-muted` | `#f4f4f5` / `#a1a1aa` | `#18181b` / `#5b5b66` | Primary and secondary text |
| `--accent` | `#e5383b` | `#d32f32` | Brand, focus, primary action, denied |
| `--success` | `#22c55e` | `#15803d` | Available and successful actions |
| `--warning` | `#f59e0b` | `#a64b00` | Open doors and pending state |

Occupied lockers use neutral styling. Status labels always include text and an
icon as well as color. To change the brand accent, update `--accent` and
`--accent-soft` under both theme selectors; the Tailwind color aliases and
shared controls follow those tokens automatically.

Shared presentation primitives are `SectionCard`, the KPI cards, the locker
status donut, and reusable button, control, table, banner, toast, and dialog
classes. Charts are inline SVG and use only status data already returned by the
backend; no external fonts, images, or chart libraries are required.

## 5. Suggested backend changes (not applied)

- `GET /api/users` to replace HTML scraping for user registration data.
- Dashboard authentication for all admin actions.
- A device heartbeat endpoint for hardware health checks.
- A configurable activity log limit.
- Exposing `pending_open` in `/api/status`.
- Filtering `/api/poll` by locker so clients only receive relevant events.

## 6. How to Run Locally

### Prerequisites
- Node.js 22 LTS
- Python 3.10+ with venv

### Terminal 1: Flask Backend (with a throwaway database)
From the project root (`Smart_locker/`):
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt

$env:DB_PATH = "$PWD\data\test.db"
$env:DEVICE_KEY = "test-key"
$env:NUM_LOCKERS = "3"
python -m flask --app backend/app.py run --host 127.0.0.1 --port 5001 --no-reload
```

### Terminal 2: Next.js Frontend
```powershell
cd web
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

> Production runs through Docker with `docker compose -f docker-compose.yml -f docker-compose.web.yml up -d --build` because `output: "standalone"` makes plain `next start` print a warning. Use `npm run dev` for development.

---

## 7. How to Run with Docker Compose

Run the existing stack alongside the new Next.js dashboard using the compose override:

```powershell
# Copy .env if not already present
Copy-Item .env.example .env

# Build and start both services
docker compose -f docker-compose.yml -f docker-compose.web.yml up -d --build
```

- **New Next.js Dashboard:** `http://localhost:8006`
- **Legacy Fallback Dashboard:** `http://localhost:8005`
- **ESP8266 Hardware:** Targets `http://<server-ip>:8005` with `X-Device-Key`

---

## 8. Testing & Quality Checks

Run all validation suites from `web/`:

```powershell
npm test          # Run Vitest unit tests (tag logic, message classifier, HTML scraper)
npm run typecheck # Run TypeScript compiler check (tsc --noEmit)
npm run lint      # Run ESLint
npm run build     # Verify Next.js standalone production build
```

---

## 9. Users Scraper Details

Because `/api/status` omits users who do not hold a locker, `lib/users-scraper.ts` parses `GET /` using `cheerio`:
- Primary: extracts `name` from `td strong` and `tag` from `td code` in the Users table.
- Sanity fallback: inspects `<select name="tag">` options.
- Automatically decodes HTML entities (e.g. `&lt;b&gt;` -> `<b>`).
- If parsing fails, returns HTTP `502 { error: "users_unreadable" }` to trigger an explanatory banner in the UI rather than displaying an empty state.
