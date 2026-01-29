# Trajectory

1. Audit the Original Code (Identify GC Pressure Sources):
   I audited the original code and identified several major sources of excessive allocations and GC pressure. The service was pointer-heavy, making unnecessary copies, and using inefficient memory management patterns that would not scale under load.

2. Identify Pointer-Heavy Data Structures
   The `LargeRecord` struct used pointers for almost every field (`*string`, `*[]byte`, `[]*string`, `map[string]*string`, etc.). This creates significant GC scan pressure because the garbage collector must traverse all these pointers to determine what's reachable. Every pointer adds overhead during GC cycles.
   Learn about Go GC and why pointer-heavy code is problematic: Understanding Go's Garbage Collector
   Link: [https://go.dev/blog/ismmkeynote](https://go.dev/blog/ismmkeynote)

3. Eliminate Redundant Data Copies
   In the `Ingest` function, data was being copied multiple times unnecessarily - first into `dataCopy1`, then into `dataCopy2`, and the hash was also copied into a new slice when it could use a fixed-size array directly. I removed all these redundant copies, allocating data once and using it directly.

4. Replace String Allocation Overhead with Buffer Reuse
   Heavy use of `fmt.Sprintf` and `strings.Join` in hot paths created many temporary string allocations. Each call allocates new strings on the heap. I implemented buffer reuse with helper functions `appendInt` and `appendInt64` that use `strconv.AppendInt` to build strings in reusable byte buffers. The service now maintains scratch buffers (`idBuf`, `keyBuf`, `tagBuf`, `eventBuf`) that are reset and reused across operations, eliminating allocations in hot paths.

5. Fix Inefficient Cache Trimming
   When the cache exceeded 10000 records, it was resliced with `s.cache = s.cache[5000:]`, which doesn't actually release memory - it just moves the slice header, keeping the old backing array in memory. I implemented `compactCacheUnlocked()` that properly releases memory by creating a new slice and copying only the records that should be kept. This ensures the old backing arrays are actually released to the GC.

6. Simplify Background Maintenance Routine
   The background maintenance routine was randomly duplicating cache entries, adding unnecessary allocations and memory pressure. I removed this random cache duplication. The background routine now only performs necessary cleanup and reporting, reducing allocations and lock contention.

7. Convert to Value-Based Record Structure
   I changed `LargeRecord` to use value types instead of pointers:
   - `ID *string` → `ID string`
   - `Data *[]byte` → `Data []byte`
   - `Meta map[string]*string` → `Meta map[string]string`
   - `Tags []*string` → `Tags []string`
   - `History *[]*string` → `History []string`
   - `Hash *[]byte` → `Hash [32]byte` (fixed-size array, no heap allocation)
   - `Encoded *string` → `Encoded string`
   - `Attributes *[]map[string]*string` → `Attributes []map[string]string`
   - `Related []*LargeRecord` → `Related []int` (indices instead of pointers)
   
   This dramatically reduces GC scan pressure since the garbage collector doesn't need to follow pointer chains through the record structure.

8. Convert Cache Storage to Value Types
   I changed `cache []*LargeRecord` to `cache []LargeRecord`. Records are now stored as values in a contiguous slice, improving cache locality and reducing pointer indirection. The index maps now store integer indices (`map[string]int` and `map[string][]int`) instead of pointers, eliminating GC scan overhead from the index structures.

9. Optimize Snapshot Creation
   I removed the redundant copy in `makeSnapshotUnlocked()`. The function now returns the JSON bytes directly without the extra `bytes.Buffer` copy step, reducing allocations during snapshot operations.

10. Apply Proper Memory Release to All Collections
    I applied the same memory release approach used for cache trimming to event logs, reports, and snapshots in the background maintenance routine. This ensures all collections properly release memory when trimmed, preventing memory leaks from retained backing arrays.

11. Result: Reduced GC Pressure + Better Performance
    The solution consistently uses value types instead of pointers, eliminates redundant allocations, properly releases memory, and exhibits measurable performance improvements (reduced GC pause times, lower memory usage, and better cache locality).
