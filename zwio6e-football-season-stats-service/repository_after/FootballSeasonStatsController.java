package com.example.gamestats;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
public class FootballSeasonStatsController {

    private final FootballSeasonStatsService service;

    public FootballSeasonStatsController(FootballSeasonStatsService service) {
        this.service = service;
    }

    @GetMapping("/api/football/season/stats")
    public Map<String, Object> getSeasonStats(
            @RequestParam String teamName,
            @RequestParam int seasonYear) {
        SeasonStats stats = service.getSeasonStats(teamName, seasonYear);
        return toMap(stats);
    }

    private Map<String, Object> toMap(SeasonStats stats) {
        Map<String, Object> response = new HashMap<>();
        response.put("team", stats.getTeam());
        response.put("season", stats.getSeason());
        response.put("matchesPlayed", stats.getMatchesPlayed());
        response.put("totalGoalsScored", stats.getTotalGoalsScored());
        response.put("totalFoulsCommitted", stats.getTotalFoulsCommitted());
        response.put("matchStats", stats.getMatchStats().stream()
                .map(this::toMatchMap)
                .collect(Collectors.toList()));
        return response;
    }

    private Map<String, Object> toMatchMap(MatchStats match) {
        Map<String, Object> map = new HashMap<>();
        map.put("matchDay", match.getMatchDay());
        map.put("goalsFor", match.getGoalsFor());
        map.put("goalsAgainst", match.getGoalsAgainst());
        map.put("shots", match.getShots());
        map.put("fouls", match.getFouls());
        return map;
    }
}
