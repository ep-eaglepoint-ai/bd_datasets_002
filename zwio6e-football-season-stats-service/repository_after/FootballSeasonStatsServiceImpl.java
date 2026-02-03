package com.example.gamestats;

import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;


@Service
public class FootballSeasonStatsServiceImpl implements FootballSeasonStatsService {

    private static final int MATCHES_IN_SEASON = 38;
    private static final int MAX_GOALS = 4;
    private static final int MAX_SHOTS = 20;
    private static final int MAX_FOULS = 18;

    @Override
    public SeasonStats getSeasonStats(String teamName, int seasonYear) {
        List<MatchStats> matches = new ArrayList<>(MATCHES_IN_SEASON);
        int totalGoals = 0;
        int totalFouls = 0;

        for (int i = 1; i <= MATCHES_IN_SEASON; i++) {
            int goalsFor = ThreadLocalRandom.current().nextInt(MAX_GOALS);
            int goalsAgainst = ThreadLocalRandom.current().nextInt(MAX_GOALS);
            int shots = ThreadLocalRandom.current().nextInt(MAX_SHOTS);
            int fouls = ThreadLocalRandom.current().nextInt(MAX_FOULS);

            matches.add(new MatchStats(i, goalsFor, goalsAgainst, shots, fouls));

            totalGoals += goalsFor;
            totalFouls += fouls;
        }

        matches.sort(Comparator.comparingInt(MatchStats::getGoalsFor).reversed());

        return new SeasonStats(
                teamName,
                seasonYear,
                matches.size(),
                totalGoals,
                totalFouls,
                matches
        );
    }
}
