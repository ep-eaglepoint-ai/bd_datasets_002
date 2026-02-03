package com.example.gamestats;

public class MatchStats {
    private final int matchDay;
    private final int goalsFor;
    private final int goalsAgainst;
    private final int shots;
    private final int fouls;

    public MatchStats(int matchDay, int goalsFor, int goalsAgainst, int shots, int fouls) {
        this.matchDay = matchDay;
        this.goalsFor = goalsFor;
        this.goalsAgainst = goalsAgainst;
        this.shots = shots;
        this.fouls = fouls;
    }

    public int getMatchDay() {
        return matchDay;
    }

    public int getGoalsFor() {
        return goalsFor;
    }

    public int getGoalsAgainst() {
        return goalsAgainst;
    }

    public int getShots() {
        return shots;
    }

    public int getFouls() {
        return fouls;
    }
}
