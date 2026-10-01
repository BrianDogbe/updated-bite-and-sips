import type { Category, MenuItem, Promotion, Rider, InventoryItem } from './types';

// Restaurant HQ — Tema C7, Ghana (mock coordinates; replace with real GPS)
export const RESTAURANT = {
  name: 'Bite & Sips',
  address: 'C7, Tema, Ghana',
  phone: '024 469 3556',
  lat: 5.658,
  lng: -0.012,
  openHour: 8,
  closeHour: 23,
};

export const CATEGORIES: Category[] = [
  { id: 'popular', name: 'Popular', slug: 'popular' },
  { id: 'breakfast', name: 'Breakfast', slug: 'breakfast' },
  { id: 'burgers', name: 'Burgers', slug: 'burgers' },
  { id: 'chicken', name: 'Chicken', slug: 'chicken' },
  { id: 'rice', name: 'Rice', slug: 'rice' },
  { id: 'pizza', name: 'Pizza', slug: 'pizza' },
  { id: 'pasta', name: 'Pasta', slug: 'pasta' },
  { id: 'sides', name: 'Sides', slug: 'sides' },
  { id: 'snacks', name: 'Snacks', slug: 'snacks' },
  { id: 'desserts', name: 'Desserts', slug: 'desserts' },
  { id: 'drinks', name: 'Drinks', slug: 'drinks' },
  { id: 'sips', name: 'Sips', slug: 'sips' },
];

const img = (seed: string) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=800&q=70`;

export const MENU: MenuItem[] = [
  {
    id: 'm1', name: 'Smash Chicken Burger', description: 'Crispy chicken fillet, cheddar, house sauce, brioche bun.', price: 68,
    categoryId: 'burgers', image: img('photo-1568901346375-23c9450c58cd'), available: true, popular: true,
    ingredients: ['Chicken', 'Cheddar', 'Brioche', 'Lettuce'], allergens: ['Gluten', 'Dairy', 'Egg'], prepMinutes: 15,
    modifiers: [{ id: 'x-cheese', name: 'Extra cheese', price: 10 }, { id: 'x-chicken', name: 'Extra chicken', price: 22 }, { id: 'x-sauce', name: 'Extra sauce', price: 5 }],
  },
  {
    id: 'm2', name: 'Jollof & Grilled Chicken', description: 'Smoky party jollof with char-grilled chicken and fried plantain.', price: 85,
    categoryId: 'rice', image: img('photo-1512058564366-18510be2db19'), available: true, popular: true,
    ingredients: ['Rice', 'Chicken', 'Plantain'], allergens: [], prepMinutes: 18,
    modifiers: [{ id: 'x-chicken', name: 'Extra chicken', price: 25 }],
  },
  {
    id: 'm3', name: 'Margherita Pizza 12"', description: 'San Marzano tomato, fior di latte, basil, wood-fired crust.', price: 120,
    categoryId: 'pizza', image: img('photo-1574071318508-1cdbab80d002'), available: true, popular: true,
    ingredients: ['Flour', 'Tomato', 'Mozzarella'], allergens: ['Gluten', 'Dairy'], prepMinutes: 20,
    modifiers: [{ id: 'x-cheese', name: 'Extra cheese', price: 18 }],
  },
  {
    id: 'm4', name: 'Creamy Alfredo Pasta', description: 'Penne in parmesan cream with grilled chicken strips.', price: 95,
    categoryId: 'pasta', image: img('photo-1621996346565-e3dbc646d9a9'), available: true,
    ingredients: ['Penne', 'Cream', 'Parmesan', 'Chicken'], allergens: ['Gluten', 'Dairy'], prepMinutes: 16,
    modifiers: [{ id: 'x-chicken', name: 'Extra chicken', price: 22 }],
  },
  {
    id: 'm5', name: 'Full Breakfast Box', description: 'Eggs, sausage, beans, toast, grilled tomato and fresh juice.', price: 72,
    categoryId: 'breakfast', image: img('photo-1533089860892-a7c6f0a88666'), available: true,
    ingredients: ['Egg', 'Sausage', 'Beans'], allergens: ['Egg', 'Gluten'], prepMinutes: 12,
    modifiers: [],
  },
  {
    id: 'm6', name: 'Crispy Wings (8pc)', description: 'Tossed in honey-chilli glaze with ranch dip.', price: 78,
    categoryId: 'chicken', image: img('photo-1527477396000-e27163b481c2'), available: true, popular: true,
    ingredients: ['Chicken', 'Honey', 'Chilli'], allergens: [], prepMinutes: 14,
    modifiers: [{ id: 'x-sauce', name: 'Extra sauce', price: 5 }],
  },
  {
    id: 'm7', name: 'Loaded Fries', description: 'Cheese sauce, chicken bits, spring onion, jalapeño.', price: 45,
    categoryId: 'sides', image: img('photo-1573080496219-bb080dd4f877'), available: true,
    ingredients: ['Potato', 'Cheese'], allergens: ['Dairy'], prepMinutes: 10,
    modifiers: [{ id: 'x-cheese', name: 'Extra cheese', price: 10 }],
  },
  {
    id: 'm8', name: 'Meat Pie + Drink Combo', description: 'Flaky beef pie with chilled soda of choice.', price: 38,
    categoryId: 'snacks', image: img('photo-1601050690597-df0568f70950'), available: true,
    ingredients: ['Beef', 'Flour'], allergens: ['Gluten'], prepMinutes: 5,
    modifiers: [],
  },
  {
    id: 'm9', name: 'Chocolate Lava Cake', description: 'Warm molten-centre cake with vanilla scoop.', price: 42,
    categoryId: 'desserts', image: img('photo-1578985545062-69928b1d9587'), available: true,
    ingredients: ['Chocolate', 'Flour', 'Egg'], allergens: ['Gluten', 'Dairy', 'Egg'], prepMinutes: 8,
    modifiers: [],
  },
  {
    id: 'm10', name: 'Mango Passion Sip', description: 'Fresh mango, passion fruit, mint over crushed ice.', price: 32,
    categoryId: 'sips', image: img('photo-1546171753-97d7676e4602'), available: true, popular: true,
    ingredients: ['Mango', 'Passion fruit'], allergens: [], prepMinutes: 4,
    modifiers: [],
  },
  {
    id: 'm11', name: 'Iced Hibiscus Cooler', description: 'Sobolo chill with pineapple and ginger.', price: 25,
    categoryId: 'drinks', image: img('photo-1556679343-c7306c1976bc'), available: true,
    ingredients: ['Hibiscus', 'Pineapple'], allergens: [], prepMinutes: 3,
    modifiers: [],
  },
  {
    id: 'm12', name: 'Grilled Tilapia + Banku', description: 'Whole tilapia, pepper sauce, banku and shito.', price: 110,
    categoryId: 'popular', image: img('photo-1535399831218-d5bd36d1a6b3'), available: true, popular: true,
    ingredients: ['Tilapia', 'Corn dough'], allergens: ['Fish'], prepMinutes: 22,
    modifiers: [],
  },
];

export const PROMOTIONS: Promotion[] = [
  { id: 'p1', code: 'WELCOME15', type: 'PERCENT', value: 15, active: true },
  { id: 'p2', code: 'FREERIDE', type: 'FREE_DELIVERY', value: 0, active: true },
  { id: 'p3', code: 'FLAT10', type: 'FIXED', value: 10, active: true },
];

export const INITIAL_RIDERS: Rider[] = [
  { id: 'r1', name: 'Kwame Mensah', email: 'kwame@biteandsips.com', phone: '+233 24 111 2222', role: 'RIDER', active: true,
vehicle: 'Motorbike', plate: 'GR-4521-23', online: true, busy: false, lat: 5.56, lng: -0.2, earningsToday: 180,
deliveriesToday: 6, rating: 4.9 },
  { id: 'r2', name: 'Ama Boateng', email: 'ama.rider@biteandsips.com', phone: '+233 24 333 4444', role: 'RIDER', active: true,
vehicle: 'Motorbike', plate: 'GR-7810-24', online: true, busy: true, lat: 5.57, lng: -0.19, earningsToday: 210,
deliveriesToday: 8, rating: 4.8 },
  { id: 'r3', name: 'Yusuf Ali', email: 'yusuf@biteandsips.com', phone: '+233 24 555 6666', role: 'RIDER', active: true,
vehicle: 'Bicycle', online: false, busy: false, lat: 5.55, lng: -0.21, earningsToday: 60,
deliveriesToday: 2, rating: 4.7 },
];

export const INVENTORY_SEED: InventoryItem[] = [
  { id: 'i1', name: 'Chicken Breast', qty: 8, unit: 'kg', minQty: 10, supplier: 'FarmGate Ltd', unitCost: 45 },
  { id: 'i2', name: 'Rice (Jasmine)', qty: 50, unit: 'kg', minQty: 20, supplier: 'Agro Foods', unitCost: 12 },
  { id: 'i3', name: 'Cheddar', qty: 6, unit: 'kg', minQty: 5, supplier: 'DairyCo', unitCost: 60 },
  { id: 'i4', name: 'Cooking Oil', qty: 30, unit: 'L', minQty: 15, supplier: 'Agro Foods', unitCost: 18 },
];

export const GALLERY = [
  'photo-1517248135467-4c7edcad34c4',
  'photo-1552566626-52f8b828add9',
  'photo-1414235077428-338989a2e8c0',
  'photo-1559339352-11d035aa65de',
  'photo-1556910103-1c02745aae4d',
  'photo-1577219491135-ce391730fb2c',
  'photo-1526367790999-0150786686a2',
  'photo-1600326145359-3a44909d1a39',
].map((s) => `https://images.unsplash.com/${s}?auto=format&fit=crop&w=800&q=70`);
