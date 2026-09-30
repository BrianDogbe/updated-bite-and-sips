// Standalone seed runner (also runs automatically on server start).
import 'dotenv/config';
import { ensureSchema, seedIfEmpty } from './db.js';

ensureSchema();
seedIfEmpty();
console.log('Seed complete. Admin: admin@biteandsips.com / admin1234');
