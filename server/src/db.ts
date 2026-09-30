// SQLite (Node built-in) — schema, seed, helpers. No external DB needed.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import bcrypt from 'bcryptjs';

const DB_FILE = process.env.DB_FILE ?? './data/bite-and-sips.db';
mkdirSync(dirname(DB_FILE), { recursive: true });
export const db = new DatabaseSync(DB_FILE);

const J = {
  parse<T>(s: string | null, fallback: T): T {
    try {
      return s ? (JSON.parse(s) as T) : fallback;
    } catch {
      return fallback;
    }
  },
};

export function ensureSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE,
      phone TEXT, password_hash TEXT, role TEXT NOT NULL DEFAULT 'CUSTOMER',
      active INTEGER NOT NULL DEFAULT 1, vehicle TEXT, plate TEXT,
      online INTEGER NOT NULL DEFAULT 0, busy INTEGER NOT NULL DEFAULT 0,
      lat REAL DEFAULT 0, lng REAL DEFAULT 0, rating REAL DEFAULT 5
    );
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '',
      price REAL NOT NULL, category_id TEXT NOT NULL, image TEXT DEFAULT '',
      available INTEGER NOT NULL DEFAULT 1, popular INTEGER NOT NULL DEFAULT 0,
      ingredients TEXT DEFAULT '[]', allergens TEXT DEFAULT '[]',
      modifiers TEXT DEFAULT '[]', prep_minutes INTEGER DEFAULT 15
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, customer_id TEXT, customer_name TEXT, customer_phone TEXT,
      items TEXT NOT NULL DEFAULT '[]', order_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING', payment_status TEXT NOT NULL DEFAULT 'PENDING',
      payment_method TEXT NOT NULL, subtotal REAL DEFAULT 0, delivery_fee REAL DEFAULT 0,
      service_fee REAL DEFAULT 0, discount REAL DEFAULT 0, total REAL DEFAULT 0,
      pickup_time TEXT, pickup_mode TEXT, delivery_address TEXT, rider_id TEXT,
      delivery_code TEXT, timeline TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS payments (
      reference TEXT PRIMARY KEY, amount REAL NOT NULL, method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING', order_id TEXT, provider TEXT DEFAULT 'mock',
      raw TEXT DEFAULT '{}', created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
      body TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, qty REAL DEFAULT 0, unit TEXT DEFAULT 'pcs',
      min_qty REAL DEFAULT 0, supplier TEXT DEFAULT '', unit_cost REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS promos (
      code TEXT PRIMARY KEY, type TEXT NOT NULL, value REAL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1, expires_at TEXT
    );
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, action TEXT,
      resource TEXT, prev TEXT, next TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
  `);
}

export function nextOrderId(): string {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get('order_seq') as { value: string } | undefined;
  const next = row ? parseInt(row.value, 10) + 1 : 1024;
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?').run(
    'order_seq', String(next), String(next),
  );
  return `BS${next}`;
}

export function logAudit(user: string, action: string, resource: string, prev?: string, next?: string): void {
  db.prepare('INSERT INTO audit (user, action, resource, prev, next, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    user, action, resource, prev ?? null, next ?? null, new Date().toISOString(),
  );
}

export interface DbOrder {
  id: string; customer_id: string; customer_name: string; customer_phone: string;
  items: unknown; order_type: string; status: string; payment_status: string;
  payment_method: string; subtotal: number; delivery_fee: number; service_fee: number;
  discount: number; total: number; pickup_time: string | null; pickup_mode: string | null;
  delivery_address: unknown; rider_id: string | null; delivery_code: string | null;
  timeline: unknown; created_at: string; updated_at: string;
}

/** Convert a DB row (JSON columns as strings) into API shape. */
export function toOrder(row: Record<string, unknown>): Record<string, unknown> {
  const r = row as unknown as DbOrder;
  return {
    id: r.id,
    customerId: r.customer_id,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    items: J.parse(r.items as unknown as string, []),
    orderType: r.order_type,
    status: r.status,
    paymentStatus: r.payment_status,
    paymentMethod: r.payment_method,
    subtotal: r.subtotal,
    deliveryFee: r.delivery_fee,
    serviceFee: r.service_fee,
    discount: r.discount,
    total: r.total,
    pickupTime: r.pickup_time ?? undefined,
    pickupMode: r.pickup_mode ?? undefined,
    deliveryAddress: r.delivery_address ? J.parse(r.delivery_address as unknown as string, null) : undefined,
    riderId: r.rider_id ?? undefined,
    deliveryCode: r.delivery_code ?? undefined,
    timeline: J.parse(r.timeline as unknown as string, []),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toMenuItem(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    categoryId: row.category_id,
    image: row.image,
    available: (row.available as number) === 1,
    popular: (row.popular as number) === 1,
    ingredients: J.parse(row.ingredients as string, []),
    allergens: J.parse(row.allergens as string, []),
    modifiers: J.parse(row.modifiers as string, []),
    prepMinutes: row.prep_minutes,
  };
}

export function seedIfEmpty(): void {
  const menuCount = (db.prepare('SELECT COUNT(*) AS c FROM menu_items').get() as { c: number }).c;
  if (menuCount > 0) return;

  const adminHash = bcrypt.hashSync('admin1234', 10);
  db.prepare(
    "INSERT INTO users (id, name, email, phone, password_hash, role, active) VALUES (?, ?, ?, ?, ?, ?, 1)",
  ).run('u_admin', 'Admin', 'admin@biteandsips.com', '024 469 3556', adminHash, 'ADMIN');
  db.prepare(
    "INSERT INTO users (id, name, email, phone, password_hash, role, active) VALUES (?, ?, ?, ?, ?, ?, 1)",
  ).run('u_kitchen', 'Kitchen Staff', 'kitchen@biteandsips.com', '024 469 3556', bcrypt.hashSync('kitchen1234', 10), 'KITCHEN_STAFF');
  const rider = db.prepare(
    "INSERT INTO users (id, name, email, phone, password_hash, role, active, vehicle, plate, online, busy, lat, lng, rating) VALUES (?, ?, ?, ?, ?, 'RIDER', 1, ?, ?, ?, ?, ?, ?, ?)",
  );
  rider.run('r1', 'Kwame Mensah', 'kwame@biteandsips.com', '+233 24 111 2222', bcrypt.hashSync('rider1234', 10), 'Motorbike', 'GR-4521-23', 1, 0, 5.56, -0.2, 4.9);
  rider.run('r2', 'Ama Boateng', 'ama.rider@biteandsips.com', '+233 24 333 4444', bcrypt.hashSync('rider1234', 10), 'Motorbike', 'GR-7810-24', 1, 1, 5.57, -0.19, 4.8);
  rider.run('r3', 'Yusuf Ali', 'yusuf@biteandsips.com', '+233 24 555 6666', bcrypt.hashSync('rider1234', 10), 'Bicycle', null, 0, 0, 5.55, -0.21, 4.7);

  const img = (s: string) => `https://images.unsplash.com/${s}?auto=format&fit=crop&w=800&q=70`;
  const items: Array<Record<string, unknown>> = [
    { id: 'm1', name: 'Smash Chicken Burger', description: 'Crispy chicken fillet, cheddar, house sauce, brioche bun.', price: 68, category_id: 'burgers', image: img('photo-1568901346375-23c9450c58cd'), available: 1, popular: 1, ingredients: ['Chicken', 'Cheddar', 'Brioche', 'Lettuce'], allergens: ['Gluten', 'Dairy', 'Egg'], modifiers: [{ id: 'x-cheese', name: 'Extra cheese', price: 10 }, { id: 'x-chicken', name: 'Extra chicken', price: 22 }, { id: 'x-sauce', name: 'Extra sauce', price: 5 }], prep_minutes: 15 },
    { id: 'm2', name: 'Jollof & Grilled Chicken', description: 'Smoky party jollof with char-grilled chicken and fried plantain.', price: 85, category_id: 'rice', image: img('photo-1512058564366-18510be2db19'), available: 1, popular: 1, ingredients: ['Rice', 'Chicken', 'Plantain'], allergens: [], modifiers: [{ id: 'x-chicken', name: 'Extra chicken', price: 25 }], prep_minutes: 18 },
    { id: 'm3', name: 'Margherita Pizza 12"', description: 'San Marzano tomato, fior di latte, basil, wood-fired crust.', price: 120, category_id: 'pizza', image: img('photo-1574071318508-1cdbab80d002'), available: 1, popular: 1, ingredients: ['Flour', 'Tomato', 'Mozzarella'], allergens: ['Gluten', 'Dairy'], modifiers: [{ id: 'x-cheese', name: 'Extra cheese', price: 18 }], prep_minutes: 20 },
    { id: 'm4', name: 'Creamy Alfredo Pasta', description: 'Penne in parmesan cream with grilled chicken strips.', price: 95, category_id: 'pasta', image: img('photo-1621996346565-e3dbc646d9a9'), available: 1, popular: 0, ingredients: ['Penne', 'Cream', 'Parmesan', 'Chicken'], allergens: ['Gluten', 'Dairy'], modifiers: [{ id: 'x-chicken', name: 'Extra chicken', price: 22 }], prep_minutes: 16 },
    { id: 'm5', name: 'Full Breakfast Box', description: 'Eggs, sausage, beans, toast, grilled tomato and fresh juice.', price: 72, category_id: 'breakfast', image: img('photo-1533089860892-a7c6f0a88666'), available: 1, popular: 0, ingredients: ['Egg', 'Sausage', 'Beans'], allergens: ['Egg', 'Gluten'], modifiers: [], prep_minutes: 12 },
    { id: 'm6', name: 'Crispy Wings (8pc)', description: 'Tossed in honey-chilli glaze with ranch dip.', price: 78, category_id: 'chicken', image: img('photo-1527477396000-e27163b481c2'), available: 1, popular: 1, ingredients: ['Chicken', 'Honey', 'Chilli'], allergens: [], modifiers: [{ id: 'x-sauce', name: 'Extra sauce', price: 5 }], prep_minutes: 14 },
    { id: 'm7', name: 'Loaded Fries', description: 'Cheese sauce, chicken bits, spring onion, jalapeño.', price: 45, category_id: 'sides', image: img('photo-1573080496219-bb080dd4f877'), available: 1, popular: 0, ingredients: ['Potato', 'Cheese'], allergens: ['Dairy'], modifiers: [{ id: 'x-cheese', name: 'Extra cheese', price: 10 }], prep_minutes: 10 },
    { id: 'm8', name: 'Meat Pie + Drink Combo', description: 'Flaky beef pie with chilled soda of choice.', price: 38, category_id: 'snacks', image: img('photo-1601050690597-df0568f70950'), available: 1, popular: 0, ingredients: ['Beef', 'Flour'], allergens: ['Gluten'], modifiers: [], prep_minutes: 5 },
    { id: 'm9', name: 'Chocolate Lava Cake', description: 'Warm molten-centre cake with vanilla scoop.', price: 42, category_id: 'desserts', image: img('photo-1578985545062-69928b1d9587'), available: 1, popular: 0, ingredients: ['Chocolate', 'Flour', 'Egg'], allergens: ['Gluten', 'Dairy', 'Egg'], modifiers: [], prep_minutes: 8 },
    { id: 'm10', name: 'Mango Passion Sip', description: 'Fresh mango, passion fruit, mint over crushed ice.', price: 32, category_id: 'sips', image: img('photo-1546171753-97d7676e4602'), available: 1, popular: 1, ingredients: ['Mango', 'Passion fruit'], allergens: [], modifiers: [], prep_minutes: 4 },
    { id: 'm11', name: 'Iced Hibiscus Cooler', description: 'Sobolo chill with pineapple and ginger.', price: 25, category_id: 'drinks', image: img('photo-1556679343-c7306c1976bc'), available: 1, popular: 0, ingredients: ['Hibiscus', 'Pineapple'], allergens: [], modifiers: [], prep_minutes: 3 },
    { id: 'm12', name: 'Grilled Tilapia + Banku', description: 'Whole tilapia, pepper sauce, banku and shito.', price: 110, category_id: 'popular', image: img('photo-1535399831218-d5bd36d1a6b3'), available: 1, popular: 1, ingredients: ['Tilapia', 'Corn dough'], allergens: ['Fish'], modifiers: [], prep_minutes: 22 },
  ];
  const ins = db.prepare(
    'INSERT INTO menu_items (id, name, description, price, category_id, image, available, popular, ingredients, allergens, modifiers, prep_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  for (const m of items) {
    ins.run(String(m.id), String(m.name), String(m.description ?? ''), Number(m.price),
      String(m.category_id), String(m.image ?? ''), Number(m.available), Number(m.popular),
      JSON.stringify(m.ingredients), JSON.stringify(m.allergens), JSON.stringify(m.modifiers), Number(m.prep_minutes));
  }

  const promo = db.prepare('INSERT INTO promos (code, type, value, active) VALUES (?, ?, ?, 1)');
  promo.run('WELCOME15', 'PERCENT', 15);
  promo.run('FREERIDE', 'FREE_DELIVERY', 0);
  promo.run('FLAT10', 'FIXED', 10);

  const inv = db.prepare('INSERT INTO inventory (id, name, qty, unit, min_qty, supplier, unit_cost) VALUES (?, ?, ?, ?, ?, ?, ?)');
  inv.run('i1', 'Chicken Breast', 8, 'kg', 10, 'FarmGate Ltd', 45);
  inv.run('i2', 'Rice (Jasmine)', 50, 'kg', 20, 'Agro Foods', 12);
  inv.run('i3', 'Cheddar', 6, 'kg', 5, 'DairyCo', 60);
  inv.run('i4', 'Cooking Oil', 30, 'L', 15, 'Agro Foods', 18);

  db.prepare('INSERT INTO messages (id, name, email, body, read, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    'msg_seed1', 'Ama Serwaa', 'ama@example.com', 'Do you cater office lunches for 30 people on Fridays?', 0, new Date().toISOString(),
  );
  logAudit('system', 'Seeded demo data', 'database');
}
