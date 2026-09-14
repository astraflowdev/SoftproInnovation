# DEPLOYMENT.md — Softpro Innovation (MERN)

E-commerce/portal at **innovation.softproindia.in**. MERN: Express API + Vite React SPA + MongoDB.

- **Repo:** `astraflowdev/SoftproInnovation` → `~/rohit-projects/SoftproInnovation` (branch `deploy/vm-setup-and-fixes`)
- **Server:** `softpro-prod-01` (103.127.30.213). See `/home/ubuntu/SERVER_OVERVIEW.md`.

## Layout & how it's served
- **`server/`** — Express API, entry `index.js`, listens on **:5000**. Run under pm2 as
  `softpro-innovation-api`. Loads `server/.env` (dotenv).
- **`client/`** — Vite React app. `npm run build` → `client/dist/`, deployed to
  **`/var/www/softpro-innovation`** and served static by nginx.
- nginx serves the SPA and proxies **`/api/`** → `127.0.0.1:5000`.
- API route mounts are nested, e.g. products = `GET /api/product/products`.

## Toolchain
- Node: **22** (`npm`). No build step for the server (plain JS); client uses Vite.

## Data
- **MongoDB** `softpro-innovation-mongo` (mongo:7, 127.0.0.1:27017, db `softpro_innovation`).
  `MONGO_URI=mongodb://127.0.0.1:27017/softpro_innovation`.
- **Uploads** (product images, runtime, NOT in git): `server/uploads/` — back this up.
- Container is started via **`docker run`** (no compose):
  ```bash
  docker run -d --name softpro-innovation-mongo --restart unless-stopped \
    -p 127.0.0.1:27017:27017 -v softpro-innovation-mongo-data:/data/db mongo:7
  ```

## Build & deploy
```bash
su - ubuntu && source ~/.nvm/nvm.sh    # node 22
cd ~/rohit-projects/SoftproInnovation
git pull
# server deps
cd server && npm install && cd ..
# client build
cd client && npm install && npm run build && cd ..
sudo rsync -a --delete client/dist/ /var/www/softpro-innovation/
# (re)start API
pm2 restart softpro-innovation-api        # first time: pm2 start index.js --name softpro-innovation-api  (cwd server/)
pm2 save
```

## nginx
`/etc/nginx/sites-available/softpro-innovation` — root `/var/www/softpro-innovation`,
`/api/` → :5000, `client_max_body_size 50m`, has both `:80` and `:443` server blocks,
TLS `/etc/letsencrypt/live/innovation.softproindia.in/`.

## Validate
```bash
curl -I https://innovation.softproindia.in/                       # 200
curl https://innovation.softproindia.in/api/product/products      # JSON array of products
```

## Notes
- `.env` has `JWT_SECRET` **and** `jWT_SECRET` (intentional typo-compat), Razorpay
  placeholders (payments off until real keys), PORT=5000.
