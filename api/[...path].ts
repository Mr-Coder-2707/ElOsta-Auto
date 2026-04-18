import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../server/index';

// Vercel Serverless Function entry.
// Express apps are compatible handlers (req, res) when not calling listen().
export default function handler(req: IncomingMessage, res: ServerResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (app as any)(req as any, res as any);
}
