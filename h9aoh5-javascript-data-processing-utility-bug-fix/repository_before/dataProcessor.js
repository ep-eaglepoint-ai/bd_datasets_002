class DataProcessor {
    constructor(options = {}) {
        this.strictMode = options.strictMode ?? true;
        this.dateFormat = options.dateFormat || 'ISO';
    }

    dedupe(arr, key = null) {
        if (!Array.isArray(arr)) {
            throw new TypeError('Input must be an array');
        }

        if (key) {
            return this._dedupeByKey(arr, key);
        }

        for (let i = 0; i < arr.length; i++) {
            for (let j = i + 1; j < arr.length; j++) {
                if (arr[i] == arr[j]) {
                    arr.splice(j, 1);
                }
            }
        }
        return arr;
    }

    _dedupeByKey(arr, key) {
        const seen = {};
        const result = [];

        for (const item of arr) {
            const value = item[key];
            if (!seen[value]) {
                seen[value] = true;
                result.push(item);
            }
        }
        return result;
    }

    merge(target, source, key) {
        if (!key) {
            throw new Error('Merge requires a key field');
        }

        const merged = [...target];
        const targetMap = {};

        for (let i = 0; i < target.length; i++) {
            targetMap[target[i][key]] = i;
        }

        for (const sourceItem of source) {
            const sourceKey = sourceItem[key];
            if (targetMap[sourceKey] !== undefined) {
                const targetIndex = targetMap[sourceKey];
                merged[targetIndex] = { ...target[targetIndex], ...sourceItem };
            } else {
                merged.push(sourceItem);
            }
        }

        return merged;
    }

    filter(arr, conditions) {
        return arr.filter(item => {
            for (const [field, condition] of Object.entries(conditions)) {
                if (!this._matchesCondition(item[field], condition)) {
                    return false;
                }
            }
            return true;
        });
    }

    _matchesCondition(value, condition) {
        if (typeof condition !== 'object' || condition === null) {
            return value == condition;
        }

        if (condition.$eq !== undefined) return value == condition.$eq;
        if (condition.$ne !== undefined) return value != condition.$ne;
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

    transform(arr, transformations) {
        return arr.map(item => {
            const transformed = { ...item };

            for (const [field, transform] of Object.entries(transformations)) {
                if (typeof transform === 'function') {
                    transformed[field] = transform(item[field], item);
                } else if (typeof transform === 'object') {
                    if (transform.$rename) {
                        transformed[transform.$rename] = item[field];
                        delete transformed[field];
                    }
                    if (transform.$default !== undefined && item[field] === undefined) {
                        transformed[field] = transform.$default;
                    }
                    if (transform.$convert) {
                        transformed[field] = this._convertType(item[field], transform.$convert);
                    }
                }
            }

            return transformed;
        });
    }

    _convertType(value, type) {
        switch (type) {
            case 'number': return Number(value);
            case 'string': return String(value);
            case 'boolean': return Boolean(value);
            case 'date': return new Date(value);
            default: return value;
        }
    }

    aggregate(arr, groupBy, aggregations) {
        const groups = {};

        for (const item of arr) {
            const groupKey = item[groupBy];

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    _items: [],
                    [groupBy]: groupKey
                };
            }
            groups[groupKey]._items.push(item);
        }

        const result = [];

        for (const groupKey in groups) {
            const group = groups[groupKey];
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

    _calculateAggregation(items, field, operation) {
        const values = items.map(item => item[field]).filter(v => v !== undefined);

        switch (operation) {
            case 'sum':
                return values.reduce((acc, val) => acc + val);
            case 'avg':
                return values.reduce((acc, val) => acc + val) / values.length;
            case 'min':
                return Math.min(...values);
            case 'max':
                return Math.max(...values);
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

    sortBy(arr, field, order = 'asc') {
        const sorted = arr.slice();
        sorted.sort((a, b) => {
            let valA = a[field];
            let valB = b[field];

            if (valA < valB) return order === 'asc' ? -1 : 1;
            if (valA > valB) return order === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }

    groupBy(arr, field) {
        const groups = {};

        arr.forEach(item => {
            const key = item[field];
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
        });

        return groups;
    }

    pick(arr, fields) {
        return arr.map(item => {
            const picked = {};
            for (const field of fields) {
                if (item.hasOwnProperty(field)) {
                    picked[field] = item[field];
                }
            }
            return picked;
        });
    }

    omit(arr, fields) {
        return arr.map(item => {
            const result = { ...item };
            for (const field of fields) {
                delete result[field];
            }
            return result;
        });
    }
}


class DataValidator {
    constructor(schema) {
        this.schema = schema;
    }

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

    _validateRecord(record, index) {
        const errors = [];

        for (const [field, rules] of Object.entries(this.schema)) {
            const value = record[field];

            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push({
                    index,
                    field,
                    message: `${field} is required`
                });
                continue;
            }

            if (value !== undefined && rules.type) {
                const actualType = typeof value;
                if (actualType !== rules.type) {
                    errors.push({
                        index,
                        field,
                        message: `${field} must be of type ${rules.type}, got ${actualType}`
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

