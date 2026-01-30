package com.aetheriumchronicles.loot;

import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * The core engine for procedural loot generation in Aetherium Chronicles.
 * 
 * This engine implements:
 * - Weighted probability selection for item rarities
 * - Per-player state tracking with a pity timer mechanism
 * - High-performance concurrent access for thousands of drops per second
 * 
 * Pity Timer Mechanics:
 * - For every non-Legendary drop, the player's pity counter increments
 * - When the counter reaches 50, the next drop is guaranteed to be Legendary
 * - Upon receiving a Legendary drop (by chance or pity), the counter resets to 0
 * 
 * Thread Safety:
 * - This class is thread-safe and can handle concurrent loot requests
 * - Uses ConcurrentHashMap for player state storage
 * - Atomic operations for critical statistics
 */
public class LootDropEngine {
    
    /** Default pity threshold: 49 failures guarantee a legendary on the 50th */
    public static final int DEFAULT_PITY_THRESHOLD = 50;
    
    /** The configured pity threshold */
    private final int pityThreshold;
    
    /** Thread-safe random number generator */
    private final Random random;
    
    /** Concurrent map storing loot state for each player */
    private final Map<PlayerID, PlayerLootState> playerStates;
    
    /** Configuration for rarity weights */
    private LootRarity.WeightedRarityConfiguration rarityConfiguration;
    
    /** Total number of drops processed across all players (atomic for thread safety) */
    private final AtomicLong totalDropsProcessed;
    
    /** Total number of legendary drops (atomic for thread safety) */
    private final AtomicLong totalLegendaryDrops;
    
    /** Total number of times pity timer triggered a legendary drop */
    private final AtomicLong pityTriggeredLegendaries;

    /**
     * Creates a new LootDropEngine with default settings.
     * Uses default rarity weights (Common: 900, Rare: 99, Legendary: 1)
     * and default pity threshold (50).
     */
    public LootDropEngine() {
        this(DEFAULT_PITY_THRESHOLD, LootRarity.getDefaultConfiguration());
    }

    /**
     * Creates a new LootDropEngine with custom pity threshold.
     * 
     * @param pityThreshold The number of consecutive non-legendary drops 
     *                      before a legendary is guaranteed
     */
    public LootDropEngine(int pityThreshold) {
        this(pityThreshold, LootRarity.getDefaultConfiguration());
    }

    /**
     * Creates a new LootDropEngine with custom rarity configuration.
     * 
     * @param rarityConfiguration The configuration defining rarity weights
     */
    public LootDropEngine(LootRarity.WeightedRarityConfiguration rarityConfiguration) {
        this(DEFAULT_PITY_THRESHOLD, rarityConfiguration);
    }

    /**
     * Creates a new LootDropEngine with custom settings.
     * 
     * @param pityThreshold The number of consecutive non-legendary drops 
     *                      before a legendary is guaranteed
     * @param rarityConfiguration The configuration defining rarity weights
     */
    public LootDropEngine(
            int pityThreshold, 
            LootRarity.WeightedRarityConfiguration rarityConfiguration) {
        if (pityThreshold <= 0) {
            throw new IllegalArgumentException("Pity threshold must be positive");
        }
        if (rarityConfiguration == null) {
            throw new IllegalArgumentException("Rarity configuration cannot be null");
        }
        
        this.pityThreshold = pityThreshold;
        this.rarityConfiguration = rarityConfiguration;
        this.random = new Random();
        this.playerStates = new ConcurrentHashMap<>();
        this.totalDropsProcessed = new AtomicLong(0);
        this.totalLegendaryDrops = new AtomicLong(0);
        this.pityTriggeredLegendaries = new AtomicLong(0);
    }

    /**
     * Creates a new LootDropEngine with a seedable random for testing reproducibility.
     * 
     * @param pityThreshold The pity threshold value
     * @param rarityConfiguration The rarity configuration
     * @param seed The seed for the random number generator
     */
    public LootDropEngine(
            int pityThreshold,
            LootRarity.WeightedRarityConfiguration rarityConfiguration,
            long seed) {
        if (pityThreshold <= 0) {
            throw new IllegalArgumentException("Pity threshold must be positive");
        }
        if (rarityConfiguration == null) {
            throw new IllegalArgumentException("Rarity configuration cannot be null");
        }
        
        this.pityThreshold = pityThreshold;
        this.rarityConfiguration = rarityConfiguration;
        this.random = new Random(seed);
        this.playerStates = new ConcurrentHashMap<>();
        this.totalDropsProcessed = new AtomicLong(0);
        this.totalLegendaryDrops = new AtomicLong(0);
        this.pityTriggeredLegendaries = new AtomicLong(0);
    }

    /**
     * Generates a loot drop for the specified player.
     * 
     * This method:
     * 1. Retrieves or creates the player's state
     * 2. Checks if the pity timer is active
     * 3. If pity timer active, forces a Legendary drop
     * 4. Otherwise, uses weighted random selection
     * 5. Updates the player's state accordingly
     * 
     * @param playerId The unique identifier of the player
     * @return The rarity of the dropped item
     */
    public LootRarity generateLootDrop(PlayerID playerId) {
        if (playerId == null) {
            throw new IllegalArgumentException("Player ID cannot be null");
        }

        // Get or create player state atomically
        PlayerLootState state = playerStates.computeIfAbsent(
            playerId, 
            k -> new PlayerLootState()
        );

        LootRarity result;
        boolean forcedByPity = false;

        synchronized (state) {
            // Check if pity timer is active
            if (state.getPityCounter() >= pityThreshold - 1) {
                // Force Legendary drop
                result = LootRarity.LEGENDARY;
                forcedByPity = true;
                pityTriggeredLegendaries.incrementAndGet();
            } else {
                // Use weighted random selection
                result = selectRarityByWeight();
            }

            // Record the drop (this handles counter reset for Legendaries)
            state.recordDrop(result);
        }

        // Update global statistics
        totalDropsProcessed.incrementAndGet();
        if (result == LootRarity.LEGENDARY) {
            totalLegendaryDrops.incrementAndGet();
        }

        return result;
    }

    /**
     * Generates a loot drop using a custom random value for testing.
     * 
     * @param playerId The player ID
     * @param randomValue A value in [0, 1) for deterministic testing
     * @return The selected rarity
     */
    LootRarity generateLootDrop(PlayerID playerId, double randomValue) {
        if (playerId == null) {
            throw new IllegalArgumentException("Player ID cannot be null");
        }
        if (randomValue < 0 || randomValue >= 1) {
            throw new IllegalArgumentException("Random value must be in [0, 1)");
        }

        PlayerLootState state = playerStates.computeIfAbsent(
            playerId, 
            k -> new PlayerLootState()
        );

        LootRarity result;
        boolean forcedByPity = false;

        synchronized (state) {
            if (state.getPityCounter() >= pityThreshold - 1) {
                result = LootRarity.LEGENDARY;
                forcedByPity = true;
                pityTriggeredLegendaries.incrementAndGet();
            } else {
                result = selectRarityByWeight(randomValue);
            }

            state.recordDrop(result);
        }

        totalDropsProcessed.incrementAndGet();
        if (result == LootRarity.LEGENDARY) {
            totalLegendaryDrops.incrementAndGet();
        }

        return result;
    }

    /**
     * Selects a rarity based on weighted probabilities using the configured weights.
     * 
     * @return The selected rarity
     */
    private LootRarity selectRarityByWeight() {
        return selectRarityByWeight(random.nextDouble());
    }

    /**
     * Selects a rarity based on weighted probabilities using a specific random value.
     * 
     * @param randomValue A value in [0, 1)
     * @return The selected rarity
     */
    private LootRarity selectRarityByWeight(double randomValue) {
        return rarityConfiguration.selectRarity(randomValue);
    }

    /**
     * Gets the current pity threshold.
     * 
     * @return The pity threshold value
     */
    public int getPityThreshold() {
        return pityThreshold;
    }

    /**
     * Gets the current loot state for a player.
     * 
     * @param playerId The player's unique identifier
     * @return The player's loot state, or null if player has no drops yet
     */
    public PlayerLootState getPlayerState(PlayerID playerId) {
        if (playerId == null) {
            throw new IllegalArgumentException("Player ID cannot be null");
        }
        return playerStates.get(playerId);
    }

    /**
     * Gets a snapshot of all player states.
     * This is a potentially expensive operation and should be used sparingly.
     * 
     * @return A map of all player states
     */
    public Map<PlayerID, PlayerLootState> getAllPlayerStates() {
        return new ConcurrentHashMap<>(playerStates);
    }

    /**
     * Gets the total number of drops processed.
     * 
     * @return Total drop count
     */
    public long getTotalDropsProcessed() {
        return totalDropsProcessed.get();
    }

    /**
     * Gets the total number of legendary drops.
     * 
     * @return Legendary drop count
     */
    public long getTotalLegendaryDrops() {
        return totalLegendaryDrops.get();
    }

    /**
     * Gets the number of times pity timer triggered a legendary drop.
     * 
     * @return Pity-triggered legendary count
     */
    public long getPityTriggeredLegendaries() {
        return pityTriggeredLegendaries.get();
    }

    /**
     * Gets the current overall legendary drop rate.
     * 
     * @return The legendary drop rate as a decimal [0, 1]
     */
    public double getOverallLegendaryRate() {
        long total = totalDropsProcessed.get();
        if (total == 0) {
            return 0.0;
        }
        return (double) totalLegendaryDrops.get() / total;
    }

    /**
     * Gets the base legendary probability from configuration.
     * 
     * @return The configured base probability
     */
    public double getBaseLegendaryProbability() {
        return rarityConfiguration.getProbability(LootRarity.LEGENDARY);
    }

    /**
     * Resets the engine state for testing purposes.
     * This clears all player states and statistics.
     */
    public void reset() {
        playerStates.clear();
        totalDropsProcessed.set(0);
        totalLegendaryDrops.set(0);
        pityTriggeredLegendaries.set(0);
    }

    /**
     * Clears the state for a specific player.
     * 
     * @param playerId The player to clear
     * @return true if the player had state that was cleared
     */
    public boolean clearPlayerState(PlayerID playerId) {
        if (playerId == null) {
            throw new IllegalArgumentException("Player ID cannot be null");
        }
        PlayerLootState removed = playerStates.remove(playerId);
        return removed != null;
    }

    /**
     * Sets the pity counter for a specific player directly.
     * This is primarily used for testing.
     * 
     * @param playerId The player ID
     * @param counter The new pity counter value
     */
    void setPlayerPityCounter(PlayerID playerId, int counter) {
        if (playerId == null) {
            throw new IllegalArgumentException("Player ID cannot be null");
        }
        if (counter < 0) {
            throw new IllegalArgumentException("Pity counter cannot be negative");
        }

        PlayerLootState state = playerStates.computeIfAbsent(
            playerId, 
            k -> new PlayerLootState()
        );

        synchronized (state) {
            // Create a new state with the specified counter
            PlayerLootState newState = new PlayerLootState(counter);
            newState.totalDrops = state.totalDrops;
            newState.legendaryDrops = state.legendaryDrops;
            newState.commonDrops = state.commonDrops;
            newState.rareDrops = state.rareDrops;
            playerStates.put(playerId, newState);
        }
    }

    /**
     * Generates loot drops in bulk for testing/statistical purposes.
     * 
     * @param playerId The player ID
     * @param count The number of drops to generate
     * @return A list of the generated rarities
     */
    public List<LootRarity> generateBulkLootDrops(PlayerID playerId, int count) {
        if (count <= 0) {
            throw new IllegalArgumentException("Count must be positive");
        }
        
        List<LootRarity> results = new java.util.ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            results.add(generateLootDrop(playerId));
        }
        return results;
    }

    /**
     * Returns the current number of tracked players.
     * 
     * @return Number of players with loot state
     */
    public int getPlayerCount() {
        return playerStates.size();
    }
}
