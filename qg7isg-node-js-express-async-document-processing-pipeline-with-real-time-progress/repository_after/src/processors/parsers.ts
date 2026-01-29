import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import StreamArray from 'stream-json/streamers/StreamArray';
import { XMLParser as FastXMLParser } from 'fast-xml-parser';
import { config } from '../config';

export interface ParsedRecord {
  data: Record<string, any>;
  index: number;
}

export abstract class FileParser {
  protected filePath: string;

  constructor(filename: string) {
    this.filePath = path.join(config.upload.dir, filename);
  }

  abstract parse(): AsyncGenerator<ParsedRecord>;
}

export class CSVParser extends FileParser {
  async *parse(): AsyncGenerator<ParsedRecord> {
    let index = 0;
    const stream = fs.createReadStream(this.filePath);
    const parser = stream.pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })
    );

    for await (const record of parser) {
      yield { data: record, index: index++ };
    }
  }
}

export class JSONParser extends FileParser {
  async *parse(): AsyncGenerator<ParsedRecord> {
    const stream = fs.createReadStream(this.filePath);
    const jsonStream = stream.pipe(StreamArray.withParser());

    for await (const { value, key } of jsonStream) {
      yield { data: value, index: key };
    }
  }
}

export class XMLFileParser extends FileParser {
  async *parse(): AsyncGenerator<ParsedRecord> {
    const xmlContent = fs.readFileSync(this.filePath, 'utf-8');
    const parser = new FastXMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const result = parser.parse(xmlContent);
    
    // Assume XML has a root element with array of records
    // Adjust this based on actual XML structure
    const records = this.extractRecords(result);
    
    for (let i = 0; i < records.length; i++) {
      yield { data: records[i], index: i };
    }
  }

  private extractRecords(obj: any): any[] {
    // Find the first array in the object structure
    if (Array.isArray(obj)) {
      return obj;
    }

    for (const key in obj) {
      if (Array.isArray(obj[key])) {
        return obj[key];
      }
      if (typeof obj[key] === 'object') {
        const nested = this.extractRecords(obj[key]);
        if (nested.length > 0) {
          return nested;
        }
      }
    }

    return [obj];
  }
}

export function createParser(filename: string, fileType: string): FileParser {
  switch (fileType.toLowerCase()) {
    case 'csv':
      return new CSVParser(filename);
    case 'json':
      return new JSONParser(filename);
    case 'xml':
      return new XMLFileParser(filename);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
