/**
 * @typedef {Object} AuthorizationContext
 * @property {string} subject - Subject ID (user or service)
 * @property {string} permission - Requested permission
 * @property {string} resource - Resource ID
 * @property {number} timestamp - Evaluation timestamp
 */

/**
 * @typedef {Object} TraceEntry
 * @property {string} rule - Rule name
 * @property {boolean} evaluated - Whether rule was evaluated
 * @property {boolean} matched - Whether rule matched
 * @property {string} [reason] - Reason code if matched
 */

/**
 * @typedef {Object} AuthorizationResult
 * @property {boolean} allowed - Decision
 * @property {string} reason - Final reason code
 * @property {TraceEntry[]} trace - Evaluation audit trail
 */

export class AuthorizationError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = 'AuthorizationError';
        this.context = context;
        this.timestamp = new Date();
    }
}
