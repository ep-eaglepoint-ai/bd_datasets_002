package com.aetheriumchronicles.loot;

import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;
import java.util.Collections;

/**
 * Represents the rarity levels of loot items in the Aetherium Chronicles RPG.
 * Each rarity has an associated weight that determines its probability of dropping.
 * 
 * The weights follow the pattern where higher weights indicate more common items.
 * For example: Common: 900, Rare: 99, Legendary: 1 (total 1000)
 */
public enum LootRarity {
    COMMON("Common", 900),
    RARE("Rare", 99),
    LEGENDARY("Legendary", 1);

    private final String displayName;
    private final int weight;

    private static final int TOTAL_WEIGHT = calculateTotalWeight();
    private static final Map<LootRarity, Double> CUMULATIVE_PROBABILITIES = calculateCumulativeProbabilities();

    LootRarity(String displayName, int weight) {
        this.displayName = displayName;
        this.weight = weight;
    }

    public String getDisplayName() {
        return displayName;
    }

    public int getWeight() {
        return weight;
    }

    public double getBaseProbability() {
        return (double) weight / TOTAL_WEIGHT;
    }

    private static int calculateTotalWeight() {
        int total = 0;
        for (LootRarity rarity : values()) {
            total += rarity.weight;
        }
        return total;
    }

    private static Map<LootRarity, Double> calculateCumulativeProbabilities() {
        Map<LootRarity, Double> cumulative = new HashMap<>();
        double cumulativeWeight = 0.0;

        // Process in order: Common -> Rare -> Legendary
        for (LootRarity rarity : values()) {
            cumulativeWeight += rarity.getBaseProbability();
            cumulative.put(rarity, cumulativeWeight);
        }

        return Collections.unmodifiableMap(cumulative);
    }

    /**
     * Creates a weighted rarity configuration for custom probability setups.
     * 
     * @param rarities List of rarities to include
     * @param weights Corresponding weights for each rarity
     * @return WeightedRarityConfiguration with the specified setup
     * @throws IllegalArgumentException if rarities and weights lists have different sizes
     */
    public static WeightedRarityConfiguration createConfiguration(
            List<LootRarity> rarities, 
            List<Integer> weights) {
        if (rarities.size() != weights.size()) {
            throw new IllegalArgumentException(
                "Rarities and weights lists must have the same size");
        }
        return new WeightedRarityConfiguration(rarities, weights);
    }

    /**
     * Default configuration with standard weights (Common: 900, Rare: 99, Legendary: 1)
     */
    public static WeightedRarityConfiguration getDefaultConfiguration() {
        List<LootRarity> rarities = new ArrayList<>();
        List<Integer> weights = new ArrayList<>();

        for (LootRarity rarity : values()) {
            rarities.add(rarity);
            weights.add(rarity.weight);
        }

        return new WeightedRarityConfiguration(rarities, weights);
    }

    /**
     * Configuration class for custom rarity weight setups.
     */
    public static class WeightedRarityConfiguration {
        private final List<LootRarity> rarities;
        private final List<Integer> weights;
        private final int totalWeight;
        private final double[] cumulativeProbabilities;

        WeightedRarityConfiguration(List<LootRarity> rarities, List<Integer> weights) {
            this.rarities = new ArrayList<>(rarities);
            this.weights = new ArrayList<>(weights);
            this.totalWeight = weights.stream().mapToInt(Integer::intValue).sum();
            this.cumulativeProbabilities = new double[rarities.size()];
            
            double cumulative = 0.0;
            for (int i = 0; i < weights.size(); i++) {
                cumulative += (double) weights.get(i) / totalWeight;
                cumulativeProbabilities[i] = cumulative;
            }
        }

        public List<LootRarity> getRarities() {
            return Collections.unmodifiableList(rarities);
        }

        public List<Integer> getWeights() {
            return Collections.unmodifiableList(weights);
        }

        public int getTotalWeight() {
            return totalWeight;
        }

        public double getProbability(LootRarity rarity) {
            int index = rarities.indexOf(rarity);
            if (index < 0) {
                return 0.0;
            }
            return (double) weights.get(index) / totalWeight;
        }

        /**
         * Selects a rarity based on a random value [0, 1).
         * 
         * @param randomValue A value between 0 (inclusive) and 1 (exclusive)
         * @return The selected rarity
         */
        LootRarity selectRarity(double randomValue) {
            for (int i = 0; i < cumulativeProbabilities.length; i++) {
                if (randomValue < cumulativeProbabilities[i]) {
                    return rarities.get(i);
                }
            }
            return rarities.get(rarities.size() - 1);
        }

        /**
         * Checks if this configuration includes the specified rarity.
         */
        public boolean hasRarity(LootRarity rarity) {
            return rarities.contains(rarity);
        }

        /**
         * Gets the weight for a specific rarity.
         */
        public int getWeight(LootRarity rarity) {
            int index = rarities.indexOf(rarity);
            if (index < 0) {
                return 0;
            }
            return weights.get(index);
        }
    }
}
