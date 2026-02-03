package com.example.gamestats;

public interface FootballSeasonStatsService {
    SeasonStats getSeasonStats(String teamName, int seasonYear);
}
