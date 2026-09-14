# SoftproInnovation — Deployment Guide

Deployment of the SoftproInnovation MERN app on the shared AWS EC2 VM.
Last updated: 2026-06-01.

---

## 1. Overview

| Item | Value |
|------|-------|
| App type | MERN (Vite/React frontend + Express 5 / Mongoose backend) |
| Public URL | https://innovation.softproindia.in |
| Admin login | https://innovation.softproindia.in/admin/login |
| Repo path (VM) | `/home/ubuntu/rohit-projects/SoftproInnovation` |
| Git remote | https://github.com/astraflowdev/SoftproInnovation |
| Node version | v22.22.1 |

This VM also hosts an **unrelated** app (`softpro-handshake`) on the same Elastic IP.
Routing between the two is by Nginx `server_name`.

---

## 2. Architecture

```
Browser
  │  https://innovation.softproindia.in
  ▼
Cloudflare (proxied / orange-cloud, SSL mode: Full)
  │  HTTPS :443
  ▼
Nginx (EC2, server_name innovation.softproindia.in)
  ├─ /        → static React build at /var/www/softpro-innovation
  └─ /api/    → proxy to 127.0.0.1:5000 (Express API + uploaded images)
                  │
                  ▼
            PM2 process "softpro-innovation-api" (server/index.js)
                  │
                  ▼
            MongoDB (Docker container, 127.0.0.1:27017)
```

---

## 3. Components

### Frontend
- Vite/React build output served as static files by Nginx.
- Static root: `/var/www/softpro-innovation` (owned by `www-data`).
- API calls use **relative `/api/...` paths** (no hardcoded host), so the same
  build works on any domain.

### Backend API
- Runtime: PM2 process **`softpro-innovation-api`** running `server/index.js`.
- Bound to **`127.0.0.1:5000`** (loopback only — not publicly exposed; Nginx proxies it).
- Reads config from `server/.env` (gitignored).
- PM2 is configured to resurrect on reboot (systemd unit `pm2-ubuntu` enabled, `pm2 save` done).

### Database — MongoDB
- Docker container **`softpro-innovation-mongo`** (image `mongo:7`).
- Bound to `127.0.0.1:27017`, restart policy `unless-stopped`.
- Data volume: `softpro-innovation-mongo-data`.
- Database name: `softpro_innovation`.

### TLS / Cloudflare
- DNS: A record `innovation` → `13.126.80.232` (Cloudflare **proxied**).
- Cloudflare zone SSL mode is **Full**, so Cloudflare connects to the origin over
  **HTTPS :443**. The Nginx vhost therefore **must** listen on :443.
- Origin certificate: Let's Encrypt for `innovation.softproindia.in`
  (issued via certbot webroot, auto-renewing).

---

## 4. Key Files

| Path | Purpose |
|------|---------|
| `/home/ubuntu/rohit-projects/SoftproInnovation` | Repo |
| `server/.env` | API config (PORT, MONGO_URI, JWT_SECRET, Razorpay keys) — **gitignored, do not commit** |
| `/var/www/softpro-innovation` | Deployed frontend build |
| `/etc/nginx/sites-available/softpro-innovation` | Nginx vhost (symlinked into `sites-enabled`) |
| `/etc/letsencrypt/live/innovation.softproindia.in/` | TLS cert + key |

### `server/.env` keys

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/softpro_innovation
JWT_SECRET=<secret>
jWT_SECRET=<same secret>   # legacy mirror; code now uses JWT_SECRET
RAZORPAY_KEY_ID=<placeholder>      # replace with real key for live payments
RAZORPAY_KEY_SECRET=<placeholder>
```

---

## 5. Admin Account

- Login page: `https://innovation.softproindia.in/admin/login`
- Default credentials: `admin@gmail.com` / `admin1234` — **change before real use.**

Create / reset the admin (idempotent — safe to re-run):

```bash
cd /home/ubuntu/rohit-projects/SoftproInnovation/server
node script/adminSeed.js
# or with custom values:
ADMIN_EMAIL='you@example.com' ADMIN_PASSWORD='strong-password' node script/adminSeed.js
```

---

## 6. Bugs Found & Fixed During Deployment

| # | Problem | Fix |
|---|---------|-----|
| 1 | Frontend had `http://localhost:5000` hardcoded in ~23 files | Replaced with relative `/api` paths so it works on the live domain |
| 2 | API bound to all interfaces (`app.listen(PORT)`) | Bound to `127.0.0.1` (loopback) per the VM's private-port pattern |
| 3 | `adminSeed.js` saved a broken password (`bcrypt.hash()` without salt rounds, not awaited, no DB connection) | Rewrote: connects to Mongo, hashes with `bcrypt.hash(pw, 10)`, idempotent upsert by email |
| 4 | Admin login compared passwords as **plain text** (`a.password == password`) | Now uses secure `bcrypt.compare` |
| 5 | JWT signed with a typo'd env var `jWT_SECRET` | Fixed to `JWT_SECRET` |
| 6 | Wrong password left the login request **hanging** (no response) | Now returns `Invalid Credentials` |

---

## 7. Redeploy Workflow

After pulling new code or editing the frontend:

```bash
cd /home/ubuntu/rohit-projects/SoftproInnovation

# backend deps (if changed)
cd server && npm install && cd ..

# rebuild + publish frontend
cd client && npm install && npm run build && cd ..
sudo rsync -a --delete client/dist/ /var/www/softpro-innovation/
sudo chown -R www-data:www-data /var/www/softpro-innovation

# restart API
pm2 restart softpro-innovation-api --update-env
pm2 save

# nginx
sudo nginx -t && sudo systemctl reload nginx
```

> Reminder: the frontend is a **static build** — editing client code requires a
> rebuild + rsync. Backend changes only need a `pm2 restart`.

---

## 8. Operations / Health Checks

```bash
# process + container status
pm2 status
docker ps --filter name=softpro-innovation-mongo

# logs
pm2 logs softpro-innovation-api

# origin checks (bypass Cloudflare)
curl -s -H "Host: innovation.softproindia.in" http://127.0.0.1/api/product/products

# public checks
curl -I https://innovation.softproindia.in/
curl -s https://innovation.softproindia.in/api/product/products

# TLS cert
sudo certbot certificates
```

---

## 9. Pending / TODO

- **Database is empty** — no products or categories seeded yet.
- **Razorpay uses placeholder keys** — live payments will not work until real keys
  are set in `server/.env`.
- Change the default admin password (`admin1234`).
- Code fixes (sections 6) are in the working tree but **not yet committed** to git.
