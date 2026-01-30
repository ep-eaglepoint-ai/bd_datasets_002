## Trajectory (Refactoring Spring Boot Text API)

### Audit the Original Code (Identify Scaling Problems)

I audited the original TextProcessingController. It relied on a class-level variable (lastProcessedText) which causes race conditions in a singleton environment, used raw Map types that obscured the data contract, and employed inefficient string concatenation loops that degrade performance

### 1.Define a Performance Contract First

I defined strict correctness and stability conditions: the controller must be stateless to handle concurrent requests, input validation must occur before processing, and error responses must be structured without leaking stack traces

### 2.Rework the Data Model for Efficiency

I introduced strongly typed Data Transfer Objects (DTOs), TextRequest and TextResponse, to explicitly define the input/output shape. This replaces the unstructured Map<String, String> and allows for compile-time safety and clearer API contracts

### 3.Rebuild the Search as a Projection-First Pipeline

(Adapted to API Handling) I rebuilt the endpoint to bind JSON bodies directly to the validated TextRequest object. This ensures that the application logic only ever interacts with fully formed, valid objects rather than raw input maps

### 4.Move Filters to the Database (Server-Side)

(Adapted to Upstream Validation) I moved input checks to the framework level using jakarta.validation annotations (e.g., @NotBlank). This ensures invalid input (null, empty, or whitespace) is rejected immediately by the container before strictly business logic executes

### 5.Use EXISTS Instead of Cartesian Joins / Heavy Tag Filtering

(Adapted to Global Exception Handling) Instead of scattered try-catch blocks or conditional checks, I implemented a @RestControllerAdvice. This acts as a global filter that catches validation exceptions early and maps them to consistent HTTP 400 responses, preventing invalid states from propagating

### 6.Stable Ordering + Keyset Pagination

(Adapted to Deterministic Logic) I fixed the logical bugs in the string reversal (off-by-one error) and word counting (array bounds error). I replaced simple space splitting with Regex (\\s+) to ensure stable, correct behavior regardless of input format (tabs vs. spaces)

### 7.Eliminate N+1 Queries for Enrichment

(Adapted to Eliminate Inefficient Loops) I eliminated the inefficient String concatenation loop (which creates $O(N^2)$ temporary objects). I replaced it with StringBuilder, which handles string manipulation in linear time $O(N)$ without memory waste

### 8.Normalize for Case-Insensitive Searches

(Adapted to Input Normalization) I added normalization logic to trim() the input and handle multiple whitespace characters uniformly. This ensures that the business logic (word counting and reversing) operates on a consistent "canonical" version of the text

### 9.Result: Measurable Performance Gains + Predictable Signals

The refactored solution is completely thread-safe (stateless), rejects invalid input instantly, handles errors predictably, and performs string operations efficiently without unnecessary object creation
