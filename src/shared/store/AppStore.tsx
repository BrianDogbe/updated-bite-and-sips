import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Address, AuditEntry, CartLine, ContactMessage, MenuItem, NotificationMsg, Order, OrderStatus,
  Promotion, Rider, User,
} from '../types';
import { MENU, PROMOTIONS, INITIAL_RIDERS, RESTAURANT, INVENTORY_SEED } from '../data';
import type { InventoryItem } from '../types';
import { deliveryFeeForKm, haversineKm, serviceFee } from '../services/delivery';
import { publish, subscribe } from '../services/realtime';
import { api, backendEnabled, connectBackendSocket, getToken, isBackendReachable, setToken } from '../services/backend';

interface Totals { subtotal: number; deliveryFee: number; serviceFee: number; discount: number; total: number; km: number }

interface AppState {
  user: User | null;
  login: (name: string, role?: User['role']) => void;
  loginWithPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginRider: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  menu: MenuItem[];
  setAvailability: (id: string, available: boolean) => void;
  upsertMenuItem: (item: MenuItem) => void;
  cart: CartLine[];
  addToCart: (item: MenuItem, qty: number, modifiers: { id: string; name: string; price: number }[], instructions?: string) => void;
  updateQty: (key: string, qty: number) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
  cartCount: number;
  favorites: string[];
  toggleFav: (id: string) => void;
  addresses: Address[];
  activeAddress: Address | null;
  setActiveAddress: (a: Address | null) => void;
  addAddress: (a: Address) => void;
  orders: Order[];
  placeOrder: (o: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'timeline'>) => Promise<Order>;
  refreshOrders: () => void;
  updateOrderStatus: (id: string, status: OrderStatus, by?: string) => void;
  markOrderPaid: (id: string) => void;
  assignRider: (orderId: string, riderId: string) => void;
  declineOrder: (orderId: string) => void;
  recordDeliveryStats: (riderId: string, fee: number) => void;
  deleteOrder: (id: string) => void;
  riders: Rider[];
  setRiderOnline: (id: string, online: boolean) => void;
  promos: Promotion[];
  applyPromo: (code: string, subtotal: number, deliveryFee: number) => { discount: number; deliveryFee: number };
  calcTotals: (orderType: 'PICKUP' | 'DELIVERY') => Totals;
  notifications: NotificationMsg[];
  pushNotification: (title: string, body: string, orderId?: string) => void;
  markAllRead: () => void;
  messages: ContactMessage[];
  addMessage: (m: { name: string; email: string; body: string }) => void;
  markMessageRead: (id: string) => void;
  deleteMessage: (id: string) => void;
  audit: AuditEntry[];
  logAudit: (user: string, action: string, resource: string, prev?: string, next?: string) => void;
  inventory: InventoryItem[];
  adjustStock: (id: string, delta: number) => void;
  riderLocations: Record<string, { lat: number; lng: number }>;
}

const Ctx = createContext<AppState | null>(null);

let orderSeq = 1024;
const now = () => new Date().toISOString();

/** Mock inbox seeds (mock mode, or backend unreachable). */
function seedMockMessages(): ContactMessage[] {
  return [
    { id: 'msg1', name: 'Ama Serwaa', email: 'ama@example.com', body: 'Do you cater office lunches for 30 people on Fridays?', at: now(), read: false },
    { id: 'msg2', name: 'Kwesi Osei', email: 'kwesi@example.com', body: 'My rider was very polite. The jollof arrived hot — thank you!', at: now(), read: true },
  ];
}

const seedAddresses: Address[] = [
  { id: 'a1', label: 'Home', street: 'Plot 12, Community 7', city: 'Tema', lat: 5.662, lng: -0.008, isDefault: true },
];

const seedOrders: Order[] = [
  // Unassigned READY job: whichever rider signs in sees it under Available jobs,
  // taps Accept & confirm, and runs the full delivery flow (code 4821).
  {
    id: 'BS1021', customerId: 'c1', customerName: 'Efua A.', customerPhone: '+233 24 000 1111',
    items: [{ itemId: 'm1', name: 'Smash Chicken Burger', qty: 2, unitPrice: 68, modifiers: [] }],
    orderType: 'DELIVERY', status: 'READY_FOR_PICKUP', paymentStatus: 'PAID', paymentMethod: 'MOMO_MTN',
    subtotal: 136, deliveryFee: 14, serviceFee: 2.72, discount: 0, total: 152.72,
    deliveryAddress: seedAddresses[0], riderId: undefined, deliveryCode: '4821',
    timeline: [{ status: 'PENDING', at: now() }, { status: 'CONFIRMED', at: now() }, { status: 'PREPARING', at: now() }, { status: 'READY_FOR_PICKUP', at: now() }],
    createdAt: now(), updatedAt: now(),
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Backend mode = 100% live data: no mock seeds, stale mock sessions dropped.
  const live = backendEnabled();
  const [user, setUser] = useState<User | null>(() => {
    try {
      if (live && !getToken()) return null;
      return JSON.parse(localStorage.getItem('bs_user') || 'null');
    } catch { return null; }
  });
  const [menu, setMenu] = useState<MenuItem[]>(MENU);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>(['m1', 'm10']);
  const [addresses, setAddresses] = useState<Address[]>(seedAddresses);
  const [activeAddress, setActiveAddressState] = useState<Address | null>(seedAddresses[0]);
  const [orders, setOrders] = useState<Order[]>(live ? [] : seedOrders);
  const [riders, setRiders] = useState<Rider[]>(live ? [] : INITIAL_RIDERS);
  const [promos] = useState<Promotion[]>(PROMOTIONS);
  const [notifications, setNotifications] = useState<NotificationMsg[]>([
    { id: 'n1', title: 'Welcome to Bite & Sips', body: 'Use WELCOME15 for 15% off your first order.', at: now(), read: false },
  ]);
  const [messages, setMessages] = useState<ContactMessage[]>(() => {
    if (backendEnabled()) return [];
    try {
      const raw = localStorage.getItem('bs_messages');
      if (raw) return JSON.parse(raw) as ContactMessage[];
    } catch {
      /* ignore */
    }
    return seedMockMessages();
  });
  useEffect(() => {
    try {
      localStorage.setItem('bs_messages', JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages]);
  const [audit, setAudit] = useState<AuditEntry[]>([
    { id: 'a1', user: 'System', action: 'Seeded demo data', resource: 'orders', at: now() },
  ]);
  const [inventory, setInventory] = useState<InventoryItem[]>(INVENTORY_SEED);
  const [riderLocations, setRiderLocations] = useState<Record<string, { lat: number; lng: number }>>({});
  const promoCode = useRef<string>('');

  useEffect(() => {
    localStorage.setItem('bs_user', JSON.stringify(user));
  }, [user]);

  // realtime inbound (dedupe: optimistic updates + socket events may both arrive)
  useEffect(() => subscribe((e) => {
    if (e.type === 'ORDER_STATUS') {
      setOrders((prev) => prev.map((o) => {
        if (o.id !== e.orderId) return o;
        const last = o.timeline[o.timeline.length - 1];
        if (last?.status === e.status) return { ...o, status: e.status, updatedAt: e.at };
        return { ...o, status: e.status, updatedAt: e.at, timeline: [...o.timeline, { status: e.status, at: e.at }] };
      }));
    } else if (e.type === 'ORDER_CREATED') {
      setOrders((prev) => (prev.some((o) => o.id === e.order.id) ? prev : [e.order, ...prev]));
    } else if (e.type === 'ORDER_DELETED') {
      setOrders((prev) => prev.filter((o) => o.id !== e.orderId));
    } else if (e.type === 'RIDER_LOCATION') {
      setRiderLocations((prev) => ({ ...prev, [e.riderId]: { lat: e.lat, lng: e.lng } }));
    } else if (e.type === 'NOTIFY') {
      setNotifications((prev) => [e.notification, ...prev]);
    }
  }), []);

  // mock rider movement for active deliveries (skipped once the server is reachable —
  // then real GPS arrives over the socket instead)
  useEffect(() => {
    const t = setInterval(() => {
      if (backendEnabled() && isBackendReachable()) return;
      setOrders((prev) => {
        const active = prev.find((o) => o.status === 'OUT_FOR_DELIVERY' && o.riderId);
        if (!active?.deliveryAddress || !active.riderId) return prev;
        const cur = riderLocations[active.riderId] ?? { lat: RESTAURANT.lat, lng: RESTAURANT.lng };
        const dest = { lat: active.deliveryAddress.lat, lng: active.deliveryAddress.lng };
        const nl = { lat: cur.lat + (dest.lat - cur.lat) * 0.12, lng: cur.lng + (dest.lng - cur.lng) * 0.12 };
        publish({ type: 'RIDER_LOCATION', riderId: active.riderId, orderId: active.id, lat: nl.lat, lng: nl.lng, at: now() });
        return prev;
      });
    }, 2500);
    return () => clearInterval(t);
  }, [riderLocations]);

  // Backend sync: menu once, staff data on staff login, socket events into the bus.
  useEffect(() => {
    if (!backendEnabled()) return;
    api<MenuItem[]>('/api/menu').then(setMenu).catch(() => {});
    return connectBackendSocket((e) => publish(e));
  }, []);
  useEffect(() => {
    if (!backendEnabled() || !user || user.role === 'CUSTOMER') return;
    // Without a token we can never load live lists — always use working seeds.
    if (!getToken()) {
      setOrders(seedOrders);
      setRiders(INITIAL_RIDERS);
      setMessages(seedMockMessages());
      setInventory(INVENTORY_SEED);
      return;
    }
    api<Order[]>('/api/orders', { auth: true }).then(setOrders).catch(() =>
      setOrders((prev) => (prev.length > 0 ? prev : seedOrders)),
    );
    api<Rider[]>('/api/riders', { auth: true }).then(setRiders).catch(() =>
      setRiders((prev) => (prev.length > 0 ? prev : INITIAL_RIDERS)),
    );
    api<ContactMessage[]>('/api/messages', { auth: true }).then(setMessages).catch(() =>
      setMessages((prev) => (prev.length > 0 ? prev : seedMockMessages())),
    );
    api<InventoryItem[]>('/api/inventory', { auth: true }).then(setInventory).catch(() =>
      setInventory((prev) => (prev.length > 0 ? prev : INVENTORY_SEED)),
    );
  }, [user]);

  // Re-pull the order book (used when (re)opening boards, so assignments
  // made elsewhere appear even if a socket event was missed).
  const refreshOrders = useCallback(() => {
    if (!backendEnabled()) return;
    if (!getToken()) {
      setOrders((prev) => (prev.length > 0 ? prev : seedOrders));
      setRiders((prev) => (prev.length > 0 ? prev : INITIAL_RIDERS));
      return;
    }
    api<Order[]>('/api/orders', { auth: true }).then(setOrders).catch(() =>
      setOrders((prev) => (prev.length > 0 ? prev : seedOrders)),
    );
    api<Rider[]>('/api/riders', { auth: true }).then(setRiders).catch(() =>
      setRiders((prev) => (prev.length > 0 ? prev : INITIAL_RIDERS)),
    );
  }, []);

  // Demo credentials for the portal auto-logins (real users sign in via loginWithPassword)
  const DEMO_CREDS: Record<string, { email: string; password: string }> = useMemo(() => ({
    'Kwame Mensah': { email: 'kwame@biteandsips.com', password: 'rider1234' },
    'Kitchen Staff': { email: 'kitchen@biteandsips.com', password: 'kitchen1234' },
  }), []);

  const login = useCallback((name: string, role: User['role'] = 'CUSTOMER') => {
    if (backendEnabled() && DEMO_CREDS[name]) {
      const creds = DEMO_CREDS[name];
      api<{ token: string; user: { id: string; name: string; email: string; role: User['role']; phone?: string } }>(
        '/api/auth/login', { method: 'POST', body: { email: creds.email, password: creds.password } },
      ).then((res) => {
        setToken(res.token);
        setUser({ id: res.user.id, name: res.user.name, email: res.user.email, phone: res.user.phone ?? '', role: res.user.role, active: true });
      }).catch(() => {
        setUser({ id: 'u_' + Math.random().toString(36).slice(2, 7), name, phone: '+233 24 000 0000', role, active: true });
      });
      return;
    }
    setUser({ id: 'u_' + Math.random().toString(36).slice(2, 7), name, phone: '+233 24 000 0000', role, active: true });
  }, [DEMO_CREDS]);
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const loginWithPassword = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const clean = email.trim().toLowerCase();
    const mockCheck = (): { ok: boolean; error?: string } => {
      if (clean !== 'admin@biteandsips.com') return { ok: false, error: 'Incorrect email.' };
      if (password !== 'admin1234') return { ok: false, error: 'Incorrect password.' };
      setUser({ id: 'u_admin', name: 'Admin', email: clean, phone: '', role: 'ADMIN', active: true });
      return { ok: true };
    };
    if (backendEnabled()) {
      try {
        const res = await api<{ token: string; user: { id: string; name: string; email: string; role: User['role']; phone?: string } }>(
          '/api/auth/login', { method: 'POST', body: { email: clean, password } },
        );
        setToken(res.token);
        setUser({ id: res.user.id, name: res.user.name, email: res.user.email, phone: res.user.phone ?? '', role: res.user.role, active: true });
        return { ok: true };
      } catch (e) {
        // Server down → strict mock credential keeps the portal usable.
        if (!isBackendReachable()) return mockCheck();
        return { ok: false, error: e instanceof Error ? e.message : 'Login failed' };
      }
    }
    return mockCheck();
  }, []);

  const loginRider = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const clean = email.trim().toLowerCase();
    if (backendEnabled()) {
      try {
        const res = await api<{ token: string; user: { id: string; name: string; email: string; role: User['role']; phone?: string } }>(
          '/api/auth/login', { method: 'POST', body: { email: clean, password } },
        );
        if (res.user.role !== 'RIDER') {
          setToken(null);
          return { ok: false, error: 'This sign-in is for riders only.' };
        }
        setToken(res.token);
        setUser({ id: res.user.id, name: res.user.name, email: res.user.email, phone: res.user.phone ?? '', role: 'RIDER', active: true });
        return { ok: true };
      } catch (e) {
        if (!isBackendReachable()) {
          const r = riders.find((x) => x.email?.toLowerCase() === clean);
          if (!r) return { ok: false, error: 'Unknown rider email.' };
          if (password !== 'rider1234') return { ok: false, error: 'Incorrect password.' };
          setUser({ id: r.id, name: r.name, email: r.email, phone: r.phone, role: 'RIDER', active: true });
          return { ok: true };
        }
        return { ok: false, error: e instanceof Error ? e.message : 'Login failed' };
      }
    }
    const r = riders.find((x) => x.email?.toLowerCase() === clean);
    if (!r) return { ok: false, error: 'Unknown rider email.' };
    if (password !== 'rider1234') return { ok: false, error: 'Incorrect password.' };
    setUser({ id: r.id, name: r.name, email: r.email, phone: r.phone, role: 'RIDER', active: true });
    return { ok: true };
  }, [riders]);

  const setAvailability = useCallback((id: string, available: boolean) => {
    setMenu((m) => m.map((x) => (x.id === id ? { ...x, available } : x)));
  }, []);
  const upsertMenuItem = useCallback((item: MenuItem) => {
    setMenu((m) => (m.some((x) => x.id === item.id) ? m.map((x) => (x.id === item.id ? item : x)) : [...m, item]));
  }, []);

  const addToCart = useCallback<AppState['addToCart']>((item, qty, modifiers, instructions) => {
    const unitPrice = item.price + modifiers.reduce((s, m) => s + m.price, 0);
    const key = `${item.id}|${modifiers.map((m) => m.id).sort().join(',')}|${instructions ?? ''}`;
    setCart((c) => {
      const ex = c.find((l) => l.key === key);
      if (ex) return c.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
      return [...c, { key, itemId: item.id, name: item.name, image: item.image, unitPrice, qty, modifiers, instructions }];
    });
  }, []);
  const updateQty = useCallback((key: string, qty: number) => {
    setCart((c) => (qty <= 0 ? c.filter((l) => l.key !== key) : c.map((l) => (l.key === key ? { ...l, qty } : l))));
  }, []);
  const removeLine = useCallback((key: string) => setCart((c) => c.filter((l) => l.key !== key)), []);
  const clearCart = useCallback(() => setCart([]), []);
  const cartCount = useMemo(() => cart.reduce((s, l) => s + l.qty, 0), [cart]);

  const toggleFav = useCallback((id: string) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])), []);

  const setActiveAddress = useCallback((a: Address | null) => {
    setActiveAddressState(a);
    if (a) setAddresses((prev) => (prev.some((x) => x.id === a.id) ? prev : [...prev, a]));
  }, []);
  const addAddress = useCallback((a: Address) => {
    setAddresses((prev) => [...prev, a]);
    setActiveAddressState(a);
  }, []);

  const calcTotals = useCallback<AppState['calcTotals']>((orderType) => {
    const subtotal = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);
    let km = 0; let deliveryFee = 0;
    if (orderType === 'DELIVERY') {
      const dest = activeAddress ?? seedAddresses[0];
      km = haversineKm(RESTAURANT.lat, RESTAURANT.lng, dest.lat, dest.lng);
      deliveryFee = deliveryFeeForKm(Math.max(km, 0.6)).fee;
    }
    const sFee = serviceFee(subtotal);
    let discount = 0;
    const code = promoCode.current;
    if (code) {
      const p = promos.find((x) => x.code === code && x.active);
      if (p?.type === 'PERCENT') discount = +(subtotal * (p.value / 100)).toFixed(2);
      if (p?.type === 'FIXED') discount = Math.min(p.value, subtotal);
      if (p?.type === 'FREE_DELIVERY') deliveryFee = 0;
    }
    return { subtotal, deliveryFee, serviceFee: sFee, discount, total: Math.max(0, subtotal + deliveryFee + sFee - discount), km };
  }, [cart, activeAddress, promos]);

  const applyPromo = useCallback<AppState['applyPromo']>((code, subtotal, dFee) => {
    const p = promos.find((x) => x.code.toUpperCase() === code.toUpperCase() && x.active);
    if (!p) return { discount: 0, deliveryFee: dFee };
    promoCode.current = p.code;
    if (p.type === 'PERCENT') return { discount: +(subtotal * (p.value / 100)).toFixed(2), deliveryFee: dFee };
    if (p.type === 'FIXED') return { discount: Math.min(p.value, subtotal), deliveryFee: dFee };
    return { discount: 0, deliveryFee: 0 };
  }, [promos]);

  const pushNotification = useCallback((title: string, body: string, orderId?: string) => {
    const n: NotificationMsg = { id: 'n' + Date.now(), title, body, at: now(), read: false, orderId };
    setNotifications((prev) => [n, ...prev]);
    publish({ type: 'NOTIFY', notification: n });
  }, []);

  const logAudit = useCallback((userN: string, action: string, resource: string, prev?: string, next?: string) => {
    setAudit((a) => [{ id: 'log' + Date.now(), user: userN, action, resource, prev, next, at: now() }, ...a]);
  }, []);

  const placeOrder: AppState['placeOrder'] = useCallback(async (o) => {
    if (backendEnabled()) {
      try {
        const distanceKm = o.deliveryAddress
          ? haversineKm(RESTAURANT.lat, RESTAURANT.lng, o.deliveryAddress.lat, o.deliveryAddress.lng)
          : 0;
        const serverOrder = await api<Order>('/api/orders', {
          method: 'POST',
          body: {
            customerId: o.customerId,
            customerName: o.customerName,
            customerPhone: o.customerPhone,
            items: o.items.map((it) => ({ itemId: it.itemId, qty: it.qty, modifiers: it.modifiers, instructions: it.instructions })),
            orderType: o.orderType,
            paymentMethod: o.paymentMethod,
            paymentStatus: o.paymentStatus,
            deliveryAddress: o.deliveryAddress ?? undefined,
            pickupTime: o.pickupTime ?? undefined,
            pickupMode: o.pickupMode ?? undefined,
            distanceKm,
            promoCode: promoCode.current || undefined,
          },
        });
        setOrders((prev) => (prev.some((x) => x.id === serverOrder.id) ? prev : [serverOrder, ...prev]));
        publish({ type: 'ORDER_CREATED', order: serverOrder });
        pushNotification('Order received', `Order ${serverOrder.id} placed. Total GH₵${serverOrder.total.toFixed(2)}.`, serverOrder.id);
        setCart([]);
        promoCode.current = '';
        return serverOrder;
      } catch {
        // fall through to local mock so the order is never lost
      }
    }
    const id = `BS${orderSeq++}`;
    const order: Order = { ...o, id, createdAt: now(), updatedAt: now(), timeline: [{ status: 'PENDING', at: now() }] };
    setOrders((prev) => [order, ...prev]);
    publish({ type: 'ORDER_CREATED', order });
    pushNotification('Order received', `Order ${id} placed. Total GH₵${order.total.toFixed(2)}.`, id);
    // simulate kitchen auto-confirm after 6s for demo
    setTimeout(() => publish({ type: 'ORDER_STATUS', orderId: id, status: 'CONFIRMED', at: now() }), 6000);
    setCart([]);
    promoCode.current = '';
    return order;
  }, [pushNotification]);

  const updateOrderStatus = useCallback((id: string, status: OrderStatus, by?: string) => {
    if (backendEnabled()) {
      api(`/api/orders/${id}/status`, { method: 'PATCH', auth: true, body: { status, by } }).catch(() => {
        publish({ type: 'ORDER_STATUS', orderId: id, status, at: now() });
      });
    } else {
      publish({ type: 'ORDER_STATUS', orderId: id, status, at: now() });
    }
    const o = orders.find((x) => x.id === id);
    if (o) logAudit(by ?? 'staff', `Marked ${id} as ${status}`, 'orders', o.status, status);
  }, [orders, logAudit]);

  const markOrderPaid = useCallback((id: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, paymentStatus: 'PAID' as const, updatedAt: now() } : o)));
  }, []);

  const assignRider = useCallback((orderId: string, riderId: string) => {
    if (backendEnabled()) {
      api(`/api/orders/${orderId}/assign`, { method: 'PATCH', auth: true, body: { riderId } }).catch(() => {});
    }
    // Advance READY → RIDER_ASSIGNED locally too, so the rider board, the resume
    // banner and customer tracking move even if the socket event is missed.
    // (The realtime dedupe guard makes a duplicate server event harmless.)
    const advance = orders.some((o) => o.id === orderId && o.status === 'READY_FOR_PICKUP');
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      const next: Order = { ...o, riderId };
      if (o.status === 'READY_FOR_PICKUP') {
        next.status = 'RIDER_ASSIGNED';
        next.updatedAt = now();
        next.timeline = [...o.timeline, { status: 'RIDER_ASSIGNED' as OrderStatus, at: now() }];
      }
      return next;
    }));
    publish({ type: 'RIDER_ASSIGNED', orderId, riderId });
    if (advance) publish({ type: 'ORDER_STATUS', orderId, status: 'RIDER_ASSIGNED', at: now() });
    setRiders((prev) => prev.map((r) => (r.id === riderId ? { ...r, busy: true } : r)));
  }, [orders]);

  // Rider declines before pickup: release the order back to READY so the
  // kitchen can hand it to someone else. Customer tracking shows it as ready again.
  const declineOrder = useCallback((orderId: string) => {
    if (backendEnabled()) {
      api(`/api/orders/${orderId}/assign`, { method: 'PATCH', auth: true, body: { riderId: null } }).catch(() => {});
    }
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      if (o.status !== 'RIDER_ASSIGNED' && o.status !== 'READY_FOR_PICKUP') return o;
      const next: Order = { ...o, riderId: undefined };
      if (o.status === 'RIDER_ASSIGNED') {
        next.status = 'READY_FOR_PICKUP';
        next.updatedAt = now();
        next.timeline = [...o.timeline, { status: 'READY_FOR_PICKUP' as OrderStatus, at: now() }];
      }
      return next;
    }));
    publish({ type: 'ORDER_STATUS', orderId, status: 'READY_FOR_PICKUP', at: now() });
    setRiders((prev) => prev.map((r) => ({ ...r, busy: false })));
  }, []);

  // Delivery completed: bump the rider's own stats so Earnings/History feel alive.
  const recordDeliveryStats = useCallback((riderId: string, fee: number) => {
    setRiders((prev) => prev.map((r) => (r.id === riderId
      ? { ...r, deliveriesToday: r.deliveriesToday + 1, earningsToday: +(r.earningsToday + fee).toFixed(2), busy: false }
      : r)));
  }, []);
  // Remove a finished/cancelled ticket from every board (customer keeps history via tracking link until then).
  const deleteOrder = useCallback((id: string) => {
    if (backendEnabled()) {
      api(`/api/orders/${id}`, { method: 'DELETE', auth: true }).catch(() => {});
    }
    publish({ type: 'ORDER_DELETED', orderId: id });
  }, []);

  const setRiderOnline = useCallback((id: string, online: boolean) => {
    setRiders((r) => r.map((x) => (x.id === id ? { ...x, online } : x)));
  }, []);

  const markAllRead = useCallback(() => setNotifications((n) => n.map((x) => ({ ...x, read: true }))), []);

  const addMessage = useCallback((m: { name: string; email: string; body: string }) => {
    if (backendEnabled()) {
      api<ContactMessage>('/api/messages', { method: 'POST', body: m })
        .then((saved) => {
          setMessages((prev) => (prev.some((x) => x.id === saved.id) ? prev : [saved, ...prev]));
          pushNotification('New customer message', `${m.name}: ${m.body.slice(0, 60)}`);
        })
        .catch(() => {
          const msg: ContactMessage = { id: 'msg' + Date.now(), ...m, at: now(), read: false };
          setMessages((prev) => [msg, ...prev]);
          pushNotification('New customer message', `${m.name}: ${m.body.slice(0, 60)}`);
        });
      return;
    }
    const msg: ContactMessage = { id: 'msg' + Date.now(), ...m, at: now(), read: false };
    setMessages((prev) => [msg, ...prev]);
    pushNotification('New customer message', `${m.name}: ${m.body.slice(0, 60)}`);
  }, [pushNotification]);
  const markMessageRead = useCallback((id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
  }, []);
  const deleteMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);
  const adjustStock = useCallback((id: string, delta: number) => {
    setInventory((inv) => inv.map((x) => (x.id === id ? { ...x, qty: Math.max(0, x.qty + delta) } : x)));
  }, []);

  const value: AppState = {
    user, login, loginWithPassword, loginRider, logout, menu, setAvailability, upsertMenuItem, cart, addToCart, updateQty,
    removeLine, clearCart, cartCount, favorites, toggleFav, addresses, activeAddress,
    setActiveAddress, addAddress, orders, placeOrder, refreshOrders, updateOrderStatus, markOrderPaid, assignRider, deleteOrder, declineOrder, recordDeliveryStats,
    riders, setRiderOnline, promos, applyPromo, calcTotals, notifications, pushNotification,
    markAllRead, messages, addMessage, markMessageRead, deleteMessage, audit, logAudit, inventory, adjustStock, riderLocations,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}
