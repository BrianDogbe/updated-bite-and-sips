# Bite & Sips API (real backend)

Express + SQLite (Node built-in, no external DB) + Socket.IO realtime.
Deploys anywhere Node 22+ runs: Render, Railway, Fly.io, or any VPS.

## Run locally

```bash
cd server
cp .env.example .env   # set JWT_SECRET at minimum
npm install
npm run dev            # :4000, auto-seeds admin + menu + riders + promos
```

Seeded logins:

| Who     | Email                    | Password   |
| ------- | ------------------------ | ---------- |
| Admin   | admin@biteandsips.com    | admin1234  |
| Kitchen | kitchen@biteandsips.com  | kitchen1234|
| Rider   | kwame@biteandsips.com    | rider1234  |

Health: `GET /api/health` → `{ ok, payments: MOCK|LIVE, ... }`

## Connect the frontend

```bash
# project root
cp .env.example .env    # VITE_API_URL=http://localhost:4000
npm run dev
```

With `VITE_API_URL` set, the app uses the backend for auth, menu,
orders, payments, messages, riders and inventory, with Socket.IO
realtime. Without it, everything falls back to local mock data.

## Payments (Ghana)

Configured **only** via `server/.env` — secrets never touch frontend code.

| Method | Provider | Env | Behaviour |
| ------ | -------- | --- | --------- |
| Card, MTN/Vodafone/AT MoMo | **Paystack** | `PAYSTACK_SECRET_KEY` | Real checkout URL + server-side verify |
| MTN MoMo (direct) | **MTN request-to-pay** | `MOMO_SUBSCRIPTION_KEY`, `MOMO_API_USER`, `MOMO_API_KEY`, `MOMO_ENV=sandbox` | Real phone approval prompt + status check |
| Cash on delivery/pickup | — | — | Recorded, no charge |
| *(no keys set)* | **Mock** | — | No real money moves; verify succeeds |

Paystack: dashboard → Settings → API Keys. MTN: https://momodeveloper.mtn.com
(Collections product, sandbox first, then production with `MOMO_ENV=production`).

## Deploy (Render example)

1. Push repo; create **Web Service** from `server/` (Docker) — `render.yaml` included.
2. Add env vars: `JWT_SECRET`, `CLIENT_ORIGIN=https://<your-frontend>`, plus payment keys.
3. The SQLite file lives on the attached disk (`/data`) so orders survive restarts.
4. Deploy the frontend (Vercel/Netlify) with `VITE_API_URL=https://<your-api>`.

## API cheat sheet

- `POST /api/auth/login` — staff login → `{ token, user }`
- `GET /api/menu` — public menu
- `POST /api/orders` — public guest checkout (server reprices everything)
- `GET /api/orders/:id` — public (tracking links)
- `PATCH /api/orders/:id/status` — staff, transition-validated
- `PATCH /api/orders/:id/assign` — rider assignment
- `POST /api/payments/initialize` → `{ reference, payUrl? }`
- `GET /api/payments/verify/:reference` → `{ status }` (marks order PAID)
- `GET/POST /api/messages`, `/api/riders`, `/api/inventory`, `/api/promos`, `/api/audit`

Socket.IO events: `ORDER_CREATED`, `ORDER_STATUS`, `RIDER_ASSIGNED`,
`RIDER_LOCATION`, `NOTIFY` — same names the frontend mock bus uses.
