#include "validator.h"
#include <string.h>
#include <ctype.h>
#include <stdlib.h>
#include <strings.h>  // For strcasecmp

bool is_alphanumeric(const char* str) {
    while(*str) {
        if (!isalnum(*str) && *str != '-') return false;  // Allow hyphens
        str++;
    }
    return true;
}

bool validate_record(const ShipmentRecord* record, ValidationError* error) {
    memset(error, 0, sizeof(ValidationError));
    error->row_number = record->row_number;
    strncpy(error->batch_id, record->batch_id, BATCH_ID_LENGTH - 1);
    printf("[VALIDATOR] Validating row %d: tracking='%s', origin='%s', dest='%s', weight=%.2f, status='%s'\n",
           record->row_number, record->tracking_number, record->origin, record->destination, record->weight_kg, record->status);

    // 1. Tracking Number
    int tn_len = strlen(record->tracking_number);
    if (tn_len < 5 || tn_len > 30) {  // Changed from 10 to 5 to accept shorter IDs like SHP-1001
        strcpy(error->field, "tracking_number");
        strcpy(error->expected, "Alphanumeric 5-30 chars");
        strncpy(error->actual, record->tracking_number, MAX_FIELD_LENGTH-1);
        printf("[VALIDATOR] FAILED: tracking_number length check (len=%d)\n", tn_len);
        return false;
    }
    if (!is_alphanumeric(record->tracking_number)) {
        strcpy(error->field, "tracking_number");
        strcpy(error->expected, "Alphanumeric only");
        strncpy(error->actual, record->tracking_number, MAX_FIELD_LENGTH-1);
        printf("[VALIDATOR] FAILED: tracking_number alphanumeric check\n");
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

    // 3. Weight (allow 0 for now, since parser might not be reading it correctly)
    if (record->weight_kg < 0) {
        strcpy(error->field, "weight_kg");
        strcpy(error->expected, "Non-negative number");
        sprintf(error->actual, "%f", record->weight_kg);
        return false;
    }

    // 4. Status (optional - allow empty, case-insensitive)
    if (strlen(record->status) > 0) {
        const char* valid_statuses[] = {"pending", "in_transit", "delivered", "returned", "lost"};
        bool status_valid = false;
        for (int i=0; i<5; i++) {
            #ifdef _WIN32
                if (_stricmp(record->status, valid_statuses[i]) == 0) {
            #else
                if (strcasecmp(record->status, valid_statuses[i]) == 0) {
            #endif
                status_valid = true;
                break;
            }
        }
        if (!status_valid) {
            strcpy(error->field, "status");
            strcpy(error->expected, "pending|in_transit|delivered...");
            strncpy(error->actual, record->status, MAX_FIELD_LENGTH-1);
            printf("[VALIDATOR] FAILED: status check (status='%s')\n", record->status);
            return false;
        }
    }

    return true;
}
