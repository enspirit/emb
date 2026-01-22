const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;
const logLevel = process.env.LOG_LEVEL || 'debug';

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function log(level, message) {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levels[logLevel] || 0;
  if (levels[level] >= currentLevel) {
    console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`);
  }
}

app.use(express.json());

app.use((req, res, next) => {
  log('debug', `${req.method} ${req.path}`);
  next();
});

app.get('/health', async (req, res) => {
  let dbStatus = 'unknown';
  try {
    await pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'disconnected';
    log('warn', `Database health check failed: ${err.message}`);
  }

  res.json({
    status: 'ok',
    env: process.env.NODE_ENV,
    logLevel,
    database: dbStatus
  });
});

app.get('/api/info', (req, res) => {
  log('info', 'Info endpoint called');
  res.json({
    name: 'production-ready-api',
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// Example endpoint showcasing PostgreSQL usage
app.get('/api/stats', async (req, res) => {
  log('info', 'Stats endpoint called');
  try {
    // Get database server info
    const versionResult = await pool.query('SELECT version()');
    const timeResult = await pool.query('SELECT NOW() as server_time');

    res.json({
      database: {
        version: versionResult.rows[0].version,
        serverTime: timeResult.rows[0].server_time
      },
      api: {
        uptime: process.uptime(),
        nodeVersion: process.version
      }
    });
  } catch (err) {
    log('error', `Database query failed: ${err.message}`);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  log('info', 'SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

app.listen(port, () => {
  log('info', `Server started on port ${port}`);
  log('info', `Environment: ${process.env.NODE_ENV}`);
  log('info', `Log level: ${logLevel}`);
  log('info', `Database URL: ${process.env.DATABASE_URL ? 'configured' : 'not configured'}`);
});
