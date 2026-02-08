#ifndef COMMON_H
#define COMMON_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <time.h>

#define MAX_LINE_LENGTH 4096
#define MAX_FIELD_LENGTH 1024
#define BATCH_ID_LENGTH 37 // UUID + null terminator

// Shipment Record Structure
typedef struct {
    char tracking_number[64];
    char origin[128];
    char destination[128];
    double weight_kg;
    double length_cm;
    double width_cm;
    double height_cm;
    char ship_date[32]; // ISO 8601
    char status[32];
    int row_number;
    char batch_id[BATCH_ID_LENGTH];
} ShipmentRecord;

// Validation Error Structure
typedef struct {
    int row_number;
    char field[32];
    char expected[64];
    char actual[MAX_FIELD_LENGTH];
    char batch_id[BATCH_ID_LENGTH];
} ValidationError;

// Global/Shared State (mostly for progress tracking)
// In a real app, this should be a thread-safe map/dictionary
typedef enum {
    STATUS_UPLOADING,
    STATUS_PARSING,
    STATUS_VALIDATING,
    STATUS_INSERTING,
    STATUS_COMPLETE,
    STATUS_FAILED
} BatchStatus;

typedef struct {
    char batch_id[BATCH_ID_LENGTH];
    int total_rows;
    int processed_rows;
    int valid_rows;
    int invalid_rows;
    BatchStatus status;
    time_t start_time;
    // Mutex would go here for thread safety
} BatchProgress;

#endif
