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

#endif
