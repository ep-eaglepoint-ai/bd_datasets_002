package cache;

/**
 * Exception thrown when a computation fails during cache population.
 * 
 * This exception wraps the original cause and is propagated to all callers
 * who were waiting for the same key's computation result.
 */
public class ComputationException extends RuntimeException {
    
    private static final long serialVersionUID = 1L;
    
    /**
     * Constructs a new computation exception with the specified detail message and cause.
     *
     * @param message the detail message
     * @param cause the original exception that caused the computation to fail
     */
    public ComputationException(String message, Throwable cause) {
        super(message, cause);
    }
    
    /**
     * Constructs a new computation exception with the specified cause.
     *
     * @param cause the original exception that caused the computation to fail
     */
    public ComputationException(Throwable cause) {
        super("Computation failed", cause);
    }
}
