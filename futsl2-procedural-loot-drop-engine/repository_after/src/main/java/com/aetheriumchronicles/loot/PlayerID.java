package com.aetheriumchronicles.loot;

import java.util.Objects;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Represents a unique identifier for a player in the loot system.
 * 
 * This class provides immutable player identifiers that can be used
 * as keys in the player state map. It supports both string-based
 * and numeric-based player IDs.
 * 
 * Thread Safety:
 * - This class is immutable and therefore thread-safe
 * - The internal counter for auto-generated IDs is thread-safe
 */
public final class PlayerID {
    
    private static final AtomicLong idCounter = new AtomicLong(0);
    
    private final String id;
    private final long numericId;

    /**
     * Creates a PlayerID from a string identifier.
     * 
     * @param id The player identifier string
     */
    public PlayerID(String id) {
        if (id == null || id.isEmpty()) {
            throw new IllegalArgumentException("Player ID cannot be null or empty");
        }
        this.id = id;
        this.numericId = 0;
    }

    /**
     * Creates a PlayerID from a numeric identifier.
     * 
     * @param numericId The numeric player identifier
     */
    public PlayerID(long numericId) {
        this.id = String.valueOf(numericId);
        this.numericId = numericId;
    }

    /**
     * Creates a unique auto-generated PlayerID.
     * 
     * @return A new PlayerID with a unique identifier
     */
    public static PlayerID createUnique() {
        return new PlayerID(idCounter.incrementAndGet());
    }

    /**
     * Creates a PlayerID from an existing PlayerID (for type conversion).
     * 
     * @param other The PlayerID to copy
     * @return A new PlayerID with the same identifier
     */
    public static PlayerID from(PlayerID other) {
        return new PlayerID(other.id);
    }

    /**
     * Gets the string representation of this player ID.
     * 
     * @return The player ID string
     */
    public String getId() {
        return id;
    }

    /**
     * Gets the numeric representation of this player ID, if available.
     * 
     * @return The numeric ID, or 0 if created from a string
     */
    public long getNumericId() {
        return numericId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PlayerID playerID = (PlayerID) o;
        return Objects.equals(id, playerID.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "PlayerID{" + id + "}";
    }
}
