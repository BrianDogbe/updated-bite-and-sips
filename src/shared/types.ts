// ─── Bite & Sips shared domain types ─────────────────────────────
// Designed to map 1:1 to future DB tables + realtime events.

export type Role =
  | 'OWNER'
  | 'ADMIN'
  | 'MANAGER'
  | 'KITCHEN_MANAGER'
  | 'KITCHEN_STAFF'
  | 'DELIVERY_MANAGER'
  | 'RIDER'
  | 'ACCOUNTANT'
  | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: Role;
  avatar?: string;
  active: boolean;
}

export interface Address {
  id: string;
  label: string;
  street: string;
  apartment?: string;
  city: string;
  landmark?: string;
  instructions?: string;
  lat: number; // mock vs real flagged at service layer
  lng: number;
  isDefault?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
}

export interface Modifier {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  image: string;
  available: boolean;
  popular?: boolean;
  ingredients: string[];
  allergens: string[];
  modifiers: Modifier[];
  prepMinutes: number;
}

export type OrderType = 'PICKUP' | 'DELIVERY';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'RIDER_ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'MOMO_MTN' | 'MOMO_VODAFONE' | 'MOMO_AIRTELTIGO' | 'CARD' | 'CASH_ON_DELIVERY' | 'CASH_ON_PICKUP';

export interface CartLine {
  key: string;
  itemId: string;
  name: string;
  image: string;
  unitPrice: number;
  qty: number;
  modifiers: Modifier[];
  instructions?: string;
}

export interface OrderItem {
  itemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  modifiers: Modifier[];
  instructions?: string;
}

export interface Order {
  id: string; // e.g. BS1024
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  orderType: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  total: number;
  pickupTime?: string; // ISO
  pickupMode?: 'ASAP' | 'SCHEDULED';
  deliveryAddress?: Address;
  riderId?: string;
  deliveryCode?: string; // OTP for verification
  timeline: { status: OrderStatus; at: string; by?: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface Rider extends User {
  vehicle: string;
  plate?: string;
  online: boolean;
  busy: boolean;
  lat: number;
  lng: number;
  earningsToday: number;
  deliveriesToday: number;
  rating: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  minQty: number;
  supplier: string;
  unitCost: number;
}

export interface Promotion {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED' | 'FREE_DELIVERY';
  value: number;
  active: boolean;
  expiresAt?: string;
}

export interface AuditEntry {
  id: string;
  user: string;
  action: string;
  resource: string;
  prev?: string;
  next?: string;
  at: string;
}

export interface NotificationMsg {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  orderId?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  body: string;
  at: string;
  read: boolean;
}

// Realtime event envelope — implemented today over an in-memory bus,
// swappable for WebSocket/Supabase Realtime/Pusher later.
export type RealtimeEvent =
  | { type: 'ORDER_CREATED'; order: Order }
  | { type: 'ORDER_STATUS'; orderId: string; status: OrderStatus; at: string }
  | { type: 'RIDER_LOCATION'; riderId: string; orderId: string; lat: number; lng: number; at: string }
  | { type: 'RIDER_ASSIGNED'; orderId: string; riderId: string }
  | { type: 'NOTIFY'; notification: NotificationMsg };
