import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';

export const NOTIFICATION_NAMESPACE = '/notifications';

export const NotificationSocketEvents = {
  NEW: 'notification:new',
  UNREAD_COUNT: 'notification:unread-count',
  ERROR: 'notification:error',
} as const;

const userRoom = (userId: string) => `user:${userId}`;

// Push-only channel: clients never send messages here (marking as read goes
// through REST), so there are no @SubscribeMessage handlers.
@WebSocketGateway({ namespace: NOTIFICATION_NAMESPACE })
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);
  // Sockets are disconnected when their JWT expires, same as HTTP requests
  // would start failing at that point.
  private readonly expiryTimers = new Map<string, NodeJS.Timeout>();

  @WebSocketServer()
  private readonly server: Namespace;

  constructor(private readonly jwtService: JwtService) {}

  // Authenticate during the handshake, so an invalid client is refused
  // before it ever connects; it receives a `connect_error` with the reason.
  afterInit(namespace: Namespace) {
    namespace.use((client, next) => {
      const token = this.extractToken(client);
      if (!token) {
        return next(new Error('Missing token'));
      }
      this.jwtService
        .verifyAsync<{ sub: string; exp?: number }>(token)
        .then((payload) => {
          client.data.userId = payload.sub;
          client.data.tokenExp = payload.exp;
          next();
        })
        .catch(() => next(new Error('Invalid or expired token')));
    });
  }

  async handleConnection(client: Socket) {
    const { userId, tokenExp } = client.data as {
      userId: string;
      tokenExp?: number;
    };
    // Every tab/device of the same user joins the same room, so one emit
    // reaches all of them - on any instance, via the Redis adapter.
    await client.join(userRoom(userId));

    if (tokenExp) {
      this.expiryTimers.set(
        client.id,
        setTimeout(
          () => this.disconnect(client, 'Token expired'),
          tokenExp * 1000 - Date.now(),
        ),
      );
    }
  }

  handleDisconnect(client: Socket) {
    clearTimeout(this.expiryTimers.get(client.id));
    this.expiryTimers.delete(client.id);
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(userRoom(userId)).emit(event, data);
  }

  // Browsers can't set headers on a WebSocket, so the token normally comes
  // from `io(url, { auth: { token } })`; the header is accepted for non-browser
  // clients.
  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken) {
      return authToken.replace(/^Bearer /, '');
    }
    const [type, token] =
      client.handshake.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private disconnect(client: Socket, reason: string) {
    this.logger.debug(`Disconnecting socket ${client.id}: ${reason}`);
    client.emit(NotificationSocketEvents.ERROR, { message: reason });
    client.disconnect(true);
  }
}
