# Trajectory: Procedural Loot Drop Engine

## 1. Problem Statement

Based on the prompt for the "Aetherium Chronicles" online RPG, I identified the core challenge: building a stateful procedural loot generation system that goes beyond simple random chance to create a more engaging and fair reward system for players.

The problem required me to implement a `LootDropEngine` in Java that:
- Uses weighted probabilities for item rarities (Common, Rare, Legendary)
- Implements a "Pity Timer" mechanism where players who defeat 49 monsters without a Legendary item are guaranteed one on the 50th attempt
- Tracks pity timers on a per-player basis
- Ensures the system can handle thousands of loot drop calculations per second efficiently
- Maintains statistical alignment with base probabilities over time

The fundamental challenge was building a system that combines deterministic rules (pity timer) with probabilistic elements (weighted randomness) while maintaining thread safety for concurrent access from thousands of players.

## 2. Requirements

Based on the requirements specification, I identified these core features that must be implemented:

### 2.1 Weighted Probability Selection
I needed to implement a function that takes a list of item rarities with associated weights (e.g., Common: 900, Rare: 99, Legendary: 1) and returns a single rarity based on a random roll.

### 2.2 Per-Player State Tracking
I needed to use a `Map<PlayerID, PlayerLootState>` or similar structure to maintain the pity timer counter for each player independently.

### 2.3 Pity Timer Logic
For every non-Legendary drop, I needed to increment the player's pity counter. If the counter reaches 50, the next drop must be forced to be "Legendary", and the counter must reset to 0.

### 2.4 State Reset on Success
The pity timer must reset to 0 only when a "Legendary" item is dropped, whether it was through random chance or the pity timer itself.

### 2.5 High Performance
The implementation must be highly efficient, capable of processing thousands of loot drop calculations per second for all online players.

### 2.6 Statistical Accuracy
The system must ensure that statistical outcomes over time align with the base probabilities, with a caveat that the pity timer increases the effective Legendary rate above the base rate.

## 3. Constraints

I identified several constraints that shaped my implementation decisions:

### 3.1 Thread Safety
The system must handle concurrent loot requests from multiple players simultaneously without race conditions. This meant I needed to use thread-safe data structures and synchronization mechanisms.

### 3.2 Memory Efficiency
With potentially thousands of concurrent players, the state storage must be efficient. I needed to ensure player states are stored compactly and can be accessed quickly.

### 3.3 Performance
Each loot drop calculation must be fast enough to support thousands of requests per second. This required minimizing computational overhead per operation.

### 3.4 Immutability where possible
The PlayerID class should be immutable for safe use as map keys and to prevent accidental modification.

### 3.5 Extensibility
The rarity configuration should be configurable, not hardcoded, to allow for future adjustments to drop rates.

## 4. Research

I researched several concepts and patterns to make informed implementation decisions:

### 4.1 Weighted Random Selection Algorithms

I researched different approaches for implementing weighted random selection:

**Cumulative Distribution Function (CDF) approach:** I learned that this involves precomputing cumulative probabilities and using linear search for selection. For each rarity, I calculate the cumulative probability and store it. When selecting, I generate a random value and find the first rarity whose cumulative probability exceeds the random value.

**Alias Method:** I discovered this provides O(1) selection time after O(n) preprocessing. It's more complex to implement but very efficient for high-frequency selections.

**Linear Scan:** This simple approach iterates through weights with O(n) complexity per selection but is easy to understand and maintain.

**Reference:** I reviewed the Java documentation for [java.util.Random](https://docs.oracle.com/javase/8/docs/api/java/util/Random.html) for random number generation basics.

### 4.2 Thread-Safe State Management

I researched concurrent data structures in Java to ensure thread safety:

**ConcurrentHashMap:** I learned this provides thread-safe operations with better performance than synchronized collections. The `computeIfAbsent` method is particularly useful for atomic state creation.

**Atomic variables:** I studied [java.util.concurrent.atomic](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/atomic/package-summary.html) for atomic counter operations that don't require full synchronization.

**Synchronization strategies:** I researched fine-grained synchronization on individual player states rather than locking the entire engine, which would become a bottleneck.

**Reference:** I reviewed [java.util.concurrent.ConcurrentHashMap](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/ConcurrentHashMap.html) documentation for best practices.

### 4.3 Pity Timer Mechanics in Gaming

I researched how pity timer systems work in commercial games:

**Industry Standard:** Most RPGs (Diablo, Path of Exile, World of Warcraft) use pity timers to prevent bad luck streaks and improve player retention.

**Implementation Pattern:** The common pattern is to increment a counter on non-target drops and trigger a guaranteed drop when the counter reaches a threshold. The trigger typically happens BEFORE the counter reaches the threshold (e.g., at 49 for a 50-drop guarantee).

**Mathematical Impact:** I learned that pity timers mathematically increase the effective drop rate above the base rate. For a 1% base rate with a 50-drop pity timer, the effective rate becomes approximately 3%.

### 4.4 Design Pattern Research

I researched and applied several design patterns:

**Strategy Pattern:** I applied this by creating a `WeightedRarityConfiguration` class that encapsulates different weight strategies, allowing flexible probability configurations.

**State Pattern:** I implemented this through the `PlayerLootState` class which encapsulates all state for a single player's loot history.

**Factory Pattern:** I used this in `PlayerID` which provides factory methods for creating identifiers.

## 5. Choosing Methods and Why

### 5.1 Weighted Selection Method: Cumulative Probability Distribution

I chose to implement weighted selection using cumulative probabilities stored in an array. The process works as follows:

1. I precompute cumulative probabilities during configuration initialization: Common (0.9), Rare (0.999), Legendary (1.0)
2. I generate a random value between 0 and 1
3. I find the first rarity whose cumulative probability exceeds the random value
4. I return that rarity

I chose this approach because:
- It efficiently handles weighted probabilities with minimal computation per selection
- It supports arbitrary weight configurations for flexibility
- The code is straightforward and maintainable
- For small numbers of rarities (3), the linear scan is faster than binary search due to lower constant factors

### 5.2 Pity Timer Implementation: Counter-Based with Threshold Check

I implemented the pity timer as a simple counter that increments on non-Legendary drops and resets to 0 on Legendary drops. The key check is:

```java
if (state.getPityCounter() >= pityThreshold - 1) {
    // Force Legendary drop
    result = LootRarity.LEGENDARY;
}
```

I chose this approach because:
- It directly implements the requirement: 49 failures guarantee a Legendary on the 50th
- The condition `pityCounter >= 49` means when counter is 49, the next drop is forced Legendary
- After the forced Legendary, `recordDrop()` resets the counter to 0
- This ensures exactly 50 drops (49 non-Legendary + 1 Legendary) in the worst case

### 5.3 Thread Safety Strategy: ConcurrentHashMap with Synchronized States

I used `ConcurrentHashMap` for the player states map and synchronized on individual `PlayerLootState` objects for state updates:

```java
PlayerLootState state = playerStates.computeIfAbsent(playerId, k -> new PlayerLootState());

synchronized (state) {
    if (state.getPityCounter() >= pityThreshold - 1) {
        result = LootRarity.LEGENDARY;
    } else {
        result = selectRarityByWeight();
    }
    state.recordDrop(result);
}
```

I chose this approach because:
- `ConcurrentHashMap` provides thread-safe access to the map itself
- Synchronizing on the individual state object allows concurrent loot generation for different players
- Only the player whose state is being modified is locked, maximizing throughput
- This provides good performance while ensuring correctness

### 5.4 Atomic Counters for Statistics

I used `AtomicLong` for global statistics:

```java
private final AtomicLong totalDropsProcessed;
private final AtomicLong totalLegendaryDrops;
private final AtomicLong pityTriggeredLegendaries;
```

I chose `AtomicLong` because:
- It provides lock-free atomic operations for high performance
- Multiple threads can increment counters without synchronization overhead
- It's more efficient than synchronized Long wrappers
- The `get()` method is volatile-read safe

### 5.5 PlayerID Immutability

I made PlayerID an immutable class:

```java
public final class PlayerID {
    private final String id;
    private final long numericId;
    // No setters, all fields set in constructor
}
```

I chose immutability because:
- Immutable objects are inherently thread-safe
- They can be safely used as keys in ConcurrentHashMap
- They can be cached and reused without concern for modification
- `equals()` and `hashCode()` are stable, preventing map corruption

## 6. Solution Implementation and Explanation

### 6.1 Architecture Overview

I designed the solution with four main classes:

1. **LootRarity**: Enum representing rarity levels with weights and probability calculations
2. **PlayerID**: Immutable identifier for players
3. **PlayerLootState**: State container for a single player's loot history
4. **LootDropEngine**: Main engine coordinating loot generation

### 6.2 LootRarity Implementation

I created the `LootRarity` enum with associated weights and probabilities:

```java
public enum LootRarity {
    COMMON("Common", 900),
    RARE("Rare", 99),
    LEGENDARY("Legendary", 1);
}
```

I added the `WeightedRarityConfiguration` inner class to encapsulate custom weight configurations. This class:
- Stores rarities and their weights
- Precomputes cumulative probabilities for efficient selection
- Provides the `selectRarity(double randomValue)` method for weighted selection

The cumulative probability calculation works like this:
- Common: 900/1000 = 0.9
- Rare: 99/1000 = 0.099 (cumulative: 0.999)
- Legendary: 1/1000 = 0.001 (cumulative: 1.0)

When selecting, if the random value is 0.95, it falls between 0.9 (Common) and 0.999 (Rare), so Rare is selected.

### 6.3 PlayerLootState Implementation

I created `PlayerLootState` to track:
- `pityCounter`: Consecutive non-Legendary drops
- `totalDrops`: Total drops for this player
- `legendaryDrops`, `commonDrops`, `rareDrops`: Counters by rarity

The key method is `recordDrop()`:

```java
void recordDrop(LootRarity rarity) {
    totalDrops++;
    
    switch (rarity) {
        case LEGENDARY:
            legendaryDrops++;
            pityCounter = 0; // Reset on Legendary
            break;
        case RARE:
            rareDrops++;
            pityCounter++;
            break;
        case COMMON:
        default:
            commonDrops++;
            pityCounter++;
            break;
    }
}
```

This method handles both the pity counter incrementation and the reset logic in one place, ensuring consistency.

### 6.4 PlayerID Implementation

I made PlayerID immutable with proper `equals`/`hashCode` implementations:

```java
public final class PlayerID {
    private final String id;
    private final long numericId;
    
    public PlayerID(String id) {
        if (id == null || id.isEmpty()) {
            throw new IllegalArgumentException("Player ID cannot be null or empty");
        }
        this.id = id;
        this.numericId = 0;
    }
}
```

The static factory method `createUnique()` uses an `AtomicLong` for thread-safe ID generation.

### 6.5 LootDropEngine Implementation

The main engine class orchestrates the entire process:

**Constructor:** I initialized all components with validation:
- I validated that the pity threshold is positive
- I validated that the rarity configuration is not null
- I created a `ConcurrentHashMap` for player states
- I initialized `AtomicLong` counters

**generateLootDrop(PlayerID playerId):** This is the primary method:
1. I validated that playerId is not null
2. I got or created player state using `computeIfAbsent`
3. I synchronized on the state object
4. I checked if the pity timer is active (counter >= 49)
5. If active, I forced Legendary; otherwise I selected by weight
6. I recorded the drop (which handles counter reset)
7. I updated global statistics

**selectRarityByWeight():** This delegates to the configuration's selection method with a random value.

**Additional features I implemented:**
- `generateLootDrop(PlayerID, double)`: For deterministic testing with custom random values
- `setPlayerPityCounter()`: For testing, allows setting pity counter directly
- `generateBulkLootDrops()`: For statistical testing with many drops
- `reset()` and `clearPlayerState()`: For testing cleanup

## 7. How Solution Handles Constraints, Requirements, and Edge Cases

### 7.1 Weighted Probability Selection (Requirement 1)

The solution handles weighted probability through the `WeightedRarityConfiguration.selectRarity()` method. The cumulative probability array ensures that:
- Common items (weight 900) are selected when random value < 0.9 (90% chance)
- Rare items (weight 99) are selected when 0.9 <= random value < 0.999 (9.9% chance)
- Legendary items (weight 1) are selected when random value >= 0.999 (0.1% chance)

This directly maps to the example weights (900, 99, 1) from the requirements.

### 7.2 Per-Player State Tracking (Requirement 2)

The solution uses `ConcurrentHashMap<PlayerID, PlayerLootState>`:
- Each player has their own `PlayerLootState` instance
- The map is thread-safe for concurrent access
- `computeIfAbsent` atomically creates new states for new players
- PlayerID's immutability ensures safe use as map keys

### 7.3 Pity Timer Logic (Requirement 3)

The pity timer is implemented through:
1. `state.getPityCounter() >= pityThreshold - 1` check (counter >= 49)
2. If true, force `LootRarity.LEGENDARY`
3. Then `state.recordDrop(LEGENDARY)` resets counter to 0

This ensures:
- 49 non-Legendary drops: pityCounter goes 0→49
- 50th drop: forced Legendary, then reset to 0
- Total of 50 drops in a pity cycle

### 7.4 State Reset on Success (Requirement 4)

The `recordDrop()` method handles the reset:
- When `rarity == LEGENDARY`, `pityCounter = 0`
- This applies whether the Legendary was from random chance or pity timer
- The reset happens after recording the drop, maintaining correct state

### 7.5 High Performance (Constraint 3)

The solution achieves high performance through:
- **ConcurrentHashMap**: Lock-free reads, minimal contention
- **Atomic operations**: No synchronized blocks for counter increments
- **Fine-grained synchronization**: Only synchronizing on individual player states
- **Precomputed probabilities**: No calculation needed per drop
- **Efficient random**: Using `java.util.Random` which is fast for this use case

This architecture supports thousands of drops per second:
- Different players can generate loot concurrently without blocking
- Counter increments are atomic and lock-free
- The inner loop (weighted selection) is just a few comparisons

### 7.6 Statistical Accuracy (Requirement 6)

The solution maintains statistical accuracy through:
1. **Base probability preservation**: The weighted selection still uses base probabilities
2. **Pity timer as override**: The pity timer only forces Legendary when the counter threshold is reached
3. **No modification of base weights**: The configuration remains unchanged

Over many drops, the overall Legendary rate will be slightly higher than the base rate due to pity timer guarantees, which is the intended behavior for player fairness.

### 7.7 Edge Cases Handled

**Edge Case 1: New player with no history**
- `computeIfAbsent` creates a new `PlayerLootState` with counter = 0
- First drop uses weighted selection normally

**Edge Case 2: Player gets lucky with early Legendary**
- `recordDrop(LEGENDARY)` resets counter to 0
- Pity timer starts fresh from 0

**Edge Case 3: Multiple players simultaneously**
- Each player's state is synchronized separately
- No contention between different players
- Only same-player concurrent requests block each other

**Edge Case 4: Zero-weight rarities**
- The configuration supports custom weights
- Zero-weight rarities simply never get selected
- The cumulative probability array handles this correctly

**Edge Case 5: Custom pity threshold**
- The engine accepts any positive threshold
- Default is 50, but can be configured
- The logic adapts to any threshold value

**Edge Case 6: Null player ID**
- Explicit null check throws `IllegalArgumentException`
- Prevents `NullPointerException` in map operations

**Edge Case 7: Reset during play**
- Player can continue earning drops after state reset
- Pity timer starts from 0 again
- Statistics track overall performance

### 7.8 Thread Safety Verification

The solution is thread-safe because:
1. **PlayerID is immutable**: Cannot be modified after creation
2. **ConcurrentHashMap**: Thread-safe map operations
3. **computeIfAbsent**: Atomic state creation
4. **Synchronized state blocks**: Exclusive access to player state during updates
5. **AtomicLong counters**: Lock-free atomic increments
6. **No shared mutable state**: Each player state is independent

This ensures correct behavior even under heavy concurrent load from thousands of players.

## 8. Summary

I implemented a complete `LootDropEngine` that satisfies all requirements:

1. **Weighted probability selection** through cumulative probability arrays
2. **Per-player state tracking** using `ConcurrentHashMap`
3. **Pity timer logic** with 50-drop threshold guarantee
4. **State reset on Legendary** drop
5. **High performance** through concurrent data structures
6. **Statistical accuracy** by preserving base probabilities

The solution is thread-safe, performant, and extensible. It handles all edge cases gracefully while maintaining the fairness and engagement goals of the Aetherium Chronicles loot system.
