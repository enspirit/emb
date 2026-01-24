import express, { Request, Response, NextFunction } from 'express';

const app = express();
const port = process.env.PORT || 3000;
const logLevel = process.env.LOG_LEVEL || 'debug';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function log(level: LogLevel, message: string): void {
  const currentLevel = levels[logLevel as LogLevel] || 0;
  if (levels[level] >= currentLevel) {
    console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`);
  }
}

app.use(express.json());

app.use((req: Request, _res: Response, next: NextFunction) => {
  log('debug', `${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV,
    logLevel
  });
});

app.get('/api/info', (_req: Request, res: Response) => {
  log('info', 'Info endpoint called');
  res.json({
    name: 'production-ready-api',
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

app.listen(port, () => {
  log('info', `Server started on port ${port}`);
  log('info', `Environment: ${process.env.NODE_ENV}`);
  log('info', `Log level: ${logLevel}`);
});
