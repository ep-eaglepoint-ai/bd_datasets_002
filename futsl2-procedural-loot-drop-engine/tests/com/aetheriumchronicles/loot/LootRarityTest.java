package com.aetheriumchronicles.loot;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("LootRarity Tests")
class LootRarityTest {

    @Nested
    @DisplayName("Default Configuration Tests")
    class DefaultConfigTests {

        @Test
        void testDefaultWeights() {
            assertEquals(900, LootRarity.COMMON.getWeight());
            assertEquals(99, LootRarity.RARE.getWeight());
            assertEquals(1, LootRarity.LEGENDARY.getWeight());
        }

        @Test
        void testTotalWeight() {
            LootRarity.WeightedRarityConfiguration config = 
                LootRarity.getDefaultConfiguration();
            assertEquals(1000, config.getTotalWeight());
        }

        @Test
        void testBaseProbabilities() {
            assertEquals(0.9, LootRarity.COMMON.getBaseProbability(), 0.0001);
            assertEquals(0.099, LootRarity.RARE.getBaseProbability(), 0.0001);
            assertEquals(0.001, LootRarity.LEGENDARY.getBaseProbability(), 0.0001);
        }
    }

    @Nested
    @DisplayName("Weighted Configuration Tests")
    class WeightedConfigTests {

        @Test
        void testCustomConfiguration() {
            List<LootRarity> rarities = List.of(
                LootRarity.COMMON, LootRarity.LEGENDARY
            );
            List<Integer> weights = List.of(99, 1);
            
            LootRarity.WeightedRarityConfiguration config = 
                LootRarity.createConfiguration(rarities, weights);
            
            assertEquals(100, config.getTotalWeight());
            assertEquals(0.99, config.getProbability(LootRarity.COMMON), 0.01);
            assertEquals(0.01, config.getProbability(LootRarity.LEGENDARY), 0.01);
        }

        @Test
        void testMismatchedSizes() {
            List<LootRarity> rarities = List.of(
                LootRarity.COMMON, LootRarity.RARE
            );
            List<Integer> weights = List.of(100);
            
            assertThrows(IllegalArgumentException.class, () -> {
                LootRarity.createConfiguration(rarities, weights);
            });
        }

        @Test
        void testRaritySelection() {
            List<LootRarity> rarities = List.of(
                LootRarity.COMMON, LootRarity.RARE, LootRarity.LEGENDARY
            );
            List<Integer> weights = List.of(50, 30, 20);
            
            LootRarity.WeightedRarityConfiguration config = 
                LootRarity.createConfiguration(rarities, weights);
            
            assertEquals(LootRarity.COMMON, config.selectRarity(0.0));
            assertEquals(LootRarity.COMMON, config.selectRarity(0.49));
            assertEquals(LootRarity.RARE, config.selectRarity(0.50));
            assertEquals(LootRarity.LEGENDARY, config.selectRarity(0.80));
        }

        @Test
        void testMissingRarityProbability() {
            List<LootRarity> rarities = List.of(LootRarity.COMMON);
            List<Integer> weights = List.of(100);
            
            LootRarity.WeightedRarityConfiguration config = 
                LootRarity.createConfiguration(rarities, weights);
            
            assertEquals(0.0, config.getProbability(LootRarity.LEGENDARY));
            assertFalse(config.hasRarity(LootRarity.LEGENDARY));
        }
    }

    @Nested
    @DisplayName("Display Name Tests")
    class DisplayNameTests {

        @Test
        void testDisplayNames() {
            assertEquals("Common", LootRarity.COMMON.getDisplayName());
            assertEquals("Rare", LootRarity.RARE.getDisplayName());
            assertEquals("Legendary", LootRarity.LEGENDARY.getDisplayName());
        }
    }
}
