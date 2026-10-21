# Local Development Guide

This project is an RFID smart locker with three parts:

```text
ESP8266 + RC522 + servo
        │ Wi-Fi / HTTP
        ▼
Flask API + SQLite  ◄── Next.js dashboard
```

## Project map

- `arduino/locker_wifi/locker_wifi.ino` — networked ESP8266 firmware.
- `arduino/locker_step2/locker_step2.ino` — offline RFID and servo test.
- `backend/app.py` — Flask API and SQLite business logic.
- `backend/requirements.txt` — Python dependencies.
- `web/` — Next.js dashboard and its server-side API bridge.
- `data/locker.db` — local database created at runtime; do not commit it.
- `.env` — local device key configuration; do not commit it.

## How the system works

1. The ESP8266 reads an RFID UID from the RC522 reader.
2. It sends the UID to Flask using `POST /api/scan` and the `X-Device-Key` header.
3. Flask checks whether the tag owns a locker.
4. Flask returns `open` or `deny` and records an activity log.
5. The ESP opens the servo for five seconds when access is granted.
6. The dashboard polls `GET /api/status` and displays lockers and activity.
7. When the dashboard requests a remote opening, Flask sets `pending_open`; the ESP finds it through `GET /api/poll`.

## Start locally

### Terminal 1: Flask backend

Run from the repository root:

```powershell
$env:DB_PATH = "$PWD\data\locker.db"
$env:DEVICE_KEY = "team5@rca.robotics"
$env:NUM_LOCKERS = "3"

New-Item -ItemType Directory -Force data
python -m flask --app backend/app.py run --host 0.0.0.0 --port 5001 --no-reload
```

The backend API is available at `http://127.0.0.1:5001`.

### Terminal 2: Next.js dashboard

```powershell
cd web
$env:BACKEND_URL = "http://127.0.0.1:5001"
npm.cmd run dev
```

Open `http://localhost:3000`.

Check the backend directly:

```powershell
Invoke-RestMethod http://127.0.0.1:5001/api/status
Invoke-RestMethod http://127.0.0.1:5001/api/users
```

## Test the ESP8266 locally

For a laptop-hosted hotspot:

1. Set the hotspot band to 2.4 GHz.
2. Connect the ESP8266 to the laptop hotspot.
3. Find the hotspot adapter address with `ipconfig`. Windows commonly uses `192.168.137.1`.
4. Set these values in `arduino/locker_wifi/locker_wifi.ino`:

```cpp
const char* WIFI_NAME     = "your-hotspot-name";
const char* WIFI_PASSWORD = "your-hotspot-password";
const char* SERVER        = "http://192.168.137.1:5001";
const char* DEVICE_KEY    = "team5@rca.robotics";
```

The ESP8266 supports 2.4 GHz Wi-Fi, not a 5 GHz-only network. The laptop does not need to connect to its own hotspot; Flask must listen on `0.0.0.0` so hotspot clients can reach it.

Upload the Wi-Fi sketch with Arduino IDE using **NodeMCU 1.0 (ESP-12E Module)**, then open Serial Monitor at **115200 baud**. Expected output:

```text
Wi-Fi connected. Board IP: ...
Tap a fob...
```

The first unreadable boot line is normal ESP8266 output at a different baud rate.

### Hardware wiring

| Component | ESP8266 pin |
|---|---|
| RC522 SDA | D8 |
| RC522 SCK | D5 |
| RC522 MOSI | D7 |
| RC522 MISO | D6 |
| RC522 RST | D3 |
| Servo signal | D1 |

Power the RC522 from **3.3V**, never 5V. Connect all grounds together. The servo should have a suitable power source; servo power noise can reset an ESP8266.

## End-to-end test

1. Start Flask and Next.js.
2. Upload the Wi-Fi sketch.
3. Scan a card and copy the UID printed as `Fob tapped:`.
4. Add that UID in the Users section of the dashboard.
5. Assign the user to Locker 1.
6. Scan again.

Expected result:

```text
Server replied 200: ...
SERVER: ACCESS GRANTED
```

Scan an unregistered card to verify `ACCESS DENIED`. Click the dashboard Open action to test the ESP polling path.

## API overview

| Method | Endpoint | Used by |
|---|---|---|
| `GET` | `/api/status` | Dashboard locker state and logs |
| `GET` | `/api/users` | Dashboard registered users |
| `POST` | `/api/scan` | ESP RFID authentication |
| `GET` | `/api/poll` | ESP remote-open polling |
| `POST` | `/api/door` | ESP reports the door locked |

Device endpoints require `X-Device-Key`. Dashboard mutations go through Next.js BFF routes, which call the Flask mutation endpoints server-to-server.

## Learn the code in this order

1. Read `backend/app.py` from `init_db()` through the API routes to understand the data model and locker rules.
2. Read `web/lib/types.ts` to see the shared dashboard data shapes.
3. Read `web/hooks/useDashboard.ts` to learn how polling, mutations, and UI state work.
4. Read `web/app/api/` to see how Next.js protects the browser from direct backend calls.
5. Read `arduino/locker_wifi/locker_wifi.ino` from `setup()` through `askServer()` and `checkDashboardOpen()`.
6. Run the tests in `web/tests/` before changing dashboard behavior.

## Validation commands

From `web/`:

```powershell
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

These checks do not require the physical ESP8266.

## Common problems

- `502` from Next.js: Flask is not running or `BACKEND_URL` is wrong.
- `Wi-Fi FAILED`: the SSID/password is wrong or the network is 5 GHz-only.
- `401` from Flask: the Arduino `DEVICE_KEY` does not match `$env:DEVICE_KEY`.
- ESP gets Wi-Fi but cannot reach Flask: use the laptop hotspot IP, bind Flask to `0.0.0.0`, and check Windows Firewall.
- Servo works but dashboard does not update: confirm the ESP receives HTTP 200 and calls `/api/door` after it relocks.
