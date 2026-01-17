// Shared utilities used by all microservices

function log(service, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${service}] ${message}`);
}

function healthCheck(serviceName) {
  return {
    status: 'ok',
    service: serviceName,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  };
}

module.exports = { log, healthCheck };
