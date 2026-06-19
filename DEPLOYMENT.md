# Deployment — 3M Car Care CRM

- **Frontend (admin panel):** https://admin.3mcarcarestudios.in
- **Backend (API):** https://api.3mcarcarestudios.in

The app is config-driven via environment variables — no code changes are needed to deploy.

---

## 1. Backend → api.3mcarcarestudios.in

1. On the server, in `backend/`, create `.env` from the template:
   ```bash
   cp .env.production.example .env
   ```
   Fill in real values. The important ones:
   ```env
   NODE_ENV=production
   PORT=5003
   MONGO_URI=<your production mongodb uri>
   JWT_SECRET=<long random secret>
   JWT_EXPIRES_IN=7d
   CLIENT_ORIGIN=https://admin.3mcarcarestudios.in
   ```
   > `CLIENT_ORIGIN` controls CORS — it must be the frontend origin (comma-separate for more than one).

2. Install + seed the first admin (once):
   ```bash
   npm ci
   npm run seed         # creates admin@workshop.com / Admin@123 (change after login)
   ```

3. Run it (keep it alive with PM2):
   ```bash
   npm i -g pm2
   pm2 start src/server.js --name 3mcar-api
   pm2 save && pm2 startup
   ```

4. Put Nginx in front (HTTPS via Certbot/Let's Encrypt):
   ```nginx
   server {
     server_name api.3mcarcarestudios.in;
     location / {
       proxy_pass http://127.0.0.1:5003;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```
   Then: `sudo certbot --nginx -d api.3mcarcarestudios.in`

   Health check: `https://api.3mcarcarestudios.in/api/health` → `{ "success": true, ... }`

---

## 2. Frontend → admin.3mcarcarestudios.in

The production API URL is already set in `frontend/.env.production`:
```env
VITE_API_URL=https://api.3mcarcarestudios.in/api
```

Build the static site:
```bash
cd frontend
npm ci
npm run build      # outputs to frontend/dist
```

Deploy `frontend/dist` to the host for `admin.3mcarcarestudios.in`.

**It is a single-page app — all routes must fall back to `index.html`:**

- **Netlify / Cloudflare Pages:** handled by `public/_redirects` (already included).
- **Vercel:** add a rewrite of `/(.*)` → `/index.html`.
- **Nginx (static):**
  ```nginx
  server {
    server_name admin.3mcarcarestudios.in;
    root /var/www/3mcar-admin/dist;
    index index.html;
    location / { try_files $uri /index.html; }
  }
  ```
  Then: `sudo certbot --nginx -d admin.3mcarcarestudios.in`

---

## 3. DNS
Point both subdomains (A / CNAME records) at your server / host:
- `admin.3mcarcarestudios.in` → frontend host
- `api.3mcarcarestudios.in` → backend server

## 4. After deploy — checklist
- [ ] `https://api.3mcarcarestudios.in/api/health` returns success
- [ ] Log in at `https://admin.3mcarcarestudios.in`, then change the admin password (Settings → Change Password)
- [ ] Fill **Settings** (company, GST, bank, UPI) so quotes/invoices show correct details
- [ ] Confirm a quote/invoice PDF downloads (verifies CORS + `Content-Disposition`)

> To add more allowed frontends later, set e.g.
> `CLIENT_ORIGIN=https://admin.3mcarcarestudios.in,https://staging.3mcarcarestudios.in`
