const { log, healthCheck } = require('./utils');

const concurrency = parseInt(process.env.CONCURRENCY || '4', 10);

log('worker', `Starting with concurrency: ${concurrency}`);

// Simulate worker processing
function processJob(jobId) {
  return new Promise((resolve) => {
    const duration = Math.random() * 2000 + 500;
    setTimeout(() => {
      log('worker', `Completed job ${jobId}`);
      resolve();
    }, duration);
  });
}

let jobCounter = 0;

setInterval(async () => {
  const jobs = [];
  for (let i = 0; i < concurrency; i++) {
    jobs.push(processJob(++jobCounter));
  }
  await Promise.all(jobs);
}, 5000);

log('worker', 'Worker started, waiting for jobs...');
