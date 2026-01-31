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

import sax from 'sax';

export class XMLFileParser extends FileParser {
  async *parse(): AsyncGenerator<ParsedRecord> {
    const stream = fs.createReadStream(this.filePath);
    const saxStream = sax.createStream(true, { trim: true });
    
    let index = 0;
    let currentRecord: any = null;
    let currentTag: string | null = null;
    let depth = 0;
    let recordDepth = -1;

    // We'll use a queue to store records found during streaming
    const queue: ParsedRecord[] = [];
    let error: Error | null = null;
    let isStreamDone = false;

    saxStream.on('opentag', (node) => {
      depth++;
      // Assume the pertama level is root, second level is record
      // This is a heuristic similar to the original extractRecords
      if (depth === 2 && recordDepth === -1) {
        recordDepth = depth;
        currentRecord = {};
      }
      currentTag = node.name;
    });

    saxStream.on('text', (text) => {
      if (currentRecord && currentTag && depth === recordDepth + 1) {
        currentRecord[currentTag] = text;
      }
    });

    saxStream.on('closetag', (tagName) => {
      if (depth === recordDepth) {
        queue.push({ data: currentRecord, index: index++ });
        currentRecord = null;
      }
      depth--;
      currentTag = null;
    });

    saxStream.on('error', (e) => {
      error = e;
    });

    saxStream.on('end', () => {
      isStreamDone = true;
    });

    stream.pipe(saxStream);

    // Generator logic to yield records as they arrive in the queue
    while (!isStreamDone || queue.length > 0) {
      if (error) throw error;
      if (queue.length > 0) {
        yield queue.shift()!;
      } else {
        // Give some time for the stream to process
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }
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
