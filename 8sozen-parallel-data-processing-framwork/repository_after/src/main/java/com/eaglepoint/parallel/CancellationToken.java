package com.eaglepoint.parallel;

import java.util.concurrent.CancellationException;

/**
 * Token for managing cancellation of parallel tasks.
 */
public class CancellationToken {
    private volatile boolean cancelled = false;

    /**
     * Requests cancellation.
     */
    public void cancel() {
        this.cancelled = true;
    }

    /**
     * Checks if cancellation has been requested.
     *
     * @return true if cancelled
     */
    public boolean isCancelled() {
        return cancelled;
    }

    /**
     * Throws CancellationException if cancelled.
     *
     * @throws CancellationException if cancelled
     */
    public void throwIfCancelled() {
        if (cancelled) {
            throw new CancellationException("Operation cancelled");
        }
    }
}
