#ifndef PARSER_H
#define PARSER_H

#include "common.h"

// Callback function type for processing a parsed record
// Returns 0 on success, non-zero on failure
typedef int (*RecordCallback)(ShipmentRecord* record, void* context);

// Callback for handling errors found during parsing (e.g. malformed CSV)
typedef void (*ErrorCallback)(int row, const char* message, void* context);

// Parse a chunk of CSV data
// This function needs to handle streaming, so it might need a state context
// For simplicity in this "scratch" implementation, let's assume we process line by line
// but handle the case where a line is split across chunks.

typedef struct {
    char buffer[MAX_LINE_LENGTH * 2]; // Carry-over buffer
    int buffer_len;
    int current_row;
    bool in_quotes;
    char batch_id[BATCH_ID_LENGTH];
} ParserContext;

void parser_init(ParserContext* ctx, const char* batch_id);
void parser_process_chunk(ParserContext* ctx, const char* chunk, size_t length, RecordCallback on_record, ErrorCallback on_error, void* callback_ctx);
void parser_finalize(ParserContext* ctx, RecordCallback on_record, ErrorCallback on_error, void* callback_ctx); // Process any remaining buffer

// Utility to parse a single line (assuming we have a full line)
// Returns 0 on success, -1 on parse error
int parse_csv_line(char* line, ShipmentRecord* record);

#endif
