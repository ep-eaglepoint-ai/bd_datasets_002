import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../src/config/database';

async function main() {
  console.log('Seeding database...');

  // Create a test partner
  const partner = await prisma.partner.upsert({
    where: { apiKey: 'test-api-key-12345' },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Test Partner',
      apiKey: 'test-api-key-12345',
      webhookUrl: 'https://example.com/webhook',
    },
  });

  console.log('Created partner:', partner.name);

  // CSV Schema
  const csvSchema = await prisma.schema.upsert({
    where: { id: `${partner.id}-csv` },
    update: {},
    create: {
      id: `${partner.id}-csv`,
      partnerId: partner.id,
      name: 'User Data Schema',
      version: '1.0',
      fields: [
        {
          name: 'name',
          type: 'string',
          validation: {
            type: 'string',
            required: true,
            min: 2,
            max: 100,
          },
        },
        {
          name: 'email',
          type: 'string',
          validation: {
            type: 'email',
            required: true,
          },
        },
        {
          name: 'age',
          type: 'number',
          validation: {
            type: 'number',
            required: false,
            min: 0,
            max: 150,
          },
        },
        {
          name: 'status',
          type: 'string',
          validation: {
            type: 'string',
            required: false,
            enum: ['active', 'inactive', 'pending'],
          },
        },
      ],
      validationRules: {},
    },
  });

  console.log('Created schema:', csvSchema.name);

  // JSON Schema
  const jsonSchema = await prisma.schema.upsert({
    where: { id: `${partner.id}-json` },
    update: {},
    create: {
      id: `${partner.id}-json`,
      partnerId: partner.id,
      name: 'Product Data Schema',
      version: '1.0',
      fields: [
        {
          name: 'productId',
          type: 'string',
          validation: {
            type: 'string',
            required: true,
          },
        },
        {
          name: 'productName',
          type: 'string',
          validation: {
            type: 'string',
            required: true,
            min: 1,
            max: 200,
          },
        },
        {
          name: 'price',
          type: 'number',
          validation: {
            type: 'number',
            required: true,
            min: 0,
          },
        },
        {
          name: 'inStock',
          type: 'boolean',
          validation: {
            type: 'boolean',
            required: false,
          },
          transform: {
            default: true,
          },
        },
      ],
      validationRules: {},
    },
  });

  console.log('Created schema:', jsonSchema.name);

  console.log('\nSeeding completed!');
  console.log('API Key:', partner.apiKey);
  console.log('Partner ID:', partner.id);
  console.log('CSV Schema ID:', csvSchema.id);
  console.log('JSON Schema ID:', jsonSchema.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
