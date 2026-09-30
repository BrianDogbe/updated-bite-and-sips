// Socket.IO fan-out. UI subscribes to the same event names as the
// frontend mock bus, so switching transports changes no page code.
import type { Server } from 'socket.io';

let io: Server | null = null;

export function setIO(server: Server): void {
  io = server;
}

export function emit(type: string, payload: Record<string, unknown>): void {
  io?.emit(type, { type, ...payload, at: new Date().toISOString() });
}
