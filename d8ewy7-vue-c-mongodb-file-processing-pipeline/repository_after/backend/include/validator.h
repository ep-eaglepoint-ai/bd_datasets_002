#ifndef VALIDATOR_H
#define VALIDATOR_H

#include "common.h"

// Returns true if valid, false otherwise.
// Populates error struct if invalid.
bool validate_record(const ShipmentRecord* record, ValidationError* error);

#endif
