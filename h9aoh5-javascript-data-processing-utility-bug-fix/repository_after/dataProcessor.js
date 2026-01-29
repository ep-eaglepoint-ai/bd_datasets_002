class DataProcessor {
    constructor(options = {}) {
        this.strictMode = options.strictMode ?? true;
        this.dateFormat = options.dateFormat || 'ISO';
    }

    // Deduplicates an array, optionally by a specific key field
    dedupe(arr, key = null) {
        if (!Array.isArray(arr)) {
            throw new TypeError('Input must be an array');
        }

        if (key) {
            return this._dedupeByKey(arr, key);
        }

        const result = [];
        for (const item of arr) {
            let exists = false;
            for (const existing of result) {
                if (Object.is(item, existing)) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                result.push(item);
            }
        }
        return result;
    }

    // Helper for deduplicating by a specific key field
    _dedupeByKey(arr, key) {
        const seen = new Map();
        const result = [];

        for (const item of arr) {
            const value = item[key];
            if (!seen.has(value)) {
                seen.set(value, true);
                result.push(this._deepClone(item));
            }
        }
        return result;
    }

    // Merges two datasets by a common key field
    merge(target, source, key) {
        if (!key) {
            throw new Error('Merge requires a key field');
        }

        const result = target.map(item => this._deepClone(item));
        const targetMap = new Map();

        for (let i = 0; i < result.length; i++) {
            targetMap.set(result[i][key], i);
        }

        for (const sourceItem of source) {
            const sourceKey = sourceItem[key];
            if (targetMap.has(sourceKey)) {
                const targetIndex = targetMap.get(sourceKey);
                result[targetIndex] = { ...result[targetIndex], ...this._deepClone(sourceItem) };
            } else {
                result.push(this._deepClone(sourceItem));
            }
        }

        return result;
    }

    // Filters array based on provided conditions
    filter(arr, conditions) {
        return arr.map(item => this._deepClone(item)).filter(item => {
            for (const [field, condition] of Object.entries(conditions)) {
                if (!this._matchesCondition(item[field], condition)) {
                    return false;
                }
            }
            return true;
        });
    }

    // Checks if a value matches a specific condition
    _matchesCondition(value, condition) {
        if (typeof condition !== 'object' || condition === null) {
            return value === condition;
        }

        if (condition.$eq !== undefined) return value === condition.$eq;
        if (condition.$ne !== undefined) return value !== condition.$ne;
        
        let targetValue = value;
        let compareValue = condition.$gt ?? condition.$gte ?? condition.$lt ?? condition.$lte ?? condition.$between;

        if (this._isDate(value) || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
            targetValue = new Date(value);
            if (condition.$between) {
                const [min, max] = condition.$between;
                return targetValue >= new Date(min) && targetValue <= new Date(max);
            }
            if (condition.$gt !== undefined) return targetValue > new Date(condition.$gt);
            if (condition.$gte !== undefined) return targetValue >= new Date(condition.$gte);
            if (condition.$lt !== undefined) return targetValue < new Date(condition.$lt);
            if (condition.$lte !== undefined) return targetValue <= new Date(condition.$lte);
        }

        if (condition.$gt !== undefined) return value > condition.$gt;
        if (condition.$gte !== undefined) return value >= condition.$gte;
        if (condition.$lt !== undefined) return value < condition.$lt;
        if (condition.$lte !== undefined) return value <= condition.$lte;
        if (condition.$in !== undefined) return condition.$in.includes(value);
        if (condition.$nin !== undefined) return !condition.$nin.includes(value);
        if (condition.$between !== undefined) {
            const [min, max] = condition.$between;
            return value >= min && value <= max;
        }

        return true;
    }

    // Transforms dataset based on field mappings
    transform(arr, transformations) {
        return arr.map(item => {
            const clonedItem = this._deepClone(item);
            const transformed = { ...clonedItem };

            for (const [field, transform] of Object.entries(transformations)) {
                if (typeof transform === 'function') {
                    transformed[field] = transform(clonedItem[field], clonedItem);
                } else if (typeof transform === 'object') {
                    if (transform.$rename) {
                        if (clonedItem.hasOwnProperty(field)) {
                            transformed[transform.$rename] = clonedItem[field];
                            delete transformed[field];
                        }
                    }
                    if (transform.$default !== undefined && clonedItem[field] === undefined) {
                        transformed[field] = transform.$default;
                    }
                    if (transform.$convert) {
                        transformed[field] = this._convertType(clonedItem[field], transform.$convert);
                    }
                }
            }

            return transformed;
        });
    }

    // Converts values between data types
    _convertType(value, type) {
        switch (type) {
            case 'number': return Number(value);
            case 'string': return String(value);
            case 'boolean': return Boolean(value);
            case 'date': return new Date(value);
            default: return value;
        }
    }

    // Aggregates data groups by specific operations
    aggregate(arr, groupBy, aggregations) {
        const groups = new Map();

        for (const item of arr) {
            const groupKey = item[groupBy];

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    _items: [],
                    [groupBy]: groupKey
                });
            }
            groups.get(groupKey)._items.push(this._deepClone(item));
        }

        const result = [];

        for (const group of groups.values()) {
            const aggregated = { [groupBy]: group[groupBy] };

            for (const [field, operation] of Object.entries(aggregations)) {
                aggregated[field] = this._calculateAggregation(
                    group._items,
                    field,
                    operation
                );
            }

            result.push(aggregated);
        }

        return result;
    }

    // Calculates individual aggregation metrics
    _calculateAggregation(items, field, operation) {
        const values = items.map(item => item[field]).filter(v => v !== undefined);
        if (values.length === 0 && ['sum', 'avg'].includes(operation)) return 0;

        switch (operation) {
            case 'sum':
                return values.reduce((acc, val) => acc + val, 0);
            case 'avg':
                return values.reduce((acc, val) => acc + val, 0) / values.length;
            case 'min':
                return values.length > 0 ? Math.min(...values) : null;
            case 'max':
                return values.length > 0 ? Math.max(...values) : null;
            case 'count':
                return values.length;
            case 'first':
                return values[0];
            case 'last':
                return values[values.length - 1];
            default:
                return null;
        }
    }

    // Sorts dataset by field and order
    sortBy(arr, field, order = 'asc') {
        const sorted = arr.map(item => this._deepClone(item));
        sorted.sort((a, b) => {
            let valA = a[field];
            let valB = b[field];

            if (valA < valB) return order === 'asc' ? -1 : 1;
            if (valA > valB) return order === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }

    // Groups dataset items by common field value
    groupBy(arr, field) {
        const groups = {};

        arr.forEach(item => {
            const key = item[field];
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(this._deepClone(item));
        });

        return groups;
    }

    // Extracts specific fields from dataset records
    pick(arr, fields) {
        return arr.map(item => {
            const picked = {};
            for (const field of fields) {
                if (item.hasOwnProperty(field)) {
                    picked[field] = typeof item[field] === 'object' ? this._deepClone(item[field]) : item[field];
                }
            }
            return picked;
        });
    }

    // Removes specific fields from dataset records
    omit(arr, fields) {
        return arr.map(item => {
            const result = this._deepClone(item);
            for (const field of fields) {
                delete result[field];
            }
            return result;
        });
    }

    // Utility for deep cloning objects
    _deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (Array.isArray(obj)) return obj.map(item => this._deepClone(item));
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this._deepClone(obj[key]);
            }
        }
        return cloned;
    }

    // Checks if a value is a Date object
    _isDate(val) {
        return val instanceof Date && !isNaN(val.getTime());
    }
}


class DataValidator {
    constructor(schema) {
        this.schema = schema;
    }

    // Validates multiple records against a schema
    validate(data) {
        const errors = [];

        for (let i = 0; i < data.length; i++) {
            const record = data[i];
            const recordErrors = this._validateRecord(record, i);
            errors.push(...recordErrors);
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Validates a single record against schema rules
    _validateRecord(record, index) {
        const errors = [];

        for (const [field, rules] of Object.entries(this.schema)) {
            const value = record[field];

            if (rules.required && (value === undefined || value === null || value === '' || (typeof value === 'number' && Number.isNaN(value)))) {
                errors.push({
                    index,
                    field,
                    message: `${field} is required`
                });
                continue;
            }

            if (value !== undefined && rules.type) {
                const actualType = typeof value;
                const isNan = actualType === 'number' && Number.isNaN(value);
                if (actualType !== rules.type || (rules.type === 'number' && isNan)) {
                    errors.push({
                        index,
                        field,
                        message: `${field} must be of type ${rules.type}, got ${isNan ? 'NaN' : actualType}`
                    });
                }
            }

            if (rules.min !== undefined && value < rules.min) {
                errors.push({
                    index,
                    field,
                    message: `${field} must be at least ${rules.min}`
                });
            }

            if (rules.max !== undefined && value > rules.max) {
                errors.push({
                    index,
                    field,
                    message: `${field} must be at most ${rules.max}`
                });
            }

            if (rules.pattern && typeof value === 'string') {
                const regex = new RegExp(rules.pattern);
                if (!regex.test(value)) {
                    errors.push({
                        index,
                        field,
                        message: `${field} does not match required pattern`
                    });
                }
            }
        }

        return errors;
    }
}


module.exports = { DataProcessor, DataValidator };
