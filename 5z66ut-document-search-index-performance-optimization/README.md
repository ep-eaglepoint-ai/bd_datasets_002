# 5Z66UT - Document Search Index Performance Optimization

**Category:** sft

## Overview
- Task ID: 5Z66UT
- Title: Document Search Index Performance Optimization
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 5z66ut-document-search-index-performance-optimization

## Requirements
- Index 100,000 documents (average 5KB each) in under 5 seconds. When bulk indexing a corpus of 100,000 legal documents totaling approximately 500MB, the indexDocuments() method must complete within 5 seconds on a standard 4-core machine.
- Search queries must complete in under 50ms at the 99th percentile. When executing 1,000 random multi-word queries against a fully indexed corpus of 100,000 documents, 99% of queries must return results within 50ms.
- Memory usage must stay under 2GB for a 500MB document corpus. After indexing 100,000 documents totaling 500MB of content, heap memory consumption (measured via Runtime.getRuntime().totalMemory() - freeMemory()) must not exceed 2GB.
- No application freezes lasting more than 100ms during operation. When monitoring GC pause times during indexing and searching, no single pause event should exceed 100ms. Users must not experience visible UI freezes.
- Search results and ranking must be identical to the current implementation. The TF-IDF scoring formula uses the posting list size as the document frequency component. If term "contract" appears 50 times across documents, the posting list size must reflect all 50 occurrences for IDF calculation, not just unique document count.
- he getDocument(String docId) method must return the complete Document object with full original content. If a 5KB document was indexed, getDocument() must return that same 5KB content - not a truncated snippet or empty string.
- Multiple search threads must be able to execute queries simultaneously without blocking each other. When 100 threads execute searches concurrently, throughput must scale linearly - not serialize to single-threaded performance.
- All public method signatures must remain unchanged. The methods indexDocument(), indexDocuments(), search(), getDocument(), containsDocument(), removeDocument(), getDocumentCount(), getTermCount(), clear(), and getStatistics() must maintain their existing signatures and return types.
- Only Java 17 standard library is permitted. No external dependencies such as Lucene, Apache Commons, Guava, or any third-party libraries. All implementations must use only classes from java.* and javax.* packages.
- Multi-word queries must return only documents containing ALL query terms. A search for "breach contract" must return only documents containing both "breach" AND "contract" - not documents containing just one term.
- Search results must include contextual snippets showing query terms in surrounding text. Snippets must show approximately 50 characters before and 150 characters after the first occurrence of a query term, with "..." prefix/suffix when truncated.
- The solution must pass a stress test of 10,000 search operations executed across 100 concurrent threads with random query terms, with zero errors, consistent rankings, and no memory leaks over the duration of the test.

## Metadata
- Programming Languages: Java
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
