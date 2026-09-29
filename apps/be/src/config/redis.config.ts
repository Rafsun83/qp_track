import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  // Unset means single-instance mode: Socket.IO falls back to its in-memory
  // adapter, so realtime pushes only reach sockets on this same process.
  url: process.env.REDIS_URL,
}));
