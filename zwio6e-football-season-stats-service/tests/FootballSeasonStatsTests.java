package com.example.gamestats;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FootballSeasonStatsTests {

    // Service Tests
    private FootballSeasonStatsServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new FootballSeasonStatsServiceImpl();
    }

    @Test
    void testGetSeasonStats_ReturnsCorrectStructure() {
        String team = "Tigers";
        int season = 2023;
        SeasonStats stats = service.getSeasonStats(team, season);

        assertNotNull(stats);
        assertEquals(team, stats.getTeam());
        assertEquals(season, stats.getSeason());
        assertEquals(38, stats.getMatchesPlayed());
        assertEquals(38, stats.getMatchStats().size());
        
        // Verify aggregation
        int calculatedGoals = stats.getMatchStats().stream().mapToInt(MatchStats::getGoalsFor).sum();
        int calculatedFouls = stats.getMatchStats().stream().mapToInt(MatchStats::getFouls).sum();
        
        assertEquals(calculatedGoals, stats.getTotalGoalsScored());
        assertEquals(calculatedFouls, stats.getTotalFoulsCommitted());
    }

    @Test
    void testGetSeasonStats_Sorting() {
        SeasonStats stats = service.getSeasonStats("Test", 2023);
        List<MatchStats> matches = stats.getMatchStats();
        
        for (int i = 0; i < matches.size() - 1; i++) {
            assertTrue(matches.get(i).getGoalsFor() >= matches.get(i+1).getGoalsFor(),
                    "Matches should be sorted by goalsFor descending");
        }
    }

    @Test
    void testGetSeasonStats_Performance() {
        long start = System.nanoTime();
        service.getSeasonStats("PerfTest", 2024);
        long durationMs = (System.nanoTime() - start) / 1_000_000;
        
        assertTrue(durationMs < 200, "Execution should be well under 200ms (actual: " + durationMs + "ms)");
    }

    // Controller Tests (Mocking Service)
    @Test
    void testController_DelegatesToService() {
        FootballSeasonStatsService mockService = mock(FootballSeasonStatsService.class);
        FootballSeasonStatsController controller = new FootballSeasonStatsController(mockService);
        
        String team = "Lions";
        int season = 2022;
        SeasonStats expectedStats = new SeasonStats(team, season, 0, 0, 0, List.of());
        
        when(mockService.getSeasonStats(team, season)).thenReturn(expectedStats);
        
        SeasonStats result = controller.getSeasonStats(team, season);
        
        assertEquals(expectedStats, result);
        verify(mockService).getSeasonStats(team, season);
    }
}
