# KURELB - text-search-engine

**Category:** rl

## Overview
- Task ID: KURELB
- Title: text-search-engine
- Category: rl
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: kurelb-text-search-engine

## Requirements
- The current implementation builds strings character by character using the + operator in loops, which creates new string objects on each iteration and results in O(n²) time complexity for processing n characters. Every instance of this pattern must be eliminated. The _tokenize method must use re.findall(r'\w+', text.lower()) or text.lower().split() combined with filtering for alphanumeric tokens, completing in O(n) time. All string lowercasing operations using character iteration must be replaced with the str.lower() method. The search_phrase method must use str.lower() for case conversion and str.find() or the in operator for substring detection. The export_search_history method must use a list to collect search terms and join them at the end, or use io.StringIO for stream-based building. No method in the optimized implementation should contain a loop that performs string concatenation with + or +=. Performance testing must verify that tokenizing a 100,000 character document completes in under 10 milliseconds.
- The current _remove_stopwords method checks each token against a list of stopwords using a nested loop, resulting in O(n*s) complexity where n is token count and s is stopword count. This must be replaced with a frozenset defined as a class constant or module-level variable, enabling O(1) average-case membership testing with the in operator. The stopword set should be defined once at class initialization, not recreated on every method call. The filtering logic must use a list comprehension: [token for token in tokens if token not in self._stopwords], which processes all tokens in O(n) time. The optimized implementation must handle edge cases including empty token lists and tokens that are substrings of stopwords (e.g., "theorem" should not be filtered even though it contains "the"). Performance testing must show that filtering 10,000 tokens completes in under 1 millisecond, compared to the current implementation which takes proportionally longer with more stopwords.
- Every method that searches for a document by ID currently iterates through the entire document list with a for loop, resulting in O(n) lookup time that accumulates across multiple operations. The optimized implementation must maintain a dictionary mapping doc_id to Document objects, constructed when documents are added and used for all subsequent lookups. The add_document method must add entries to both the document list (for iteration needs) and the lookup dictionary. Methods including find_similar_documents, calculate_tfidf, and get_document_stats must retrieve documents using self._doc_index[doc_id] with appropriate KeyError handling for missing documents. This optimization is critical for the similarity calculation which currently performs O(n) document lookup inside an O(n) loop over all documents, creating O(n²) complexity that becomes O(n) with dictionary access. The lookup dictionary must be kept synchronized if documents can be removed or updated.
- The current index structure stores only document IDs and positions for each term, but the search scoring recalculates term frequencies by re-tokenizing documents on every query. The optimized inverted index must be a dictionary mapping stemmed terms to lists of posting objects, where each posting contains doc_id, term_frequency (count of term occurrences in document), and positions (list of word positions for phrase queries). During indexing, compute term frequencies once using collections.Counter on the document's stemmed tokens, then create postings with pre-computed counts. The search method must retrieve postings in O(1) time using direct dictionary access, then iterate only through the posting list for matching documents rather than scanning all documents. For multi-term queries, use set intersection on posting document IDs to quickly identify candidate documents before scoring. The index must also store document lengths (total term count after stemming) for TF normalization. This optimization should reduce search complexity from O(q * n * d) to O(q * p) where q is query terms, n is documents, d is average document length, and p is average postings per term.
- The calculate_tfidf method currently re-tokenizes the target document and iterates through all documents to compute document frequency on every call, resulting in O(n * d) complexity per TF-IDF calculation. The optimized implementation must pre-compute and cache IDF values for each term in the index. When a document is indexed, update a document frequency counter for each unique term in the document. Store IDF values as a dictionary mapping terms to log(N/df) where N is total documents and df is document frequency. When documents are added, incrementally update IDF values only for terms that appear in the new document rather than recalculating all values. The term frequency component must be retrieved from the pre-computed posting data in the inverted index. The calculate_tfidf method should then perform simple dictionary lookups to retrieve TF and IDF, computing the product in O(1) time. For bulk operations like finding top TF-IDF terms in a document, iterate through the document's pre-computed term frequencies and multiply by cached IDF values.
- The find_similar_documents method currently tokenizes both the target document and every other document from scratch, computing term frequency dictionaries in nested loops with O(n * d²) complexity where d is average document length. The optimized implementation must store a sparse term frequency vector for each document during indexing, represented as a dictionary mapping term to count. Document magnitude (Euclidean norm) must also be pre-computed and stored: sqrt(sum(count² for count in term_freqs.values())). Cosine similarity calculation then becomes: dot_product / (magnitude_a * magnitude_b), where dot_product iterates only over the smaller document's terms checking for matches in the larger document's vector. Use the pattern: sum(vec_a.get(term, 0) * count for term, count in vec_b.items()) for efficient sparse dot product. The similarity search should complete in O(n * t) time where t is average unique terms per document, rather than O(n * d²). For very large corpora, consider building an approximate nearest neighbor index, but exact computation is acceptable for the 100,000 document target.
- The current search_phrase method implements naive substring matching with nested character comparison loops, resulting in O(n*m) worst-case complexity where n is document length and m is phrase length. This must be replaced with Python's str.find() method which uses optimized C implementation, or the in operator for simple containment checks. For case-insensitive matching, convert both strings to lowercase once using str.lower() before comparison, not character by character. The pattern content_lower = doc.content.lower(); count = content_lower.count(phrase_lower) efficiently counts all occurrences in O(n) amortized time. For position-aware matching needed for highlighting, use a while loop with str.find(phrase, start_pos) that advances start_pos after each match. If implementing manual matching for educational purposes, use the Knuth-Morris-Pratt algorithm which pre-computes a failure function enabling O(n+m) matching without backtracking. The optimized phrase search must process a 100,000 character document with a 100 character phrase in under 1 millisecond.
- Every result ranking operation in the codebase uses bubble sort with nested loops, resulting in O(n²) complexity that becomes prohibitive for large result sets. All instances must be replaced with either the sorted() built-in function or the list.sort() method, both of which implement Timsort with O(n log n) worst-case complexity. For sorting search results by score descending, use: sorted(results, key=lambda r: r["score"], reverse=True). For sorting word frequencies, use: sorted(freq_dict.items(), key=lambda x: x[1], reverse=True). For suggestion ranking by document count, use: sorted(suggestions, key=lambda s: s["doc_count"], reverse=True)[:10] which also handles the top-N selection efficiently. The operator.itemgetter function can be used instead of lambdas for slight performance improvement: sorted(results, key=operator.itemgetter("score"), reverse=True). The heap-based heapq.nlargest(k, items, key=...) is more efficient when selecting top-k from large collections: heapq.nlargest(10, suggestions, key=lambda s: s["doc_count"]). Performance testing must verify that sorting 100,000 results completes in under 100 milliseconds.

## Metadata
- Programming Languages: Python
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.py`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
- Run tests locally: `python -m pytest -q tests`
- With Docker: `docker compose up --build --abort-on-container-exit`
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
