import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';

// Socket.IO adapter backed by Redis pub/sub. With several app instances
// behind a load balancer, a user's socket lives on one instance while the
// event that should notify them may happen on another; the Redis adapter
// broadcasts every `server.to(room).emit()` to all instances so it reaches
// the socket wherever it is connected.
export class RedisIoAdapter extends IoAdapter {
  private readonly redisLogger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private clients: Redis[] = [];

  constructor(
    app: INestApplicationContext,
    private readonly corsOrigin: string[] | boolean,
  ) {
    super(app);
  }

  async connectToRedis(url: string): Promise<void> {
    const pubClient = new Redis(url, { lazyConnect: true });
    // The adapter needs a dedicated connection for SUBSCRIBE.
    const subClient = pubClient.duplicate();

    for (const client of [pubClient, subClient]) {
      client.on('error', (err) =>
        this.redisLogger.error(`Redis connection error: ${err.message}`),
      );
    }

    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.clients = [pubClient, subClient];
    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.redisLogger.log('Socket.IO Redis adapter connected');
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server: Server = super.createIOServer(port, {
      ...options,
      cors: { origin: this.corsOrigin, credentials: true },
    } as ServerOptions);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  async dispose(): Promise<void> {
    await super.dispose();
    await Promise.all(this.clients.map((client) => client.quit()));
  }
}
