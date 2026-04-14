const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV });
});

app.get('/', (req, res) => {
  res.json({ message: 'rebuild-triggers API' });
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
