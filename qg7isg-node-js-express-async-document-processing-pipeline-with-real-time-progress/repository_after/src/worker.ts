import './processors/worker';

console.log('Worker started');
console.log(`Concurrency: ${process.env.WORKER_CONCURRENCY || 5}`);
