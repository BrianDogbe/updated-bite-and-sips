# Bite & Sips — Food Ordering, Delivery & Business Platform (Tema C7, Ghana)

Customer ordering app + Admin portal + Kitchen Display + Rider app, sharing one
order/payment/delivery/realtime core.

## Run with mock data (no backend)

```bash
npm install
npm run dev        # http://localhost:5173
```

Portals: `/admin` · `/kitchen` · `/rider` (demo logins built in).

## Run with the real backend

```bash
cd server && cp .env.example .env && npm install && npm run dev   # :4000
cd .. && cp .env.example .env                                     # VITE_API_URL=http://localhost:4000
npm run dev
```

Seeded logins — Admin `admin@biteandsips.com` / `admin1234`,
Kitchen `kitchen@biteandsips.com` / `kitchen1234`,
Rider `kwame@biteandsips.com` / `rider1234`.

Without `VITE_API_URL`, the frontend runs fully on local mock data.

## Payments (Ghana)

Real providers live in `server/.env` only — never in frontend code:

- **Paystack** (`PAYSTACK_SECRET_KEY`) — cards + all MoMo networks, hosted checkout + server verify
- **MTN MoMo direct** (`MOMO_SUBSCRIPTION_KEY`, `MOMO_API_USER`, `MOMO_API_KEY`) — request-to-pay phone prompt
- Cash on delivery/pickup — recorded, no charge
- No keys → **MOCK** mode (no real money moves)

See `server/README.md` for the full API, realtime events, and Render/Docker deploy guide.
