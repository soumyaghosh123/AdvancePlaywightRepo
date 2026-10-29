import path from 'node:path';
import pino, { type Logger } from 'pino';

/** JSON log file per Playwright worker: <dir>/worker-<n>.log (default reports/logs). */
export function createLogger(opts: { workerIndex: number; dir?: string; level?: string }): Logger {
  const dest = path.join(opts.dir ?? path.join('reports', 'logs'), `worker-${opts.workerIndex}.log`);
  return pino({ level: opts.level ?? process.env.LOG_LEVEL ?? 'info' }, pino.destination({ dest, mkdir: true, sync: true }));
}
