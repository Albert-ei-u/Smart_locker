# RFID Smart Locker

Team 5's connected locker system uses an ESP8266, RFID authentication, a Flask backend, and a web dashboard.

## Repository layout

```text
team_5/
├── arduino/                 # ESP8266 and RFID firmware
│   ├── locker_wifi.ino      # Main networked firmware
│   └── locker_step2.ino     # Standalone hardware test firmware
├── backend/                 # Flask API and Python dependencies
│   ├── app.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                # Browser-facing dashboard files
│   └── templates/
│       └── dashboard.html
├── data/                    # Local SQLite data; not committed
├── docker-compose.yml
├── .env.example
└── README.md
```

## Responsibilities

- **Frontend:** dashboard layout, styles, and browser JavaScript in `frontend/`.
- **Backend:** Flask routes, authentication, database access, and server-rendered pages in `backend/`.
- **Arduino:** RFID reader, servo control, Wi-Fi communication, and hardware configuration in `arduino/`.

## Run with Docker

Copy the example environment file and set a private device key:

```powershell
Copy-Item .env.example .env
# Edit .env and replace change-me with a private key
docker compose up -d --build
```

Open the dashboard at `http://localhost:8005`.

Useful commands:

```powershell
docker compose ps
docker compose logs -f
docker compose down
```

## Run the backend locally

From the project root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt

$env:DB_PATH = "$PWD\data\locker.db"
$env:DEVICE_KEY = "change-me"
$env:NUM_LOCKERS = "3"
python -m flask --app backend/app.py run --host 127.0.0.1 --port 5001 --no-reload
```

Open `http://localhost:5001`.

## Arduino setup

Open `arduino/locker_wifi.ino` in Arduino IDE for the networked version. Configure `WIFI_NAME`, `WIFI_PASSWORD`, `SERVER`, and `DEVICE_KEY` before uploading. Select **NodeMCU 1.0 (ESP-12E Module)**.

Use `arduino/locker_step2.ino` only for the standalone RFID and servo hardware test.

Never commit Wi-Fi passwords, real device keys, `.env`, or the local database.

### Hardware wiring

| Component | ESP8266 pin |
|---|---|
| RC522 SDA | D8 |
| RC522 SCK | D5 |
| RC522 MOSI | D7 |
| RC522 MISO | D6 |
| RC522 RST | D3 |
| Servo signal | D1 |

Connect RC522 power to **3.3V**, never 5V. Connect grounds together.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/` | Dashboard |
| `GET` | `/api/status` | Locker and activity status |
| `POST` | `/api/scan` | Authenticate an RFID tag |
| `GET` | `/api/poll` | Check for a dashboard-triggered opening |
| `POST` | `/api/door` | Report that a door is locked again |

Device endpoints require the `X-Device-Key` header.

## Collaboration workflow

1. Clone the repository.
2. Copy `.env.example` to `.env`; do not commit `.env`.
3. Work in the area you own: `frontend/`, `backend/`, or `arduino/`.
4. Create a branch for each feature.
5. Test locally, commit, and open a pull request.

Keep changes to API routes and response formats documented so frontend and Arduino contributors can coordinate safely.

## Team 5

UTUJE Cadeau Isabelle · NAMBAJIMANA Sano Chretien · Niyompuhwe Robert · NYANZI Mandrake Gabriel · UWUMUREMYI Albert
