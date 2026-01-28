package com.eaglepoint.parallel;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Exception thrown when parallel processing fails.
 * Collects all exceptions that occurred during execution.
 */
public class ParallelProcessingException extends RuntimeException {
    private final List<Throwable> suppressedExceptions = new ArrayList<>();
    private final int failedCount;

    public ParallelProcessingException(String message, int failedCount, List<Throwable> exceptions) {
        super(message);
        this.failedCount = failedCount;
        if (exceptions != null) {
            this.suppressedExceptions.addAll(exceptions);
            exceptions.forEach(this::addSuppressed);
        }
    }

    public List<Throwable> getSuppressedExceptions() {
        return Collections.unmodifiableList(suppressedExceptions);
    }

    public int getFailedCount() {
        return failedCount;
    }
}
