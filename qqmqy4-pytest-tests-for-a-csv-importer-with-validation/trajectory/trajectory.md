# Trajectory

1. Audit the Original Code (Identify Validation Risks):
	I reviewed the CSV importer behavior and focused on validation risks and edge cases: missing required fields, whitespace-only values, case-insensitive duplicates, and incorrect normalization (email lowercasing, country uppercasing). This framed the test coverage around correctness rather than implementation details.

2. Define a Correctness Contract First
	I translated the requirements into explicit test contracts: exact ImportStats values, consistent duplicate handling, and strict repository interactions (no calls on invalid rows, exact insert arguments, correct call counts).

3. Build a Repository Loader That Avoids Side Effects
	I added a small import helper to load the target repository module directly by path so tests are deterministic and isolated. This avoids sys.path leakage and ensures the correct implementation is tested each time.

4. Cover Valid Inserts End-to-End
	I asserted that valid rows are inserted, emails normalized to lowercase, country normalized to uppercase, and repository insert arguments match expected dictionaries.

5. Validate Required Fields Robustly
	I covered missing and whitespace-only values for each required field using parametrized cases to ensure invalid rows are skipped and repo calls are not executed.

6. Enforce Duplicate Detection Within CSV
	I verified that duplicates in the same CSV (including case variations) are detected and skipped while still allowing unique records in the same file.

7. Enforce Duplicate Detection Against Repository
	I verified that rows already present in the repository are skipped and do not get inserted, while valid non-duplicates are inserted correctly.

8. Assert ImportStats Exactly
	I validated that `processed`, `inserted`, `skipped_invalid`, and `skipped_duplicate` match expected values for mixed datasets.

9. Cover Edge Inputs
	I included empty CSV input and header-only CSV input to ensure the importer returns zeroed stats and performs no repository calls.

10. Mixed Valid/Invalid/Duplicate Scenario
	 I combined valid rows, invalid rows, in-file duplicates, and repository duplicates in a single test to validate aggregate behavior and ordering of inserts.