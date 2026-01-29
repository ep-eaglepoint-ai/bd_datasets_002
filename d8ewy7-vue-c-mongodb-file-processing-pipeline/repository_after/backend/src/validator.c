#include "validator.h"
#include <string.h>
#include <ctype.h>
#include <stdlib.h>
#include <strings.h>  // For strcasecmp

bool is_alphanumeric(const char* str) {
    while(*str) {
        if (!isalnum(*str)) return false;  // Strict alphanumeric (Requirements says "alphanumeric")
        str++;
    }
    return true;
}

// Validate ISO 8601 date format (basic YYYY-MM-DD)
bool is_valid_iso8601_date(const char* date) {
    if (strlen(date) != 10) return false;
    if (date[4] != '-' || date[7] != '-') return false;
    
    // Extract year, month, day
    int year = atoi(date);
    int month = atoi(date + 5);
    int day = atoi(date + 8);
    
    // Basic range checks
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    // Month-specific day validation
    if (month == 2) {
        bool is_leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
        if (day > (is_leap ? 29 : 28)) return false;
    } else if (month == 4 || month == 6 || month == 9 || month == 11) {
        if (day > 30) return false;
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
    if (tn_len < 10 || tn_len > 30) {  // Req 5: 10-30 chars
        strcpy(error->field, "tracking_number");
        strcpy(error->expected, "Alphanumeric 10-30 chars");
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

    // 3. Weight - must be positive (Req 5)
    if (record->weight_kg <= 0) {
        strcpy(error->field, "weight_kg");
        strcpy(error->expected, "Positive number");
        sprintf(error->actual, "%f", record->weight_kg);
        printf("[VALIDATOR] FAILED: weight_kg must be positive\n");
        return false;
    }

    // 4. Optional Dimensions - if present, must be positive (Req 5)
    if (record->length_cm < 0) {
        strcpy(error->field, "length_cm");
        strcpy(error->expected, "Non-negative number");
        sprintf(error->actual, "%f", record->length_cm);
        return false;
    }
    if (record->width_cm < 0) {
        strcpy(error->field, "width_cm");
        strcpy(error->expected, "Non-negative number");
        sprintf(error->actual, "%f", record->width_cm);
        return false;
    }
    if (record->height_cm < 0) {
        strcpy(error->field, "height_cm");
        strcpy(error->expected, "Non-negative number");
        sprintf(error->actual, "%f", record->height_cm);
        return false;
    }

    // 5. Ship Date - ISO 8601 format (Req 5)
    if (!is_valid_iso8601_date(record->ship_date)) {
        strcpy(error->field, "ship_date");
        strcpy(error->expected, "ISO 8601 (YYYY-MM-DD)");
        strncpy(error->actual, record->ship_date, MAX_FIELD_LENGTH-1);
        printf("[VALIDATOR] FAILED: ship_date format check\n");
        return false;
    }

    // 6. Status - required, must be valid enum (Req 5)
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
