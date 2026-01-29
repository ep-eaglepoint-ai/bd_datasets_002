#ifndef DB_H
#define DB_H

#include "common.h"
#include <mongoc/mongoc.h>

void db_init();
void db_cleanup();

// Insert a batch of valid records
int db_insert_records(const char* batch_id, ShipmentRecord** records, int count);

// Insert a batch of validation errors
int db_insert_errors(const char* batch_id, ValidationError** errors, int count);

// Update progress for a batch
int db_update_progress(const char* batch_id, const BatchProgress* progress);

// Retrieve progress
int db_get_progress(const char* batch_id, BatchProgress* progress);

// Get filtered data (simplified signature for now)
mongoc_cursor_t* db_get_records(const char* batch_id, int skip, int limit, const char* sort_field, int sort_order, const char* search_term);

// Check connection health
bool db_check_health();

// Get filtered data as JSON string (heap allocated, caller frees)
char* db_query_json(const char* batch_id, int skip, int limit, const char* search, const char* sort_by);

// Get errors as JSON string
char* db_get_errors_json(const char* batch_id);

// Delete batch
int db_delete_batch(const char* batch_id);

// Export functions
void* db_open_export_cursor(const char* batch_id, bool is_csv);
int db_read_export_chunk(void* context, char* buf, size_t max);
void db_close_export_cursor(void* context);

#endif
