# Trajectory

This document outlines the design decisions, implementation details, and testing strategy for the Linear-Time Regex Engine using Thompson's NFA Construction.

---

## Understanding Thompson NFA

In the world of computer science, the **Thompson NFA** (Nondeterministic Finite Automaton) is a classic algorithm used to transform a regular expression into a finite automaton. Created by Ken Thompson (one of the fathers of Unix), it serves as the foundational "engine" for many text-searching tools like `grep`.

Instead of trying to match text directly, this method builds a structural "map" of the regular expression that a computer can walk through to see if a string matches.

### How It Works

The algorithm is **recursive** and **compositional**. It breaks a complex regular expression into its smallest parts (individual characters) and then glues them together using specific construction rules.

Key components include:

* **States and Transitions:** Represented as circles (states) and arrows (transitions).
* **Symbol Transitions:** Moving from one state to another by consuming a specific character.
* **Epsilon (ε) Transitions:** These are "free moves" that allow the machine to jump to another state without consuming any input. This is what makes it "nondeterministic."

### The Basic Building Blocks

Thompson’s construction uses specific templates for the three fundamental operations of regular expressions:

| Operation | Description | Visual Logic |
| --- | --- | --- |
| **Concatenation** | Matches `A` then `B`. | The exit of `A` connects directly to the start of `B`. |
| **Union (OR)** | Matches `A` or `B`. | A new start state splits into two paths using `ε` transitions. |
| **Kleene Star (*)** | Matches zero or more of `A`. | A loop is created using `ε` transitions to allow repeating `A` or skipping it entirely. |

### Why Use It?

1. **Simplicity:** It is very easy to implement programmatically compared to other methods.
2. **Linear Construction:** The time it takes to build the NFA is proportional to the length of the regular expression ($n$).
3. **No Backtracking:** Unlike some modern "backtracking" engines (like those in Python or Java), a Thompson-based engine can guarantee linear time performance for searching, meaning it won't "hang" or slow down exponentially on complex patterns.

### The Trade-off

While Thompson NFAs are fast to build, they can be slower to execute than a **DFA** (Deterministic Finite Automaton) because the machine can be in multiple states at once. Often, compilers will use Thompson's method to build the NFA and then convert it into a DFA for maximum search speed.

---

## Implementation Details (`repository_after/__init__.py`)

The engine implements Thompson’s NFA construction, which avoids exponential backtracking by simulating multiple paths concurrently.

### 1. NFA Architecture
- **State Class**: Represents nodes in the NFA. Each state contains metadata for transitions, as outlined in Thompson's original automata design [1][3].
    - `label`: Character to match.
    - `edges`: Consuming transitions.
    - `epsilon_edges`: Non-consuming transitions.
- **Frag Class**: Based on the concept of "NFA fragments" popularized by Russ Cox to maintain dangling edges during construction [1][2].

### 2. Parsing Pipeline
- **Explicit Concatenation**: The `preprocess_regex` function handles the implicit concatenation operator, a necessary step for Shunting-yard based regex parsing [1][2].
- **Shunting-Yard Algorithm**: Based on Dijkstra's classic algorithm, adapted here to handle regex operator precedence (Star > Concat > Alt) [4].

### 3. Construction and Simulation
- **Thompson's Construction**: The `post_to_nfa` function implements the recursive-descent-like construction of NFAs from postfix expressions [1][3].
- **Epsilon Closure**: Essential for correctly simulating non-deterministic transitions, ensuring all reachable states are tracked instantly [2].
- **Lockstep Simulation**: Implements the $O(N \times M)$ algorithm that avoids backtracking, ensuring performance stability even with pathological inputs [1][3].

## Testing Strategy (`tests/test_regex.py`)

A comprehensive test suite was developed to ensure functional correctness and compliance with strict architectural requirements.

### 1. Functional Testing
- **Basic Operators**: Verified literals, concatenation, and alternation.
- **Operator Precedence**: Confirmed correct binding strengths for complex expressions.
- **Edge Cases**: Handled empty inputs and nested structures.
- **Epsilon Loops**: Validated cycle handling in the NFA graph.

### 2. Architectural Verification
- **No `re` Module**: Ensured zero dependency on built-in backtracking engines.
- **No Recursion**: Verified the iterative nature of the matching loop.
- **Linear Time Complexity**: Proven via ReDoS-resistant test cases as described by Cox [1].
- **Efficiency Constraint**: Confirmed the use of state-sets to maintain linear performance [1][2].

## References

1. **Russ Cox**, "Regular Expression Matching Can Be Simple And Fast (but is slow in Java, Perl, PHP, Python, Ruby, ...)", [swtch.com/~rsc/regexp/regexp1.html](https://swtch.com/~rsc/regexp/regexp1.html)
2. **Eli Bendersky**, "Visualizing Thompson's Construction Algorithm", [eli.thegreenplace.net/2009/03/12/visualizing-thompsons-construction-algorithm](https://eli.thegreenplace.net/2009/03/12/visualizing-thompsons-construction-algorithm)
3. **Ken Thompson**, "Regular Expression Search Algorithm", *Communications of the ACM*, Vol. 11, No. 6, June 1968.
4. **Edsger W. Dijkstra**, "The Shunting-Yard Algorithm", (Adaptation for Infix-to-Postfix conversion).

## Conclusion

The engine provides a reliable, high-performance alternative to backtracking regex engines, satisfying all the specified safety and efficiency constraints through formal automata theory.

