function validateGenerateInput(text) {
    if (text === undefined || text === null) {
        return { error: 'Input is required', code: 'MISSING_INPUT' };
    }
    if (typeof text !== 'string') {
        return { error: 'Input must be a string', code: 'INVALID_TYPE' };
    }
    if (text.trim() === '') {
        return { error: 'Input cannot be empty', code: 'EMPTY_INPUT' };
    }
    if (text.length > 500) {
        return { error: 'Input exceeds 500 characters', code: 'LENGTH_EXCEEDED' };
    }
    return null;
}

module.exports = { validateGenerateInput };
