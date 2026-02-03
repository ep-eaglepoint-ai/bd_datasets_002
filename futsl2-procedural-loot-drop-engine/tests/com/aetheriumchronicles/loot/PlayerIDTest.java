package com.aetheriumchronicles.loot;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("PlayerID Tests")
class PlayerIDTest {

    @Nested
    @DisplayName("String Constructor Tests")
    class StringConstructorTests {

        @Test
        void testStringConstructor() {
            PlayerID playerId = new PlayerID("player-123");
            
            assertEquals("player-123", playerId.getId());
            assertEquals(0, playerId.getNumericId());
        }

        @Test
        void testNullString() {
            assertThrows(IllegalArgumentException.class, () -> {
                new PlayerID((String) null);
            });
        }

        @Test
        void testEmptyString() {
            assertThrows(IllegalArgumentException.class, () -> {
                new PlayerID("");
            });
        }
    }

    @Nested
    @DisplayName("Numeric Constructor Tests")
    class NumericConstructorTests {

        @Test
        void testNumericConstructor() {
            PlayerID playerId = new PlayerID(12345L);
            
            assertEquals("12345", playerId.getId());
            assertEquals(12345L, playerId.getNumericId());
        }

        @Test
        void testZeroNumeric() {
            PlayerID playerId = new PlayerID(0L);
            
            assertEquals("0", playerId.getId());
            assertEquals(0, playerId.getNumericId());
        }
    }

    @Nested
    @DisplayName("Unique ID Tests")
    class UniqueIdTests {

        @Test
        void testUniqueIds() {
            PlayerID id1 = PlayerID.createUnique();
            PlayerID id2 = PlayerID.createUnique();
            
            assertNotEquals(id1.getId(), id2.getId());
        }
    }

    @Nested
    @DisplayName("Equals and HashCode Tests")
    class EqualsHashCodeTests {

        @Test
        void testEqualsSameString() {
            PlayerID id1 = new PlayerID("player-1");
            PlayerID id2 = new PlayerID("player-1");
            
            assertEquals(id1, id2);
            assertEquals(id1.hashCode(), id2.hashCode());
        }

        @Test
        void testNotEquals() {
            PlayerID id1 = new PlayerID("player-1");
            PlayerID id2 = new PlayerID("player-2");
            
            assertNotEquals(id1, id2);
        }

        @Test
        void testNumericStringEquality() {
            PlayerID numeric = new PlayerID(123L);
            PlayerID string = new PlayerID("123");
            
            assertEquals(numeric, string);
            assertEquals(numeric.hashCode(), string.hashCode());
        }

        @Test
        void testNotEqualNull() {
            PlayerID playerId = new PlayerID("test");
            
            assertNotEquals(null, playerId);
        }

        @Test
        void testReflexive() {
            PlayerID playerId = new PlayerID("test");
            
            assertEquals(playerId, playerId);
        }
    }

    @Nested
    @DisplayName("ToString Tests")
    class ToStringTests {

        @Test
        void testToString() {
            PlayerID playerId = new PlayerID("player-123");
            
            assertEquals("PlayerID{player-123}", playerId.toString());
        }
    }
}
