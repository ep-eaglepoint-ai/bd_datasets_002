package com.eaglepoint.parallel;

/**
 * Record representing a failure during element processing.
 */
public class ProcessingFailure extends RuntimeException {
    private final Object element;
    private final int index;

    public ProcessingFailure(Object element, int index, Throwable cause) {
        super(cause);
        this.element = element;
        this.index = index;
    }

    public Object getElement() {
        return element;
    }

    public int getIndex() {
        return index;
    }

    @Override
    public String getMessage() {
        return String.format("Processing failed at index %d for element %s: %s", 
            index, element, getCause().getMessage());
    }
}
