const fs = require('node:fs');

const snapshot = fs.readFileSync('/app/snapshot.txt', 'utf8');
console.log(`docs-scraper: ${snapshot.trim()}`);
