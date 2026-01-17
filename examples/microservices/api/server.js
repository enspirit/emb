const express = require('express');
const { log, healthCheck } = require('./utils');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json(healthCheck('api'));
});

app.get('/api/data', (req, res) => {
  log('api', 'Fetching data');
  res.json({ items: ['item1', 'item2', 'item3'] });
});

app.post('/api/process', (req, res) => {
  log('api', `Processing: ${JSON.stringify(req.body)}`);
  res.json({ status: 'queued', id: Date.now() });
});

app.listen(port, () => {
  log('api', `Server listening on port ${port}`);
});
