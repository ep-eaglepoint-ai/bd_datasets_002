package com.example.gamestats;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FootballSeasonStatsTests {

    private FootballSeasonStatsServiceImpl service;
    private ObjectMapper objectMapper = new ObjectMapper();

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
        
        assertTrue(durationMs < 200, "Execution should be well under 200ms (actual: " + durationMs + "ms). Requirement: < 200ms.");
    }

    @Test
    void testDefensiveCopy() {
        SeasonStats stats = service.getSeasonStats("Test", 2023);
        List<MatchStats> matches = stats.getMatchStats();
        
        assertThrows(UnsupportedOperationException.class, () -> {
            matches.add(new MatchStats(1, 0, 0, 0, 0));
        }, "Should return an immutable list (defensive copy)");
    }

    @Test
    void testApiContract_ExactJsonStructure() {
        SeasonStats stats = new SeasonStats("TestTeam", 2023, 1, 2, 3, List.of());
        Map<String, Object> map = objectMapper.convertValue(stats, Map.class);

        // Verify exact keys
        assertTrue(map.containsKey("team"));
        assertTrue(map.containsKey("season"));
        assertTrue(map.containsKey("matchesPlayed"));
        assertTrue(map.containsKey("totalGoalsScored"));
        assertTrue(map.containsKey("totalFoulsCommitted"));
        assertTrue(map.containsKey("matchStats"));
        
        assertEquals(6, map.size(), "Response should contain exactly 6 keys");
    }

    @Test
    void testEdgeCases() {
        // Test null team name - should handle gracefully (allow null or empty)
        SeasonStats statsNull = service.getSeasonStats(null, 2023);
        assertNull(statsNull.getTeam());
        
        // Test invalid season (negative)
        SeasonStats statsNeg = service.getSeasonStats("Test", -1);
        assertEquals(-1, statsNeg.getSeason());
        
        // Verify 38 matches returned regardless of inputs
        assertEquals(38, statsNull.getMatchStats().size());
    }

    @Test
    void testLoadAndConcurrency() throws InterruptedException {
        int numberOfThreads = 50; 
        int requestsPerThread = 100; // Total 5000 requests
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch latch = new CountDownLatch(numberOfThreads);
        AtomicInteger failures = new AtomicInteger(0);
        
        long startGlobal = System.nanoTime();
        
        for (int i = 0; i < numberOfThreads; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < requestsPerThread; j++) {
                        long start = System.nanoTime();
                        service.getSeasonStats("Concurrent", 2023);
                        long duration = (System.nanoTime() - start) / 1_000_000;
                        if (duration > 200) {
                            failures.incrementAndGet();
                        }
                    }
                } catch (Exception e) {
                    failures.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }
        
        boolean completed = latch.await(30, TimeUnit.SECONDS);
        long totalDurationMs = (System.nanoTime() - startGlobal) / 1_000_000;
        
        assertTrue(completed, "Load test timed out");
        assertEquals(0, failures.get(), "All requests should execute under 200ms");
        
        // Requests per minute calcs: (5000 / totalDurationMs) * 60000
        double throughput = (double)(numberOfThreads * requestsPerThread) / totalDurationMs * 1000 * 60;
        System.out.println("Throughput: " + throughput + " req/min");
        assertTrue(throughput > 1000, "Should handle thousands of requests per minute");
    }

    @Test
    void testController_DelegatesToService() {
        FootballSeasonStatsService mockService = mock(FootballSeasonStatsService.class);
        FootballSeasonStatsController controller = new FootballSeasonStatsController(mockService);
        
        String team = "Lions";
        int season = 2022;
        SeasonStats expectedStats = new SeasonStats(team, season, 38, 50, 40, Collections.emptyList());
        
        when(mockService.getSeasonStats(team, season)).thenReturn(expectedStats);
        
        SeasonStats result = controller.getSeasonStats(team, season);
        
        assertEquals(expectedStats, result);
        verify(mockService).getSeasonStats(team, season);
    }

    @Test
    void testArchitecture() {
        // Check Controller Separation
        Field[] controllerFields = FootballSeasonStatsController.class.getDeclaredFields();
        boolean hasServiceDependency = false;
        for (Field field : controllerFields) {
            if (FootballSeasonStatsService.class.isAssignableFrom(field.getType())) {
                hasServiceDependency = true;
                break;
            }
        }
        assertTrue(hasServiceDependency, "Controller should depend on Service interface");
        
        // Check Immutability preference (Fields in DTOs should be final)
        Field[] statsFields = SeasonStats.class.getDeclaredFields();
        for (Field field : statsFields) {
            assertTrue(Modifier.isFinal(field.getModifiers()), "SeasonStats fields should be final: " + field.getName());
        }
        
        // Check MatchStats fields
        Field[] matchFields = MatchStats.class.getDeclaredFields();
        for (Field field : matchFields) {
            assertTrue(Modifier.isFinal(field.getModifiers()), "MatchStats fields should be final: " + field.getName());
        }
        
        // ServiceImpl should implement Service
        assertTrue(FootballSeasonStatsService.class.isAssignableFrom(FootballSeasonStatsServiceImpl.class), "ServiceImpl must implement interface");
    }
}
