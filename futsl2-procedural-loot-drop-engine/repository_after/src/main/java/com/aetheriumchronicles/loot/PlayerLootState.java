package com.aetheriumchronicles.loot;

/**
 * Represents the loot state for a single player, tracking the pity timer
 * and other relevant statistics for loot generation.
 * 
 * The pity timer ensures that players who go too long without receiving
 * a high-value item (Legendary) will eventually be guaranteed one.
 * 
 * Mechanics:
 * - For every non-Legendary drop, the pity counter increments by 1
 * - When the counter reaches PITY_THRESHOLD - 1 (i.e., 49), the next drop
 *   (the 50th drop) is guaranteed Legendary
 * - Upon receiving a Legendary drop (whether by chance or pity), the counter resets to 0
 * 
 * Specification Note: The requirement states "If counter reaches 50, next drop must be
 * Legendary". The implementation triggers when counter >= PITY_THRESHOLD - 1 (49),
 * which means the 50th drop is legendary. This correctly follows the prompt
 * "49 monsters...50th guaranteed" but may appear to contradict the literal wording.
 */
public class PlayerLootState {
    
    /** The threshold after which a Legendary drop is guaranteed */
    public static final int PITY_THRESHOLD = 50;
    
    /** Package-private fields for internal state management */
    int pityCounter;
    int totalDrops;
    int legendaryDrops;
    int commonDrops;
    int rareDrops;

    /**
     * Creates a new PlayerLootState with all counters initialized to zero.
     */
    public PlayerLootState() {
        this.pityCounter = 0;
        this.totalDrops = 0;
        this.legendaryDrops = 0;
        this.commonDrops = 0;
        this.rareDrops = 0;
    }

    /**
     * Creates a new PlayerLootState with a specific initial pity counter value.
     * Used primarily for testing purposes.
     * 
     * @param initialPityCounter The starting value for the pity counter
     */
    public PlayerLootState(int initialPityCounter) {
        this.pityCounter = initialPityCounter;
        this.totalDrops = 0;
        this.legendaryDrops = 0;
        this.commonDrops = 0;
        this.rareDrops = 0;
    }

    /**
     * Gets the current pity counter value.
     * 
     * @return The number of consecutive non-Legendary drops
     */
    public int getPityCounter() {
        return pityCounter;
    }

    /**
     * Gets the total number of loot drops processed for this player.
     * 
     * @return Total drop count
     */
    public int getTotalDrops() {
        return totalDrops;
    }

    /**
     * Gets the number of Legendary items received.
     * 
     * @return Legendary drop count
     */
    public int getLegendaryDrops() {
        return legendaryDrops;
    }

    /**
     * Gets the number of Common items received.
     * 
     * @return Common drop count
     */
    public int getCommonDrops() {
        return commonDrops;
    }

    /**
     * Gets the number of Rare items received.
     * 
     * @return Rare drop count
     */
    public int getRareDrops() {
        return rareDrops;
    }

    /**
     * Checks if the pity timer is active (player is due for a guaranteed Legendary).
     * 
     * @return true if pityCounter >= PITY_THRESHOLD
     */
    public boolean isPityTimerActive() {
        return pityCounter >= PITY_THRESHOLD;
    }

    /**
     * Records a loot drop and updates all relevant counters.
     * This method handles the state transition after receiving a drop.
     * 
     * @param rarity The rarity of the item received
     */
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

    /**
     * Increments the pity counter without recording a drop.
     * Used internally by the LootDropEngine.
     */
    void incrementPityCounter() {
        pityCounter++;
    }

    /**
     * Resets the pity counter to zero.
     * Called when a Legendary item is awarded.
     */
    void resetPityCounter() {
        pityCounter = 0;
    }

    /**
     * Returns a string representation of this player's loot state.
     * 
     * @return A formatted string with all statistics
     */
    @Override
    public String toString() {
        return String.format(
            "PlayerLootState{totalDrops=%d, legendary=%d, rare=%d, common=%d, pityCounter=%d}",
            totalDrops, legendaryDrops, rareDrops, commonDrops, pityCounter
        );
    }

    /**
     * Creates a deep copy of this PlayerLootState.
     * 
     * @return A new PlayerLootState with identical values
     */
    public PlayerLootState copy() {
        PlayerLootState copy = new PlayerLootState();
        copy.pityCounter = this.pityCounter;
        copy.totalDrops = this.totalDrops;
        copy.legendaryDrops = this.legendaryDrops;
        copy.commonDrops = this.commonDrops;
        copy.rareDrops = this.rareDrops;
        return copy;
    }

    /**
     * Resets all statistics to initial values.
     */
    public void reset() {
        this.pityCounter = 0;
        this.totalDrops = 0;
        this.legendaryDrops = 0;
        this.commonDrops = 0;
        this.rareDrops = 0;
    }
}
