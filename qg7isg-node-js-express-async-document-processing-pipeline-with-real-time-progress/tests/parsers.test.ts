import { CSVParser, JSONParser, XMLFileParser } from '../repository_after/src/processors/parsers';
import { ValidationService, transformRecord } from '../repository_after/src/services/validationService';
import * as fs from 'fs';
import * as path from 'path';

describe('File Parsers - Requirement 7', () => {
  const testDir = path.join(__dirname, 'test-files');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('should parse CSV file without loading into memory', async () => {
    const csvContent = 'name,email\nJohn,john@example.com\nJane,jane@example.com\n';
    const filename = 'test.csv';
    const filePath = path.join(testDir, filename);
    fs.writeFileSync(filePath, csvContent);

    const parser = new CSVParser(filename);
    const records = [];
    
    for await (const record of parser.parse()) {
      records.push(record);
    }

    expect(records).toHaveLength(2);
    expect(records[0].data.name).toBe('John');
    expect(records[1].data.email).toBe('jane@example.com');

    fs.unlinkSync(filePath);
  });

  it('should parse JSON array file', async () => {
    const jsonContent = JSON.stringify([
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
    ]);
    const filename = 'test.json';
    const filePath = path.join(testDir, filename);
    fs.writeFileSync(filePath, jsonContent);

    const parser = new JSONParser(filename);
    const records = [];
    
    for await (const record of parser.parse()) {
      records.push(record);
    }

    expect(records).toHaveLength(2);
    expect(records[0].data.name).toBe('John');

    fs.unlinkSync(filePath);
  });

  it('should parse XML file', async () => {
    const xmlContent = `<?xml version="1.0"?>
<root>
  <record><name>John</name><age>30</age></record>
  <record><name>Jane</name><age>25</age></record>
</root>`;
    const filename = 'test.xml';
    const filePath = path.join(testDir, filename);
    fs.writeFileSync(filePath, xmlContent);

    const parser = new XMLFileParser(filename);
    const records = [];
    
    for await (const record of parser.parse()) {
      records.push(record);
    }

    expect(records.length).toBeGreaterThan(0);

    fs.unlinkSync(filePath);
  });
});

describe('Validation Service - Requirement 8', () => {
  it('should validate string with constraints', () => {
    const fields = [
      {
        name: 'username',
        type: 'string',
        validation: {
          type: 'string' as const,
          required: true,
          min: 3,
          max: 20,
        },
      },
    ];

    const validator = new ValidationService(fields);

    const validResult = validator.validate({ username: 'john_doe' });
    expect(validResult.success).toBe(true);

    const invalidResult = validator.validate({ username: 'ab' });
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.errors).toBeDefined();
  });

  it('should validate email format', () => {
    const fields = [
      {
        name: 'email',
        type: 'string',
        validation: {
          type: 'email' as const,
          required: true,
        },
      },
    ];

    const validator = new ValidationService(fields);

    const validResult = validator.validate({ email: 'test@example.com' });
    expect(validResult.success).toBe(true);

    const invalidResult = validator.validate({ email: 'invalid-email' });
    expect(invalidResult.success).toBe(false);
  });

  it('should validate number with min/max', () => {
    const fields = [
      {
        name: 'age',
        type: 'number',
        validation: {
          type: 'number' as const,
          required: true,
          min: 0,
          max: 150,
        },
      },
    ];

    const validator = new ValidationService(fields);

    const validResult = validator.validate({ age: 25 });
    expect(validResult.success).toBe(true);

    const invalidResult = validator.validate({ age: 200 });
    expect(invalidResult.success).toBe(false);
  });

  it('should validate enum values', () => {
    const fields = [
      {
        name: 'status',
        type: 'string',
        validation: {
          type: 'string' as const,
          required: true,
          enum: ['active', 'inactive', 'pending'],
        },
      },
    ];

    const validator = new ValidationService(fields);

    const validResult = validator.validate({ status: 'active' });
    expect(validResult.success).toBe(true);

    const invalidResult = validator.validate({ status: 'unknown' });
    expect(invalidResult.success).toBe(false);
  });

  it('should handle optional fields', () => {
    const fields = [
      {
        name: 'nickname',
        type: 'string',
        validation: {
          type: 'string' as const,
          required: false,
        },
      },
    ];

    const validator = new ValidationService(fields);

    const result = validator.validate({});
    expect(result.success).toBe(true);
  });
});

describe('Transformation Service - Requirement 9', () => {
  it('should apply field mapping', () => {
    const fields = [
      {
        name: 'userName',
        type: 'string',
        transform: {
          mapping: 'user_name',
        },
      },
    ];

    const record = { user_name: 'john_doe' };
    const transformed = transformRecord(record, fields);

    expect(transformed.userName).toBe('john_doe');
  });

  it('should apply default values', () => {
    const fields = [
      {
        name: 'status',
        type: 'string',
        transform: {
          default: 'active',
        },
      },
    ];

    const record = {};
    const transformed = transformRecord(record, fields);

    expect(transformed.status).toBe('active');
  });

  it('should convert string to number', () => {
    const fields = [
      {
        name: 'age',
        type: 'number',
        validation: {
          type: 'number' as const,
        },
      },
    ];

    const record = { age: '25' };
    const transformed = transformRecord(record, fields);

    expect(typeof transformed.age).toBe('number');
    expect(transformed.age).toBe(25);
  });

  it('should convert string to boolean', () => {
    const fields = [
      {
        name: 'isActive',
        type: 'boolean',
        validation: {
          type: 'boolean' as const,
        },
      },
    ];

    const record1 = { isActive: 'true' };
    const transformed1 = transformRecord(record1, fields);
    expect(transformed1.isActive).toBe(true);

    const record2 = { isActive: 'false' };
    const transformed2 = transformRecord(record2, fields);
    expect(transformed2.isActive).toBe(false);
  });
});
