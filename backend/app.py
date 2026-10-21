"""
Team 5 - RFID Smart Locker
Backend + dashboard (Flask + SQLite).

The ESP8266 talks to these API routes:
  POST /api/scan   {"tag": "03 1A B0 01"}   -> {"action": "open"|"deny", "locker": 1, "message": "..."}
  GET  /api/poll   -> {"open": true|false}   (dashboard "Open" button, checked every 2 s)
  POST /api/door   {"locker": 1, "state": "locked"}   (board says the door closed again)
Both need the header  X-Device-Key: <DEVICE_KEY>

The Next.js dashboard calls the JSON API routes below.
"""
import os
import sqlite3
from datetime import datetime
from functools import wraps
from urllib.parse import quote_plus

from flask import Flask, g, jsonify, redirect, request

DB_PATH = os.environ.get("DB_PATH", "/data/locker.db")
DEVICE_KEY = os.environ.get("DEVICE_KEY", "change-me")
NUM_LOCKERS = int(os.environ.get("NUM_LOCKERS", "3"))
# If the board never reports "locked" (power cut, Wi-Fi lost), show locked again after this long.
DOOR_TIMEOUT = int(os.environ.get("DOOR_TIMEOUT", "20"))

app = Flask(__name__)


# ---------------------------------------------------------------- database
def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def init_db():
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            tag  TEXT PRIMARY KEY,
            name TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS lockers (
            id          INTEGER PRIMARY KEY,
            owner_tag   TEXT REFERENCES users(tag),
            assigned_at TEXT,
            pending_open INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS logs (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            time      TEXT NOT NULL,
            tag       TEXT,
            locker_id INTEGER,
            result    TEXT NOT NULL,
            detail    TEXT
        );
        """
    )
    # older databases: add the door columns
    cols = [r[1] for r in conn.execute("PRAGMA table_info(lockers)")]
    if "door" not in cols:
        conn.execute("ALTER TABLE lockers ADD COLUMN door TEXT NOT NULL DEFAULT 'locked'")
        conn.execute("ALTER TABLE lockers ADD COLUMN door_changed TEXT")
    if "door_by" not in cols:
        conn.execute("ALTER TABLE lockers ADD COLUMN door_by TEXT")
    for i in range(1, NUM_LOCKERS + 1):
        conn.execute("INSERT OR IGNORE INTO lockers (id) VALUES (?)", (i,))

    # First run only: add the two fobs found during hardware testing.
    if conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        now = now_str()
        conn.execute("INSERT INTO users VALUES ('03 1A B0 01', 'Blue fob')")
        conn.execute("INSERT INTO users VALUES ('FE 23 9C 04', 'Second tag')")
        conn.execute(
            "UPDATE lockers SET owner_tag='03 1A B0 01', assigned_at=? WHERE id=1", (now,)
        )
    conn.commit()
    conn.close()


def now_str():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def clean_tag(tag):
    """'03:1a:b0:01' or '031ab001' -> '03 1A B0 01'"""
    hexchars = "".join(c for c in (tag or "").upper() if c in "0123456789ABCDEF")
    return " ".join(hexchars[i:i + 2] for i in range(0, len(hexchars), 2))


def set_door(locker_id, state, by=None):
    db().execute(
        "UPDATE lockers SET door=?, door_changed=?, door_by=? WHERE id=?",
        (state, now_str(), by, locker_id),
    )


def log(tag, locker_id, result, detail=""):
    db().execute(
        "INSERT INTO logs (time, tag, locker_id, result, detail) VALUES (?,?,?,?,?)",
        (now_str(), tag, locker_id, result, detail),
    )


# ---------------------------------------------------------------- device API
def device_only(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if request.headers.get("X-Device-Key") != DEVICE_KEY:
            return jsonify(error="wrong device key"), 401
        return f(*args, **kwargs)
    return wrapper


@app.post("/api/scan")
@device_only
def api_scan():
    data = request.get_json(silent=True) or {}
    tag = clean_tag(data.get("tag"))
    if not tag:
        return jsonify(error="missing tag"), 400

    user = db().execute("SELECT * FROM users WHERE tag=?", (tag,)).fetchone()
    locker = db().execute("SELECT * FROM lockers WHERE owner_tag=?", (tag,)).fetchone()

    if locker:
        name = user["name"] if user else tag
        log(tag, locker["id"], "GRANTED", f"{name} opened locker {locker['id']}")
        set_door(locker["id"], "open", name)
        db().commit()
        return jsonify(action="open", locker=locker["id"], message=f"Welcome {name}")

    reason = "unknown tag" if not user else "no locker assigned"
    log(tag, None, "DENIED", reason)
    db().commit()
    return jsonify(action="deny", locker=None, message=reason)


@app.get("/api/poll")
@device_only
def api_poll():
    """The ESP8266 asks every 2 s: did someone press 'Open' on the dashboard?"""
    row = db().execute("SELECT id FROM lockers WHERE pending_open=1 ORDER BY id LIMIT 1").fetchone()
    if not row:
        return jsonify(open=False)
    db().execute("UPDATE lockers SET pending_open=0 WHERE id=?", (row["id"],))
    set_door(row["id"], "open", "Dashboard")
    db().commit()
    return jsonify(open=True, locker=row["id"])


@app.post("/api/door")
@device_only
def api_door():
    """The board reports that the door locked again."""
    data = request.get_json(silent=True) or {}
    locker_id = data.get("locker")
    if data.get("state") != "locked" or not isinstance(locker_id, int):
        return jsonify(error="send {locker: 1, state: 'locked'}"), 400
    row = db().execute("SELECT door FROM lockers WHERE id=?", (locker_id,)).fetchone()
    if row and row["door"] == "open":
        set_door(locker_id, "locked")
        log(None, locker_id, "LOCKED", f"locker {locker_id} closed and locked")
        db().commit()
    return jsonify(ok=True)


@app.get("/api/status")
def api_status():
    """Used by the dashboard to refresh itself."""
    return jsonify(lockers=lockers_view(), logs=logs_view(15))


@app.get("/api/users")
def api_users():
    """Return every registered user, including users without a locker."""
    rows = db().execute(
        """SELECT u.tag, u.name, l.id AS locker_id
           FROM users u LEFT JOIN lockers l ON l.owner_tag = u.tag
           ORDER BY u.name"""
    ).fetchall()
    return jsonify(users=[dict(row) for row in rows])


# ---------------------------------------------------------------- dashboard data and mutations
def lockers_view():
    rows = db().execute(
        """SELECT l.id, l.owner_tag, l.assigned_at, l.door, l.door_changed, l.door_by, u.name
           FROM lockers l LEFT JOIN users u ON u.tag = l.owner_tag
           ORDER BY l.id"""
    ).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        if d["door"] == "open" and d["door_changed"]:
            age = (datetime.now() - datetime.strptime(d["door_changed"], "%Y-%m-%d %H:%M:%S")).total_seconds()
            if age > DOOR_TIMEOUT:
                d["door"] = "locked"
        out.append(d)
    return out


def logs_view(limit):
    rows = db().execute(
        """SELECT g.id, g.time, g.tag, g.locker_id, g.result, g.detail, u.name
           FROM logs g LEFT JOIN users u ON u.tag = g.tag
           ORDER BY g.id DESC LIMIT ?""",
        (limit,),
    ).fetchall()
    return [dict(r) for r in rows]


def message_redirect(message):
    return redirect("/?msg=" + quote_plus(message))


@app.get("/")
def service_info():
    """Small health response; the dashboard is served by Next.js."""
    return jsonify(service="rfid-locker-backend", status="ok")


@app.post("/users/add")
def add_user():
    tag = clean_tag(request.form.get("tag"))
    name = (request.form.get("name") or "").strip()
    if not tag or not name:
        return message_redirect("Enter both a name and a tag ID")
    db().execute("INSERT OR REPLACE INTO users (tag, name) VALUES (?,?)", (tag, name))
    db().commit()
    return message_redirect(f"Added {name}")


@app.post("/users/delete")
def delete_user():
    tag = clean_tag(request.form.get("tag"))
    db().execute("UPDATE lockers SET owner_tag=NULL, assigned_at=NULL WHERE owner_tag=?", (tag,))
    db().execute("DELETE FROM users WHERE tag=?", (tag,))
    db().commit()
    return message_redirect("User removed")


@app.post("/lockers/<int:locker_id>/assign")
def assign(locker_id):
    tag = clean_tag(request.form.get("tag"))
    if not db().execute("SELECT 1 FROM users WHERE tag=?", (tag,)).fetchone():
        return message_redirect("Choose a user first")
    # one locker per user: free any locker they already hold
    db().execute("UPDATE lockers SET owner_tag=NULL, assigned_at=NULL WHERE owner_tag=?", (tag,))
    db().execute(
        "UPDATE lockers SET owner_tag=?, assigned_at=? WHERE id=?", (tag, now_str(), locker_id)
    )
    log(tag, locker_id, "ASSIGNED", f"locker {locker_id} assigned")
    db().commit()
    return message_redirect(f"Locker {locker_id} assigned")


@app.post("/lockers/<int:locker_id>/release")
def release(locker_id):
    row = db().execute("SELECT owner_tag FROM lockers WHERE id=?", (locker_id,)).fetchone()
    db().execute("UPDATE lockers SET owner_tag=NULL, assigned_at=NULL WHERE id=?", (locker_id,))
    log(row["owner_tag"] if row else None, locker_id, "RELEASED", f"locker {locker_id} is free")
    db().commit()
    return message_redirect(f"Locker {locker_id} is now free")


@app.post("/lockers/<int:locker_id>/open")
def remote_open(locker_id):
    db().execute("UPDATE lockers SET pending_open=1 WHERE id=?", (locker_id,))
    log(None, locker_id, "REMOTE OPEN", "opened from dashboard")
    db().commit()
    return message_redirect(f"Opening locker {locker_id}...")


init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
