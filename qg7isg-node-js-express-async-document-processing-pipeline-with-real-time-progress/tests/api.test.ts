import request = require('supertest');
import app, { closeForTest } from '../repository_after/src/app';
import prisma from '../repository_after/src/config/database';
import redis from '../repository_after/src/config/redis';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

describe('Upload API - Requirement 2', () => {
  let partnerId: string;
  let schemaId: string;
  const apiKey = 'test-upload-key-' + Date.now();

  beforeAll(async () => {
    // Create test partner
    const partner = await prisma.partner.create({
      data: {
        id: randomUUID(),
        name: 'Test Upload Partner',
        apiKey,
      },
    });
    partnerId = partner.id;

    // Create test schema
    const schema = await prisma.schema.create({
      data: {
        id: randomUUID(),
        partnerId,
        name: 'Test Schema',
        version: '1.0',
        fields: [
          {
            name: 'name',
            type: 'string',
            validation: { type: 'string', required: true },
          },
        ],
        validationRules: {},
      },
    });
    schemaId = schema.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.job.deleteMany({ where: { partnerId } });
    await prisma.schema.deleteMany({ where: { partnerId } });
    await prisma.partner.delete({ where: { id: partnerId } });
    await prisma.$disconnect();
  });

  it('should upload CSV file and return job_id within 500ms', async () => {
    const csvContent = 'name,email\nJohn Doe,john@example.com\n';
    const filePath = path.join(__dirname, 'test.csv');
    fs.writeFileSync(filePath, csvContent);

    const startTime = Date.now();
    const response = await request(app)
      .post('/api/upload')
      .set('X-API-Key', apiKey)
      .field('schemaId', schemaId)
      .attach('file', filePath);

    const responseTime = Date.now() - startTime;

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('job_id');
    expect(response.body.status).toBe('PENDING');
    expect(responseTime).toBeLessThan(500);

    // Clean up
    fs.unlinkSync(filePath);
  }, 10000);

  it('should reject upload without API key - Requirement 14', async () => {
    const response = await request(app)
      .post('/api/upload')
      .field('schemaId', schemaId)
      .attach('file', Buffer.from('test'), 'test.csv');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('API key is required');
  });

  it('should reject invalid file types', async () => {
    const response = await request(app)
      .post('/api/upload')
      .set('X-API-Key', apiKey)
      .field('schemaId', schemaId)
      .attach('file', Buffer.from('test'), 'test.txt');

    expect(response.status).toBe(500);
  });

  it('should validate file type (CSV, JSON, XML only)', async () => {
    const csvPath = path.join(__dirname, 'test.csv');
    fs.writeFileSync(csvPath, 'name\nTest\n');

    const response = await request(app)
      .post('/api/upload')
      .set('X-API-Key', apiKey)
      .field('schemaId', schemaId)
      .attach('file', csvPath);

    expect(response.status).toBe(201);
    fs.unlinkSync(csvPath);
  });
});

describe('Job Management API - Requirements 3, 4', () => {
  let partnerId: string;
  let jobId: string;
  const apiKey = 'test-job-key-' + Date.now();

  beforeAll(async () => {
    const partner = await prisma.partner.create({
      data: {
        id: randomUUID(),
        name: 'Test Job Partner',
        apiKey,
      },
    });
    partnerId = partner.id;

    const schema = await prisma.schema.create({
      data: {
        id: randomUUID(),
        partnerId,
        name: 'Test Schema',
        version: '1.0',
        fields: [],
        validationRules: {},
      },
    });

    const job = await prisma.job.create({
      data: {
        partnerId,
        schemaId: schema.id,
        filename: 'test.csv',
        fileSize: BigInt(1000),
        fileType: 'csv',
        status: 'PENDING',
      },
    });
    jobId = job.id;
  });

  afterAll(async () => {
    await prisma.job.deleteMany({ where: { partnerId } });
    await prisma.schema.deleteMany({ where: { partnerId } });
    await prisma.partner.delete({ where: { id: partnerId } });
    await prisma.$disconnect();
  });

  it('should get paginated jobs list - Requirement 3', async () => {
    const response = await request(app)
      .get('/api/jobs?page=1&limit=10')
      .set('X-API-Key', apiKey);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('should filter jobs by status', async () => {
    const response = await request(app)
      .get('/api/jobs?status=PENDING')
      .set('X-API-Key', apiKey);

    expect(response.status).toBe(200);
    expect(response.body.data.every((job: any) => job.status === 'PENDING')).toBe(true);
  });

  it('should get job details by ID', async () => {
    const response = await request(app)
      .get(`/api/jobs/${jobId}`)
      .set('X-API-Key', apiKey);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(jobId);
  });

  it('should cancel PENDING job - Requirement 4', async () => {
    const response = await request(app)
      .post(`/api/jobs/${jobId}/cancel`)
      .set('X-API-Key', apiKey);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('CANCELLED');
  });

  it('should not cancel COMPLETED job', async () => {
    const completedJob = await prisma.job.create({
      data: {
        partnerId,
        schemaId: (await prisma.schema.findFirst({ where: { partnerId } }))!.id,
        filename: 'completed.csv',
        fileSize: BigInt(1000),
        fileType: 'csv',
        status: 'COMPLETED',
      },
    });

    const response = await request(app)
      .post(`/api/jobs/${completedJob.id}/cancel`)
      .set('X-API-Key', apiKey);

    expect(response.status).toBe(400);
  });
});

describe('Health Check - Requirement 13', () => {
  it('should return healthy status when services are connected', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.services.database).toBe('connected');
    expect(response.body.services.redis).toBe('connected');
  });
});

afterAll(async () => {
  closeForTest();
  await redis.quit();
});
