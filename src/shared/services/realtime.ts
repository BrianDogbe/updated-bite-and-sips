// Mock realtime bus. API mirrors a future WebSocket/Supabase/Pusher client
// so UI code (subscribe/publish) does NOT need to change when real infra lands.
// TODO(backend): implement /realtime socket + REALTIME_URL + REALTIME_KEY env.

import type { RealtimeEvent } from '../types';

type Handler = (e: RealtimeEvent) => void;
const handlers = new Set<Handler>();

export function publish(e: RealtimeEvent) {
  // simulate network latency
  setTimeout(() => handlers.forEach((h) => h(e)), 150);
}

export function subscribe(h: Handler): () => void {
  handlers.add(h);
  return () => {
    handlers.delete(h);
  };
}
