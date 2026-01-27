package com.example.gamestats;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


@RestController
public class FootballSeasonStatsController {

    private final FootballSeasonStatsService service;

    public FootballSeasonStatsController(FootballSeasonStatsService service) {
        this.service = service;
    }

    @GetMapping("/api/football/season/stats")
    public SeasonStats getSeasonStats(
            @RequestParam String teamName,
            @RequestParam int seasonYear) {
        return service.getSeasonStats(teamName, seasonYear);
    }
}
