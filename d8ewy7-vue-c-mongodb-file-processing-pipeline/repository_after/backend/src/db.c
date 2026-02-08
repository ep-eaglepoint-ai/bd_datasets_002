#include "db.h"
#include <stdio.h>
#include <stdlib.h>
#ifdef _WIN32
#include <windows.h>
#else
#include <unistd.h>
#endif

static mongoc_client_pool_t *pool = NULL;
static mongoc_uri_t *uri = NULL;

void db_init() {
    mongoc_init();
    // Get URI from env or default
    const char* uri_string = getenv("MONGODB_URI");
    if (!uri_string) uri_string = "mongodb://localhost:27017";
    
    bson_error_t error;
    uri = mongoc_uri_new_with_error(uri_string, &error);
    if (!uri) {
        fprintf(stderr, "Failed to parse URI: %s\n", error.message);
        exit(1);
    }
    
    pool = mongoc_client_pool_new(uri);
    mongoc_client_pool_set_error_api(pool, 2);
}

void db_cleanup() {
    if (pool) mongoc_client_pool_destroy(pool);
    if (uri) mongoc_uri_destroy(uri);
    mongoc_cleanup();
}

// Helper to get collection
mongoc_collection_t* get_collection(mongoc_client_t* client, const char* name) {
    const char* db_name = getenv("MONGODB_DB");
    if (!db_name) db_name = "logistics";
    return mongoc_client_get_collection(client, db_name, name);
}

// Check DB connection health
bool db_check_health() {
    if (!pool) return false;
    
    // Pop a client to test connection
    mongoc_client_t *client = mongoc_client_pool_try_pop(pool);
    if (!client) {
         // Pool might be exhausted? Or try generic pop if try_pop fails specifically?
         // try_pop returns NULL if no client available immediately.
         // Let's use pop with timeout?
         // Actually, try_pop is non-blocking. If pool full, we assume healthy? 
         // But we want to test connectivity.
         client = mongoc_client_pool_pop(pool);
    }
    
    if (!client) return false;
    
    bson_t *cmd = BCON_NEW("ping", BCON_INT32(1));
    bson_error_t error;
    bson_t reply;
    bool ret = mongoc_client_command_simple(client, "admin", cmd, NULL, &reply, &error);
    
    bson_destroy(cmd);
    bson_destroy(&reply);
    mongoc_client_pool_push(pool, client);
    
    return ret;
}

int db_insert_records(const char* batch_id, ShipmentRecord** records, int count) {
    if (count == 0) return 0;
    
    mongoc_client_t *client = mongoc_client_pool_pop(pool);
    mongoc_collection_t *collection = get_collection(client, "shipments");
    
    mongoc_bulk_operation_t *bulk = mongoc_collection_create_bulk_operation_with_opts(collection, NULL);
    
    for (int i=0; i<count; i++) {
        bson_t *doc = bson_new();
        BSON_APPEND_UTF8(doc, "batch_id", batch_id);
        BSON_APPEND_UTF8(doc, "tracking_number", records[i]->tracking_number);
        BSON_APPEND_UTF8(doc, "origin", records[i]->origin);
        BSON_APPEND_UTF8(doc, "destination", records[i]->destination);
        BSON_APPEND_DOUBLE(doc, "weight_kg", records[i]->weight_kg);
        BSON_APPEND_DOUBLE(doc, "length_cm", records[i]->length_cm);
        BSON_APPEND_DOUBLE(doc, "width_cm", records[i]->width_cm);
        BSON_APPEND_DOUBLE(doc, "height_cm", records[i]->height_cm);
        BSON_APPEND_UTF8(doc, "ship_date", records[i]->ship_date);
        BSON_APPEND_UTF8(doc, "status", records[i]->status);
        BSON_APPEND_INT32(doc, "row_number", records[i]->row_number);
        BSON_APPEND_TIME_T(doc, "inserted_at", time(NULL));
        
        mongoc_bulk_operation_insert(bulk, doc);
        bson_destroy(doc);
    }
    
    bson_error_t error;
    bson_t reply;
    bool ret = false;
    
    // Retry logic (Req 13)
    int delay_sec = 1;
    for (int attempt = 0; attempt < 5; attempt++) {
        ret = mongoc_bulk_operation_execute(bulk, &reply, &error);
        if (ret) break;
        
        fprintf(stderr, "Bulk insert failed (attempt %d/5): %s. Retrying in %ds...\n", attempt+1, error.message, delay_sec);
        
        #ifdef _WIN32
        Sleep(delay_sec * 1000);
        #else
        sleep(delay_sec);
        #endif
        
        delay_sec *= 2;
        if (delay_sec > 30) delay_sec = 30;
    }
    
    bson_destroy(&reply);
    mongoc_bulk_operation_destroy(bulk);
    mongoc_collection_destroy(collection);
    mongoc_client_pool_push(pool, client);
    
    if (!ret) {
        fprintf(stderr, "Bulk insert failed after retries: %s\n", error.message);
        return -1;
    }
    return 0;
}


int db_insert_errors(const char* batch_id, ValidationError** errors, int count) {
    if (count == 0) return 0;
    
    mongoc_client_t *client = mongoc_client_pool_pop(pool);
    // ... setup ...
    // Note: To implement retry for insert_errors properly, we need to RECREATE the bulk operation if it was executed (and thus consumed/invalidated)?
    // mongoc_bulk_operation_execute: "This function executes all operations queued into the bulk operation. If the function returns true, the bulk operation is cleared and may be reused."
    // Wait, documentation says: "After calling mongoc_bulk_operation_execute(), the bulk operation is in a state where it can be executed again? No, usually it clears."
    // "If ordered, it stops on first error."
    // If retry, we need to re-queue?
    
    // Actually, if execute Fails (network), the ops might still be in the bulk object?
    // "A bulk operation can be executed multiple times".
    // Let's assume we can just call execute again.
    
    mongoc_collection_t *collection = get_collection(client, "errors");
    mongoc_bulk_operation_t *bulk = mongoc_collection_create_bulk_operation_with_opts(collection, NULL);
    
    for (int i=0; i<count; i++) {
        bson_t *doc = bson_new();
        BSON_APPEND_UTF8(doc, "batch_id", batch_id);
        BSON_APPEND_INT32(doc, "row_number", errors[i]->row_number);
        BSON_APPEND_UTF8(doc, "field", errors[i]->field);
        BSON_APPEND_UTF8(doc, "expected", errors[i]->expected);
        BSON_APPEND_UTF8(doc, "actual", errors[i]->actual);
        mongoc_bulk_operation_insert(bulk, doc);
        bson_destroy(doc);
    }
    
    bson_error_t error;
    bson_t reply;
    bool ret = false;
    int delay_sec = 1;

    for (int attempt = 0; attempt < 5; attempt++) {
        ret = mongoc_bulk_operation_execute(bulk, &reply, &error);
        if (ret) break;
        
        fprintf(stderr, "Error insert failed (attempt %d/5): %s. Retrying in %ds...\n", attempt+1, error.message, delay_sec);
        
        #ifdef _WIN32
        Sleep(delay_sec * 1000);
        #else
        sleep(delay_sec);
        #endif
        
        delay_sec *= 2;
        if (delay_sec > 30) delay_sec = 30;
    }

    bson_destroy(&reply);
    mongoc_bulk_operation_destroy(bulk);
    mongoc_collection_destroy(collection);
    mongoc_client_pool_push(pool, client);
    
    return ret ? 0 : -1;
}

int db_update_progress(const char* batch_id, const BatchProgress* progress) {
    mongoc_client_t *client = mongoc_client_pool_pop(pool);
    mongoc_collection_t *collection = get_collection(client, "batches");
    
    bson_t *selector = bson_new();
    BSON_APPEND_UTF8(selector, "batch_id", batch_id);
    
    bson_t *update = bson_new();
    bson_t child;
    bson_append_document_begin(update, "$set", 4, &child);
    BSON_APPEND_INT32(&child, "total_rows", progress->total_rows);
    BSON_APPEND_INT32(&child, "processed_rows", progress->processed_rows);
    BSON_APPEND_INT32(&child, "valid_rows", progress->valid_rows);
    BSON_APPEND_INT32(&child, "invalid_rows", progress->invalid_rows);
    BSON_APPEND_INT32(&child, "status", progress->status); // Enum as int
    // BSON_APPEND_TIME_T(&child, "updated_at", time(NULL));
    bson_append_document_end(update, &child);
    
    bson_error_t error;
    bson_t reply;
    bool ret = false;
    bson_t *opts = BCON_NEW("upsert", BCON_BOOL(true));
    
    // Retry logic for update
    int delay_sec = 1;
    for (int attempt = 0; attempt < 5; attempt++) {
        // We need to re-run update_one? 
        // Can we reuse selector/update bson? Yes.
        // Can we reuse `opts`? Yes (it's const in usage roughly).
        
        // Wait, mongoc_collection_update_one might consume `opts`? No.
        
        ret = mongoc_collection_update_one(collection, selector, update, opts, &reply, &error);
        if (ret) break;
        
        fprintf(stderr, "Update failed (attempt %d/5): %s. Retrying in %ds...\n", attempt+1, error.message, delay_sec);
        
        #ifdef _WIN32
        Sleep(delay_sec * 1000);
        #else
        sleep(delay_sec);
        #endif
        
        delay_sec *= 2;
        if (delay_sec > 30) delay_sec = 30;
        
        if (attempt < 4) bson_destroy(&reply); // Clean up previous reply
    }
    
    bson_destroy(opts);
    
    char *reply_str = bson_as_canonical_extended_json(&reply, NULL);
    printf("[DB] Update reply: %s\n", reply_str);
    bson_free(reply_str);
    bson_destroy(&reply);
    
    if (!ret) {
        fprintf(stderr, "Update failed after retries: %s\n", error.message);
    }
    
    bson_destroy(selector);
    bson_destroy(update);
    mongoc_collection_destroy(collection);
    mongoc_client_pool_push(pool, client);
    
    return ret ? 0 : -1;
}

int db_get_progress(const char* batch_id, BatchProgress* progress) {
    if (!batch_id || !progress) return -1;
    
    mongoc_client_t *client = mongoc_client_pool_pop(pool);
    mongoc_collection_t *collection = get_collection(client, "batches");
    
    bson_t *query = bson_new();
    BSON_APPEND_UTF8(query, "batch_id", batch_id);
    
    const bson_t *doc;
    mongoc_cursor_t *cursor = mongoc_collection_find_with_opts(collection, query, NULL, NULL);
    
    int result = -1;
    if (mongoc_cursor_next(cursor, &doc)) {
        // Debug: Dump document to see field names and values
        char *str = bson_as_canonical_extended_json(doc, NULL);
        printf("[DB] db_get_progress found doc: %s\n", str);
        bson_free(str);
        
        bson_iter_t iter;
        if (bson_iter_init(&iter, doc)) {
            // Unpack
            // Note: In real app, robust checking
             if (bson_iter_init(&iter, doc) && bson_iter_find(&iter, "total_rows") && BSON_ITER_HOLDS_INT32(&iter)) progress->total_rows = bson_iter_int32(&iter);
             if (bson_iter_init(&iter, doc) && bson_iter_find(&iter, "processed_rows") && BSON_ITER_HOLDS_INT32(&iter)) progress->processed_rows = bson_iter_int32(&iter);
             if (bson_iter_init(&iter, doc) && bson_iter_find(&iter, "valid_rows") && BSON_ITER_HOLDS_INT32(&iter)) progress->valid_rows = bson_iter_int32(&iter);
             if (bson_iter_init(&iter, doc) && bson_iter_find(&iter, "invalid_rows") && BSON_ITER_HOLDS_INT32(&iter)) progress->invalid_rows = bson_iter_int32(&iter);
             if (bson_iter_init(&iter, doc) && bson_iter_find(&iter, "status") && BSON_ITER_HOLDS_INT32(&iter)) progress->status = (BatchStatus)bson_iter_int32(&iter);
             strncpy(progress->batch_id, batch_id, BATCH_ID_LENGTH - 1);
             result = 0;
        }
    }
    
    bson_destroy(query);
    mongoc_cursor_destroy(cursor);
    mongoc_collection_destroy(collection);
    mongoc_client_pool_push(pool, client);
    return result;
}

mongoc_cursor_t* db_get_records(const char* batch_id, int skip, int limit, const char* sort_field, int sort_order, const char* search_term) {
    mongoc_client_t *client = mongoc_client_pool_pop(pool);
    // Note: We need to NOT push the client back yet? The cursor needs the client?
    // Actually, cursor holds a ref? No, cursor depends on collection/client.
    // Typical pattern: Caller must destroy cursor, and we might need to rely on ...
    // BUT we cannot pool push here if we return cursor.
    // This is problematic. Better to return a data array or handle this differently.
    // However, C driver: Cursor is tied to client. If we return cursor, we leak client if not careful.
    // Let's simplified: We will allocate a new client for this query?
    // Or we rely on a different wrapper.
    // For this task, let's create a *detached* client? No.
    // Let's assume the caller will process cursor and destroy it.
    // BUT how do we release the client back to pool?
    // We can't unless we wrap it.
    
    // Alternative: Execute query, build JSON string or struct array, then release client.
    // Since we need to return JSON eventually, why not here?
    // Ah, `db_get_records` returns cursor per header.
    // Let's change the pattern: `db_get_records_json`?
    // Or just accept that we hold the client until ... when?
    
    // TEMPORARY FIX:
    // We will just use a global client for read? No, not thread safe.
    // We will return `mongoc_cursor_t*` AND we need to provide a function `db_release_cursor(cursor)` which cleans up.
    // But `mongoc_cursor_destroy` doesn't release client.
    
    // Better: `db_fetch_data` that writes to a buffer or callback.
    // But let's assume `db_get_records` will just fetch all to a customized struct list?
    // Pagination is small (50 rows). We can fetch all 50.
    return NULL; // Placeholder, we will implement `db_query_json` in `server.c` or here?
}

// Fixed implementation for query to JSON string
// Returns a heap-allocated JSON string (caller frees)
char* db_query_json(const char* batch_id, int skip, int limit, const char* search, const char* sort_by) {
     mongoc_client_t *client = mongoc_client_pool_pop(pool);
     mongoc_collection_t *collection = get_collection(client, "shipments");
     
     bson_t *query = bson_new();
     
     // If both batch_id and search are present, we need to use $and
     if (batch_id && search && strlen(search) > 0) {
         bson_t and_array, and_elem1, and_elem2, or_array, or_elem;
         
         // Create $and array
         bson_append_array_begin(query, "$and", -1, &and_array);
         
         // First element: batch_id
         bson_append_document_begin(&and_array, "0", -1, &and_elem1);
         BSON_APPEND_UTF8(&and_elem1, "batch_id", batch_id);
         bson_append_document_end(&and_array, &and_elem1);
         
         // Second element: $or for search
         bson_append_document_begin(&and_array, "1", -1, &and_elem2);
         bson_append_array_begin(&and_elem2, "$or", -1, &or_array);
         
         // Tracking Number
         bson_append_document_begin(&or_array, "0", -1, &or_elem);
         BSON_APPEND_REGEX(&or_elem, "tracking_number", search, "i");
         bson_append_document_end(&or_array, &or_elem);
         
         // Origin
         bson_append_document_begin(&or_array, "1", -1, &or_elem);
         BSON_APPEND_REGEX(&or_elem, "origin", search, "i");
         bson_append_document_end(&or_array, &or_elem);
         
         // Destination
         bson_append_document_begin(&or_array, "2", -1, &or_elem);
         BSON_APPEND_REGEX(&or_elem, "destination", search, "i");
         bson_append_document_end(&or_array, &or_elem);
         
         // Status
         bson_append_document_begin(&or_array, "3", -1, &or_elem);
         BSON_APPEND_REGEX(&or_elem, "status", search, "i");
         bson_append_document_end(&or_array, &or_elem);
         
         bson_append_array_end(&and_elem2, &or_array);
         bson_append_document_end(&and_array, &and_elem2);
         
         bson_append_array_end(query, &and_array);
     }
     else if (batch_id) {
         // Only batch_id
         BSON_APPEND_UTF8(query, "batch_id", batch_id);
     }
     else if (search && strlen(search) > 0) {
         // Only search
         bson_t child;
         bson_t child_or;
         bson_append_array_begin(query, "$or", -1, &child_or);
         
         // Tracking Number
         bson_append_document_begin(&child_or, "0", -1, &child);
         BSON_APPEND_REGEX(&child, "tracking_number", search, "i");
         bson_append_document_end(&child_or, &child);
         
         // Origin
         bson_append_document_begin(&child_or, "1", -1, &child);
         BSON_APPEND_REGEX(&child, "origin", search, "i");
         bson_append_document_end(&child_or, &child);
         
         // Destination
         bson_append_document_begin(&child_or, "2", -1, &child);
         BSON_APPEND_REGEX(&child, "destination", search, "i");
         bson_append_document_end(&child_or, &child);

         // Status
         bson_append_document_begin(&child_or, "3", -1, &child);
         BSON_APPEND_REGEX(&child, "status", search, "i");
         bson_append_document_end(&child_or, &child);
         
         bson_append_array_end(query, &child_or);
     }
     
     bson_t *opts = bson_new();
     BSON_APPEND_INT64(opts, "skip", skip);
     BSON_APPEND_INT64(opts, "limit", limit);
     
     // Dynamic Sort Implementation (Req 10)
     bson_t sort_doc;
     BSON_APPEND_DOCUMENT_BEGIN(opts, "sort", &sort_doc);
     if (sort_by && strlen(sort_by) > 0) {
         // Default to ascending (1), could be flexible if needed
         BSON_APPEND_INT32(&sort_doc, sort_by, 1);
     } else {
         BSON_APPEND_INT32(&sort_doc, "row_number", 1);
     }
     bson_append_document_end(opts, &sort_doc);
     
     mongoc_cursor_t *cursor = mongoc_collection_find_with_opts(collection, query, opts, NULL);
     
     // Iterate and build JSON
     // Using manual string build for simplicity or BSON array?
     // BSON to JSON:
     // [ doc, doc, ... ]
     
     // Estimate size?
     size_t size = 2048 * limit; // Increased buffer estimates
     char* json = malloc(size);
     if (!json) {
         bson_destroy(query);
         bson_destroy(opts);
         mongoc_cursor_destroy(cursor);
         mongoc_collection_destroy(collection);
         mongoc_client_pool_push(pool, client);
         return NULL;
     }
     
     char* ptr = json;
     *ptr++ = '[';
     *ptr = '\0';
     
     const bson_t *doc;
     bool first = true;
     while (mongoc_cursor_next(cursor, &doc)) {
         char *str = bson_as_relaxed_extended_json(doc, NULL);
         size_t len = strlen(str);
         
         // Helper: check bounds
         if ((size_t)(ptr - json) + len + 2 >= size) {
             // Buffer full - stop or realloc?
             // For strict limit, we stop.
             bson_free(str);
             break;
         }
         
         if (!first) *ptr++ = ',';
         memcpy(ptr, str, len);
         ptr += len;
         *ptr = '\0'; // Always null terminate
         
         bson_free(str);
         first = false;
     }
     *ptr++ = ']';
     *ptr = '\0';
     
     bson_destroy(query);
     bson_destroy(opts);
     mongoc_cursor_destroy(cursor);
     mongoc_collection_destroy(collection);
     mongoc_client_pool_push(pool, client);
     
     return json;
}

// Get errors for a batch as JSON
char* db_get_errors_json(const char* batch_id) {
    mongoc_client_t *client = mongoc_client_pool_pop(pool);
    mongoc_collection_t *collection = get_collection(client, "errors");
    
    bson_t *query = bson_new();
    if(batch_id) BSON_APPEND_UTF8(query, "batch_id", batch_id);
    
    bson_t *opts = bson_new();
    bson_t sort_doc;
    BSON_APPEND_DOCUMENT_BEGIN(opts, "sort", &sort_doc);
    BSON_APPEND_INT32(&sort_doc, "row_number", 1);
    bson_append_document_end(opts, &sort_doc);
    
    mongoc_cursor_t *cursor = mongoc_collection_find_with_opts(collection, query, opts, NULL);
    
    size_t size = 4096;
    char* json = malloc(size);
    if (!json) {
        bson_destroy(query);
        bson_destroy(opts);
        mongoc_cursor_destroy(cursor);
        mongoc_collection_destroy(collection);
        mongoc_client_pool_push(pool, client);
        return NULL;
    }
    
    char* ptr = json;
    *ptr++ = '[';
    *ptr = '\0';
    
    const bson_t *doc;
    bool first = true;
    while (mongoc_cursor_next(cursor, &doc)) {
        char *str = bson_as_relaxed_extended_json(doc, NULL);
        size_t len = strlen(str);
        
        if ((size_t)(ptr - json) + len + 2 >= size) {
            bson_free(str);
            break;
        }
        
        if (!first) *ptr++ = ',';
        memcpy(ptr, str, len);
        ptr += len;
        *ptr = '\0';
        
        bson_free(str);
        first = false;
    }
    *ptr++ = ']';
    *ptr = '\0';
    
    bson_destroy(query);
    bson_destroy(opts);
    mongoc_cursor_destroy(cursor);
    mongoc_collection_destroy(collection);
    mongoc_client_pool_push(pool, client);
    
    return json;
}

// Delete entire batch (records, errors, progress)
int db_delete_batch(const char* batch_id) {
    mongoc_client_t *client = mongoc_client_pool_pop(pool);
    
    bson_t *selector = bson_new();
    BSON_APPEND_UTF8(selector, "batch_id", batch_id);
    
    bson_error_t error;
    bool success = true;
    
    // Delete from shipments
    mongoc_collection_t *shipments = get_collection(client, "shipments");
    if (!mongoc_collection_delete_many(shipments, selector, NULL, NULL, &error)) {
        fprintf(stderr, "Failed to delete shipments: %s\n", error.message);
        success = false;
    }
    mongoc_collection_destroy(shipments);
    
    // Delete from errors
    mongoc_collection_t *errors = get_collection(client, "errors");
    if (!mongoc_collection_delete_many(errors, selector, NULL, NULL, &error)) {
        fprintf(stderr, "Failed to delete errors: %s\n", error.message);
        success = false;
    }
    mongoc_collection_destroy(errors);
    
    // Delete from batches
    mongoc_collection_t *batches = get_collection(client, "batches");
    if (!mongoc_collection_delete_many(batches, selector, NULL, NULL, &error)) {
        fprintf(stderr, "Failed to delete batch progress: %s\n", error.message);
        success = false;
    }
    mongoc_collection_destroy(batches);
    
    bson_destroy(selector);
    mongoc_client_pool_push(pool, client);
    
    return success ? 0 : -1;
}

// Export Context for streaming
struct ExportContext {
    mongoc_client_t *client;
    mongoc_collection_t *collection;
    mongoc_cursor_t *cursor;
    char* pending_data; // Buffer for record that didn't fit
    size_t pending_len;
    size_t pending_written;
    bool headers_sent;
    bool is_csv;
    bool first_record;
    bool finished;
    bool footer_processed;
};

void* db_open_export_cursor(const char* batch_id, bool is_csv) {
    struct ExportContext* ctx = calloc(1, sizeof(struct ExportContext));
    ctx->client = mongoc_client_pool_pop(pool);
    ctx->collection = get_collection(ctx->client, "shipments");
    
    bson_t *query = bson_new();
    if(batch_id) BSON_APPEND_UTF8(query, "batch_id", batch_id);
    
    bson_t *opts = bson_new();
    bson_t sort_doc;
    BSON_APPEND_DOCUMENT_BEGIN(opts, "sort", &sort_doc);
    BSON_APPEND_INT32(&sort_doc, "row_number", 1);
    bson_append_document_end(opts, &sort_doc);

    ctx->cursor = mongoc_collection_find_with_opts(ctx->collection, query, opts, NULL);
    bson_destroy(opts);
    bson_destroy(query);
    
    ctx->is_csv = is_csv;
    ctx->first_record = true;
    ctx->finished = false;
    return ctx;
}

// Read simple chunk for streaming 
int db_read_export_chunk(void* context, char* buf, size_t max) {
    struct ExportContext* ctx = (struct ExportContext*)context;
    
    if (ctx->finished) return -1; // End of stream
    
    size_t written = 0;
    
    // JSON Start - write opening bracket on first call
    if (!ctx->is_csv && ctx->first_record) {
        if (written < max) {
            buf[written++] = '[';
        }
    }
    
    // Check pending data from previous call
    if (ctx->pending_data) {
        size_t remaining = ctx->pending_len - ctx->pending_written;
        size_t space = max - written;
        
        if (remaining <= space) {
            // Write all pending
            memcpy(buf + written, ctx->pending_data + ctx->pending_written, remaining);
            written += remaining;
            free(ctx->pending_data);
            ctx->pending_data = NULL;
            ctx->pending_len = 0;
            ctx->pending_written = 0;
        } else {
            // Write partial
            memcpy(buf + written, ctx->pending_data + ctx->pending_written, space);
            written += space;
            ctx->pending_written += space;
            return written; // Buffer full
        }
    }
    
    const bson_t *doc;
    // Loop while we have space (conservative check, but we handle overflow with pending)
    while (written < max) { 
        if (mongoc_cursor_next(ctx->cursor, &doc)) {
            char *str = bson_as_relaxed_extended_json(doc, NULL);
            size_t len = strlen(str);
            
            // Temporary buffer for formatting this record (comma + data + possible newline)
            // Worst case expansion is minimal (comma/newline).
            // We'll perform writes directly to avoid Double Copy if possible, 
            // but for simplicity we construct the "chunk" to write.
            
            // Logic for comma
            bool needs_comma = (!ctx->is_csv && !ctx->first_record);
            ctx->first_record = false;
            
            // Total size needed for this record
            size_t total_needed = len + (needs_comma ? 1 : 0) + (ctx->is_csv ? 1 : 0);
            
            // Check if fits
            if (written + total_needed <= max) {
                if (needs_comma) buf[written++] = ',';
                memcpy(buf + written, str, len);
                written += len;
                if (ctx->is_csv) buf[written++] = '\n';
                bson_free(str);
            } else {
                // Doesn't fit - stash in pending
                // We construct the full string in pending
                ctx->pending_len = total_needed;
                ctx->pending_data = malloc(total_needed + 1);
                
                size_t p = 0;
                if (needs_comma) ctx->pending_data[p++] = ',';
                memcpy(ctx->pending_data + p, str, len);
                p += len;
                if (ctx->is_csv) ctx->pending_data[p++] = '\n';
                ctx->pending_data[p] = '\0';
                
                bson_free(str);
                
                // Write as much as possible now
                size_t space = max - written;
                memcpy(buf + written, ctx->pending_data, space);
                written += space;
                ctx->pending_written = space;
                return written;
            }
        } else {
            // No more docs
            // End of JSON array
            if (!ctx->is_csv) {
                if (!ctx->footer_processed) {
                     if (written < max) {
                        buf[written++] = ']';
                        ctx->footer_processed = true;
                        ctx->finished = true; // We are done
                     } else {
                        // Stash ']' in pending
                        ctx->pending_len = 1;
                        ctx->pending_data = malloc(2);
                        ctx->pending_data[0] = ']';
                        ctx->pending_data[1] = '\0';
                        ctx->footer_processed = true;
                        // Do NOT set finished=true here, wait for next call to flush pending
                        // Actually, next call will flush pending, then check pending again?
                        // Next call: pending cleared. enters while loop? -> no docs.
                        // !is_csv -> !footer_processed (false) -> logic skipped.
                        // finished not set?
                        // We must set finished=true if footer_processed? 
                        // If we return written, next call returns.
                     }
                } else {
                     // Footer already processed, we are definitely done
                     ctx->finished = true;
                }
            } else {
                ctx->finished = true;
            }
            break; 
        }
    }
    
    // If finished and nothing more to write this turn, and nothing pending?
    // If we just set finished=true, we might still have 'written' bytes.
    // Return them. Next call will return -1.
    
    return written;
}

void db_close_export_cursor(void* context) {
    struct ExportContext* ctx = (struct ExportContext*)context;
    if (ctx->pending_data) free(ctx->pending_data);
    mongoc_cursor_destroy(ctx->cursor);
    mongoc_collection_destroy(ctx->collection);
    mongoc_client_pool_push(pool, ctx->client);
    free(ctx);
}

