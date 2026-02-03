package com.example.gamestats;

import java.util.List;

public class SeasonStats {
    private final String team;
    private final int season;
    private final int matchesPlayed;
    private final int totalGoalsScored;
    private final int totalFoulsCommitted;
    private final List<MatchStats> matchStats;

    public SeasonStats(String team, int season, int matchesPlayed, int totalGoalsScored, int totalFoulsCommitted, List<MatchStats> matchStats) {
        this.team = team;
        this.season = season;
        this.matchesPlayed = matchesPlayed;
        this.totalGoalsScored = totalGoalsScored;
        this.totalFoulsCommitted = totalFoulsCommitted;
        this.matchStats = new java.util.ArrayList<>(matchStats);
    }

    public String getTeam() {
        return team;
    }

    public int getSeason() {
        return season;
    }

    public int getMatchesPlayed() {
        return matchesPlayed;
    }

    public int getTotalGoalsScored() {
        return totalGoalsScored;
    }

    public int getTotalFoulsCommitted() {
        return totalFoulsCommitted;
    }

    public List<MatchStats> getMatchStats() {
        return java.util.Collections.unmodifiableList(matchStats);
    }
}
