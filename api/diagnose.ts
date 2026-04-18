import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../server/index';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (app as any)(req as any, res as any);
}
