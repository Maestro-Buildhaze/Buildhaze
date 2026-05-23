# CMS Platform

Premium CMS for client website management. Clients log in and edit their live site (texts, blog, colors, media) — changes deploy instantly to Cloudflare R2.

## Stack

- **API**: Node.js + Express + Prisma + PostgreSQL (Supabase)
- **UI**: React + Vite + Tailwind CSS + TanStack Query
- **Hosting**: Cloudflare R2 (static sites) + Cloudflare Workers
- **Auth**: JWT

## Quick Start

### 1. Add pnpm to PATH (one-time)

```bash
echo 'export PATH="$PATH:$HOME/Library/pnpm"' >> ~/.zshrc && source ~/.zshrc
```

Or use the included wrapper:
```bash
./run.sh install
```

### 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
# Then fill in the values in apps/api/.env
```

Required variables:
- `DATABASE_URL` — Supabase connection string (with pgbouncer=true)
- `DIRECT_URL` — Supabase direct connection (for Prisma migrations)
- `JWT_SECRET` — random 32+ char string
- `ADMIN_SECRET_KEY` — secret for admin API routes
- `CF_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — Cloudflare R2 credentials
- `R2_PUBLIC_URL` — your R2 public bucket URL

### 3. Push database schema

```bash
cd apps/api
pnpm prisma db push
```

### 4. Create first client (admin)

```bash
# POST /admin/clients  with header x-admin-key: YOUR_ADMIN_SECRET_KEY
curl -X POST http://localhost:4000/admin/clients \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_SECRET_KEY" \
  -d '{
    "email": "client@example.com",
    "password": "securepassword",
    "businessName": "Acme Corp",
    "slug": "acme"
  }'
```

### 5. Start development

```bash
# Both API + UI together
pnpm dev

# Or individually:
pnpm --filter api dev
pnpm --filter ui dev
```

- **UI**: http://localhost:5173
- **API**: http://localhost:4000

## Project Structure

```
cms-platform/
├── apps/
│   ├── api/          # Express backend
│   │   ├── prisma/   # Database schema
│   │   └── src/
│   │       ├── routes/   # auth, blog, config, pages, media, publish, admin
│   │       ├── middleware/
│   │       └── lib/
│   └── ui/           # React frontend
│       └── src/
│           ├── pages/    # Login, Dashboard, SiteEditor, BlogList, BlogEditor, Media, Settings
│           ├── components/
│           └── lib/
└── packages/
    └── templates/    # Eta.js HTML templates
```

## Publishing Flow

1. Client logs into CMS at their unique URL
2. Edits text, blog posts, colors, contact info
3. Clicks **Publish** — API renders template with Eta.js and uploads HTML to R2
4. Cloudflare serves the updated static site instantly

## Admin Routes

All admin routes require header `x-admin-key: YOUR_ADMIN_SECRET_KEY`:

- `POST /admin/clients` — create new client
- `GET /admin/clients` — list all clients
- `GET /admin/clients/:id` — client details
- `DELETE /admin/clients/:id` — delete client
- `POST /admin/templates` — create template
- `GET /admin/templates` — list templates
