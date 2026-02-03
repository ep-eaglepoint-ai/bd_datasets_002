package com.aetheriumchronicles.loot;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("PlayerLootState Tests")
class PlayerLootStateTest {

    @Nested
    @DisplayName("Constructor Tests")
    class ConstructorTests {

        @Test
        void testDefaultConstructor() {
            PlayerLootState state = new PlayerLootState();
            
            assertEquals(0, state.getPityCounter());
            assertEquals(0, state.getTotalDrops());
            assertEquals(0, state.getLegendaryDrops());
        }

        @Test
        void testInitialPityCounter() {
            PlayerLootState state = new PlayerLootState(25);
            
            assertEquals(25, state.getPityCounter());
            assertEquals(0, state.getTotalDrops());
        }

        @Test
        void testLargeInitialPityCounter() {
            PlayerLootState state = new PlayerLootState(100);
            
            assertEquals(100, state.getPityCounter());
            assertTrue(state.isPityTimerActive());
        }
    }

    @Nested
    @DisplayName("Drop Recording Tests")
    class DropRecordingTests {

        @Test
        void testRecordCommonDrop() {
            PlayerLootState state = new PlayerLootState();
            
            state.recordDrop(LootRarity.COMMON);
            
            assertEquals(1, state.getTotalDrops());
            assertEquals(1, state.getCommonDrops());
            assertEquals(1, state.getPityCounter());
        }

        @Test
        void testRecordRareDrop() {
            PlayerLootState state = new PlayerLootState();
            
            state.recordDrop(LootRarity.RARE);
            
            assertEquals(1, state.getTotalDrops());
            assertEquals(1, state.getRareDrops());
            assertEquals(1, state.getPityCounter());
        }

        @Test
        void testRecordLegendaryDrop() {
            PlayerLootState state = new PlayerLootState(30);
            
            state.recordDrop(LootRarity.LEGENDARY);
            
            assertEquals(1, state.getTotalDrops());
            assertEquals(1, state.getLegendaryDrops());
            assertEquals(0, state.getPityCounter());
        }

        @Test
        void testResetAtThreshold() {
            PlayerLootState state = new PlayerLootState(49);
            
            state.recordDrop(LootRarity.LEGENDARY);
            
            assertEquals(0, state.getPityCounter());
        }

        @Test
        void testMultipleDrops() {
            PlayerLootState state = new PlayerLootState();
            
            state.recordDrop(LootRarity.COMMON);
            state.recordDrop(LootRarity.COMMON);
            state.recordDrop(LootRarity.RARE);
            state.recordDrop(LootRarity.LEGENDARY);
            state.recordDrop(LootRarity.COMMON);
            
            assertEquals(5, state.getTotalDrops());
            assertEquals(3, state.getCommonDrops());
            assertEquals(1, state.getRareDrops());
            assertEquals(1, state.getLegendaryDrops());
            assertEquals(1, state.getPityCounter());
        }
    }

    @Nested
    @DisplayName("Pity Timer Tests")
    class PityTimerTests {

        @Test
        void testPityTimerActiveAtThreshold() {
            PlayerLootState state = new PlayerLootState(
                PlayerLootState.PITY_THRESHOLD);
            
            assertTrue(state.isPityTimerActive());
        }

        @Test
        void testPityTimerActiveAboveThreshold() {
            PlayerLootState state = new PlayerLootState(60);
            
            assertTrue(state.isPityTimerActive());
        }

        @Test
        void testPityTimerInactive() {
            PlayerLootState state = new PlayerLootState(49);
            
            assertFalse(state.isPityTimerActive());
        }

        @Test
        void testPityTimerInactiveAtZero() {
            PlayerLootState state = new PlayerLootState();
            
            assertFalse(state.isPityTimerActive());
        }

        @Test
        void testIncrementPityCounter() {
            PlayerLootState state = new PlayerLootState(10);
            
            state.incrementPityCounter();
            
            assertEquals(11, state.getPityCounter());
        }

        @Test
        void testResetPityCounter() {
            PlayerLootState state = new PlayerLootState(45);
            
            state.resetPityCounter();
            
            assertEquals(0, state.getPityCounter());
        }
    }

    @Nested
    @DisplayName("Copy and Reset Tests")
    class CopyResetTests {

        @Test
        void testCopy() {
            PlayerLootState original = new PlayerLootState(25);
            original.recordDrop(LootRarity.COMMON);
            original.recordDrop(LootRarity.LEGENDARY);
            
            PlayerLootState copy = original.copy();
            
            assertEquals(original.getPityCounter(), copy.getPityCounter());
            assertEquals(original.getTotalDrops(), copy.getTotalDrops());
        }

        @Test
        void testReset() {
            PlayerLootState state = new PlayerLootState(40);
            state.recordDrop(LootRarity.COMMON);
            state.recordDrop(LootRarity.RARE);
            state.recordDrop(LootRarity.LEGENDARY);
            
            state.reset();
            
            assertEquals(0, state.getPityCounter());
            assertEquals(0, state.getTotalDrops());
        }
    }
}
