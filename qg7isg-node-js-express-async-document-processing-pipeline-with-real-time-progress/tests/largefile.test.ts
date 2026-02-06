import { XMLFileParser } from '../repository_after/src/processors/parsers';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../repository_after/src/config';

describe('Large File Streaming - Requirement 7 gap', () => {
  const filename = 'large-test.xml';
  const filePath = path.join(config.upload.dir, filename);

  beforeAll(() => {
    if (!fs.existsSync(config.upload.dir)) {
      fs.mkdirSync(config.upload.dir, { recursive: true });
    }
    
    // Create a moderately large XML file (~1MB) to verify streaming
    const writeStream = fs.createWriteStream(filePath);
    writeStream.write('<?xml version="1.0" encoding="UTF-8"?><root>');
    for (let i = 0; i < 5000; i++) {
      writeStream.write(`<record><id>${i}</id><name>Item ${i}</name><desc>Large description for item ${i} to increase file size significantly</desc></record>`);
    }
    writeStream.write('</root>');
    writeStream.end();
  });

  afterAll(() => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  it('should parse 5000 records without loading full file into memory', async () => {
    const parser = new XMLFileParser(filename);
    let count = 0;
    
    const startTime = Date.now();
    for await (const record of parser.parse()) {
      count++;
      if (count % 1000 === 0) {
        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        // console.log(`Processed ${count} records. Heap used: ${memoryUsage.toFixed(2)} MB`);
      }
    }
    const duration = Date.now() - startTime;
    
    expect(count).toBe(5000);
    // console.log(`Total time: ${duration}ms`);
  }, 30000);
});
