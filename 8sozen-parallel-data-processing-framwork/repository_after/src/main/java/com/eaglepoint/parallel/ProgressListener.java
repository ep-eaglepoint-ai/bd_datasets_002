package com.eaglepoint.parallel;

import java.time.Duration;

/**
 * Interface for monitoring the progress of parallel tasks.
 */
public interface ProgressListener {
    /**
     * Called when progress is made.
     *
     * @param percentComplete percentage complete (0.0 to 100.0)
     * @param processedCount  number of items processed
     * @param totalCount      total number of items
     */
    void onProgress(double percentComplete, long processedCount, long totalCount);

    /**
     * Called with the estimated time remaining.
     *
     * @param remaining the estimated duration remaining
     */
    void onEstimatedTimeRemaining(Duration remaining);
}
