# Dia Admin

A small back-office app for the Dia API: orders (ship, refund, cancel, notes), products and stock, categories, offers, shipping zones and rates, pages, banners and users. Vite + React, no UI library.

```bash
cp .env.example .env     # VITE_API_URL=http://localhost:4000
npm install
npm run dev              # http://localhost:5173
npm run build            # static files in dist/, host anywhere
```

Sign in with an account whose role is `admin` (the API creates the first one from `ADMIN_EMAIL` / `ADMIN_PASSWORD`). The API must list this app's address in `CORS_ORIGINS`.

Notes
- Money on orders and offers is shown in rupees; offer and shipping-rate amounts are typed in paise (₹100 = 10000), as the API stores them.
- Images are uploaded from the form (Upload / Replace / + Upload images) to Cloudflare R2 through the API, or pasted as URLs.
- Tokens are kept in `localStorage`. Fine for an internal tool; serve it over HTTPS.

## People and access

- **Access** defines roles; each role is a set of areas (orders, refunds, catalogue, offers, shipping, content, people). Admin is built in and holds everything.
- **People** adds team members. Leave the password empty to email an invite link; the link opens `/reset-password?token=…` on the admin origin, so the host must serve `index.html` for that path (SPA fallback). Set `ADMIN_URL` on the server to the admin's public URL.
- The sidebar, routes and API all enforce the same permissions. Changes to a role apply within ~15 seconds.
- **Your profile** (top right): name, password change (signs out other devices), sign out everywhere.
