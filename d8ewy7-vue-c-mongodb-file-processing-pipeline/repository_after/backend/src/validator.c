#include "validator.h"
#include <string.h>
#include <ctype.h>
#include <stdlib.h>

bool is_alphanumeric(const char* str) {
    while(*str) {
        if (!isalnum(*str)) return false;
        str++;
    }
    return true;
}

bool validate_record(const ShipmentRecord* record, ValidationError* error) {
    memset(error, 0, sizeof(ValidationError));
    error->row_number = record->row_number;
    strncpy(error->batch_id, record->batch_id, BATCH_ID_LENGTH - 1);

    // 1. Tracking Number
    int tn_len = strlen(record->tracking_number);
    if (tn_len < 10 || tn_len > 30) {
        strcpy(error->field, "tracking_number");
        strcpy(error->expected, "Alphanumeric 10-30 chars");
        strncpy(error->actual, record->tracking_number, MAX_FIELD_LENGTH-1);
        return false;
    }
    if (!is_alphanumeric(record->tracking_number)) {
        strcpy(error->field, "tracking_number");
        strcpy(error->expected, "Alphanumeric only");
        strncpy(error->actual, record->tracking_number, MAX_FIELD_LENGTH-1);
        return false;
    }

    // 2. Origin & Destination
    if (strlen(record->origin) == 0) {
        strcpy(error->field, "origin");
        strcpy(error->expected, "Non-empty string");
        strcpy(error->actual, "Empty");
        return false;
    }
    if (strlen(record->destination) == 0) {
        strcpy(error->field, "destination");
        strcpy(error->expected, "Non-empty string");
        strcpy(error->actual, "Empty");
        return false;
    }

    // 3. Weight
    if (record->weight_kg <= 0) {
        strcpy(error->field, "weight_kg");
        strcpy(error->expected, "Positive number");
        sprintf(error->actual, "%f", record->weight_kg);
        return false;
    }

    // 4. Status
    const char* valid_statuses[] = {"pending", "in_transit", "delivered", "returned", "lost"};
    bool status_valid = false;
    for (int i=0; i<5; i++) {
        if (strcmp(record->status, valid_statuses[i]) == 0) {
            status_valid = true;
            break;
        }
    }
    if (!status_valid) {
        strcpy(error->field, "status");
        strcpy(error->expected, "pending|in_transit|delivered...");
        strncpy(error->actual, record->status, MAX_FIELD_LENGTH-1);
        return false;
    }

    return true;
}
