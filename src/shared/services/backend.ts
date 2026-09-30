// Backend bridge: REST + Socket.IO client.
// Set VITE_API_URL (e.g. http://localhost:4000) to talk to the real backend.
// With it unset, every call throws BackendOff and the app stays on local mock data.
import { io, type Socket } from 'socket.io-client';
import type { RealtimeEvent } from '../types';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');
export const backendEnabled = (): boolean => !!API_URL;

const TOKEN_KEY = 'bs_token';
export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (t: string | null): void => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

export async function api<T>(path: string, opts: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  if (!API_URL) throw new Error('BackendOff');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `API ${res.status}`);
  }
  return (await res.json()) as T;
}

let socket: Socket | null = null;

export function connectBackendSocket(onEvent: (e: RealtimeEvent) => void): () => void {
  if (!API_URL || socket?.connected) return () => {};
  socket = io(API_URL, { transports: ['websocket', 'polling'] });
  const handler = (e: RealtimeEvent) => onEvent(e);
  socket.on('ORDER_CREATED', handler);
  socket.on('ORDER_STATUS', handler);
  socket.on('RIDER_LOCATION', handler);
  socket.on('RIDER_ASSIGNED', handler);
  socket.on('NOTIFY', handler);
  return () => {
    socket?.off('ORDER_CREATED', handler);
    socket?.off('ORDER_STATUS', handler);
    socket?.off('RIDER_LOCATION', handler);
    socket?.off('RIDER_ASSIGNED', handler);
    socket?.off('NOTIFY', handler);
  };
}

export function emitRiderLocation(p: { riderId: string; orderId: string; lat: number; lng: number }): void {
  socket?.emit('rider:location', p);
}
