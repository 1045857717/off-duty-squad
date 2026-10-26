import type { ManagerOptions, SocketOptions, Socket } from "socket.io-client";
import { NetworkHealth, NETWORK_PROBE_TIMEOUT_MS } from "./networkHealth";

/** Establish over ordinary HTTP first, then upgrade to WebSocket. A blocked
 * or silently hanging upgrade must not prevent an otherwise healthy connection.
 * tryAllTransports also permits a direct socket if a proxy rejects polling. */
export function networkOptions(): Partial<ManagerOptions & SocketOptions> {
  return {
    transports: ["polling", "websocket"],
    upgrade: true,
    tryAllTransports: true,
    reconnection: true,
    reconnectionDelay: 750,
    timeout: 5000,
  };
}

/** A sparse acknowledged probe must not be volatile: a transport busy sending
 * input is healthy, and discarding its probe manufactures a timeout. The
 * acknowledgement deadline and NetworkHealth's single flight bound the queue. */
export function sendLatencyProbe(
  socket: Socket,
  health: NetworkHealth,
  done: () => void,
) {
  if (!socket.connected) return;
  const probe = health.beginProbe();
  if (probe === null) return;
  socket
    .timeout(NETWORK_PROBE_TIMEOUT_MS)
    .emit("ping:latency", {}, (error: Error | null) => {
      health.finishProbe(probe, !!error);
      done();
    });
}
