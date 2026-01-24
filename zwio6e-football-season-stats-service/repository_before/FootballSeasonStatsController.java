package com.example.gamestats;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
public class FootballSeasonStatsController {

    @GetMapping("/api/football/season/stats")
    public Map<String, Object> getSeasonStats(
            @RequestParam String teamName,
            @RequestParam int seasonYear) {

        // Simulate slow configuration lookup
        try {
            Thread.sleep(1500); // BAD: blocking thread
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("team", teamName);
        response.put("season", seasonYear);

        List<Map<String, Object>> matches = new ArrayList<>();

        // Simulate loading match data one by one (N+1 problem)
        for (int i = 1; i <= 38; i++) {
            try {
                Thread.sleep(100); // BAD: repeated DB latency
            } catch (InterruptedException e) {
                e.printStackTrace();
            }

            Map<String, Object> match = new HashMap<>();
            match.put("matchDay", i);
            match.put("goalsFor", new Random().nextInt(4));
            match.put("goalsAgainst", new Random().nextInt(4));
            match.put("shots", new Random().nextInt(20));
            match.put("fouls", new Random().nextInt(18));
            matches.add(match);
        }

        // Inefficient aggregation logic
        int totalGoals = 0;
        int totalFouls = 0;
        for (Map<String, Object> match : matches) {
            for (int j = 0; j < 10_000; j++) { // unnecessary repetition
                totalGoals += (int) match.get("goalsFor");
                totalFouls += (int) match.get("fouls");
            }
        }

        // Very inefficient sorting
        matches.sort((a, b) -> {
            try {
                Thread.sleep(50); // BAD: slow comparator
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            return ((int) b.get("goalsFor")) - ((int) a.get("goalsFor"));
        });

        response.put("matchesPlayed", matches.size());
        response.put("totalGoalsScored", totalGoals);
        response.put("totalFoulsCommitted", totalFouls);
        response.put("matchStats", matches);

        return response;
    }
}
