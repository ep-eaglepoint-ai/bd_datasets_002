import { AuthorizationError } from './types.js';

// Simple structured logger implementation
const logger = {
    info: (msg, data) => console.log(JSON.stringify({ level: 'INFO', msg, ...data })),
    error: (msg, data) => console.error(JSON.stringify({ level: 'ERROR', msg, ...data }))
};

export class EvaluationEngine {
    constructor(rules, dataProvider, hierarchy) {
        this.rules = rules;
        this.dataProvider = dataProvider;
        this.hierarchy = hierarchy;
    }

    async evaluate(context) {
        const startTime = Date.now();
        logger.info('Authorization evaluation started', {
            subjectId: context.subject,
            permission: context.permission,
            resourceId: context.resource
        });

        const trace = [];

        for (const rule of this.rules) {
            try {
                const result = await rule.evaluate(context, this.dataProvider);

                trace.push({
                    rule: rule.name,
                    evaluated: true,
                    matched: result.matched,
                    reason: result.reason
                });

                if (result.matched) {
                    const finalResult = {
                        allowed: true,
                        reason: result.reason,
                        trace
                    };

                    logger.info('Authorization evaluation completed', {
                        allowed: true,
                        reason: finalResult.reason,
                        duration: Date.now() - startTime
                    });

                    return finalResult;
                }
            } catch (err) {
                // FAIL-CLOSED: Propagate errors
                logger.error('Authorization evaluation failed', {
                    error: err.message,
                    rule: rule.name,
                    context
                });

                throw new AuthorizationError(
                    `Rule ${rule.name} failed: ${err.message}`,
                    { context, trace, originalError: err }
                );
            }
        }

        const finalResult = {
            allowed: false,
            reason: 'NO_MATCHING_RULE',
            trace
        };

        logger.info('Authorization evaluation completed', {
            allowed: false,
            reason: finalResult.reason,
            duration: Date.now() - startTime
        });

        return finalResult;
    }
}
