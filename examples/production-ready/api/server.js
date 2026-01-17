const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
const logLevel = process.env.LOG_LEVEL || 'debug';

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

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV,
    logLevel
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

app.listen(port, () => {
  log('info', `Server started on port ${port}`);
  log('info', `Environment: ${process.env.NODE_ENV}`);
  log('info', `Log level: ${logLevel}`);
});
