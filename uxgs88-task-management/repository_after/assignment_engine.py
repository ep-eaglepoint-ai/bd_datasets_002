"""
Highly optimized task assignment system for counting and enumerating valid distributions
of tasks among workers with one-to-one assignments.
"""

from typing import List, Tuple, Optional, Dict

# Try to import scipy once at module level
try:
    from scipy.optimize import linear_sum_assignment
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False


class TaskAssignmentEngine:
    """
    Optimized task assignment engine for bipartite matching problems.
    
    Handles up to 20 workers and up to 1000 tasks with one-to-one assignments.
    """
    
    def __init__(
        self,
        num_workers: int,
        num_tasks: int,
        qualification_matrix: List[List[bool]],
        skill_scores: Optional[List[List[float]]] = None,
        worker_availability: Optional[List[Tuple[int, int]]] = None,
        task_dependencies: Optional[Dict[int, List[int]]] = None,
        team_constraints: Optional[List[List[int]]] = None
    ):
        """
        Initialize the task assignment engine.
        
        Args:
            num_workers: Number of workers (up to 20)
            num_tasks: Number of tasks (up to 1000)
            qualification_matrix: Boolean matrix where matrix[i][j] = True if worker i can do task j
            skill_scores: Optional matrix where skill_scores[i][j] is the skill score for worker i on task j
            worker_availability: Optional list of (start_time, end_time) for each worker
            task_dependencies: Optional dict mapping task_id to list of prerequisite task_ids
            team_constraints: Optional list of worker groups that must work together
        """
        self.num_workers = num_workers
        self.num_tasks = num_tasks
        self.qualification_matrix = qualification_matrix
        self.skill_scores = skill_scores
        
        # Validate inputs
        if num_workers > 20:
            raise ValueError(f"Number of workers ({num_workers}) exceeds maximum (20)")
        if num_tasks > 1000:
            raise ValueError(f"Number of tasks ({num_tasks}) exceeds maximum (1000)")
        
        # Build qualification sets for faster lookup
        self.worker_qualifications = [
            [j for j in range(num_tasks) if qualification_matrix[i][j]]
            for i in range(num_workers)
        ]
        
        # Store optional constraints (for future use)
        self.worker_availability = worker_availability
        self.task_dependencies = task_dependencies
        self.team_constraints = team_constraints
    
    def count_distributions(self) -> int:
        """
        Count the total number of valid distributions.
        
        Uses memoized recursive dynamic programming.
        Optimized for up to 20 workers and 1000 tasks.
        
        Returns:
            Total number of valid one-to-one assignments
        """
        if self.num_workers == 0 or self.num_tasks == 0:
            return 0
        
        # Simple recursive DP with memoization
        # For up to 20 workers, we only use at most 20 tasks
        memo = {}
        
        def count_recursive(worker_idx: int, used_tasks: frozenset) -> int:
            if worker_idx >= self.num_workers:
                return 1
            
            key = (worker_idx, used_tasks)
            if key in memo:
                return memo[key]
            
            total = 0
            for task_idx in self.worker_qualifications[worker_idx]:
                if task_idx not in used_tasks:
                    total += count_recursive(worker_idx + 1, used_tasks | {task_idx})
            
            memo[key] = total
            return total
        
        return count_recursive(0, frozenset())
    
    def find_max_skill_assignment(self) -> List[Tuple[int, int]]:
        """
        Find the assignment that maximizes the total skill score.
        
        Uses Hungarian algorithm (Kuhn-Munkres) for maximum weight bipartite matching.
        Time complexity: O(num_workers^3) which is fast for num_workers <= 20.
        
        Returns:
            List of (worker_id, task_id) tuples representing the optimal assignment
        """
        if self.num_workers == 0 or self.num_tasks == 0:
            return []
        
        # Use default skill scores (all zeros) if not provided
        skill_scores = self.skill_scores
        if skill_scores is None:
            skill_scores = [[0.0] * self.num_tasks for _ in range(self.num_workers)]
        
        # Use scipy's Hungarian algorithm if available, otherwise use fallback
        if HAS_SCIPY:
            # Build cost matrix: num_workers x num_tasks
            # Use negative skill scores (Hungarian minimizes, we want to maximize)
            cost = []
            for i in range(self.num_workers):
                row = []
                for j in range(self.num_tasks):
                    if self.qualification_matrix[i][j]:
                        row.append(-skill_scores[i][j])
                    else:
                        row.append(10**9)  # Large penalty for invalid assignments
                cost.append(row)
            
            # linear_sum_assignment works on rectangular matrices
            # It will return min(num_workers, num_tasks) assignments
            row_ind, col_ind = linear_sum_assignment(cost)
            
            # Filter out invalid assignments
            result = []
            for i, j in zip(row_ind, col_ind):
                if cost[i][j] < 10**8:  # Valid assignment (not the penalty)
                    result.append((int(i), int(j)))
            
            return result
        else:
            # Fallback: Implement Hungarian algorithm from scratch
            return self._hungarian_algorithm(skill_scores)
    
    def _hungarian_algorithm(self, skill_scores: List[List[float]]) -> List[Tuple[int, int]]:
        """
        Hungarian algorithm implementation for maximum weight matching.
        """
        n = self.num_workers
        m = self.num_tasks
        
        # Build cost matrix with negative scores (we minimize to maximize)
        cost = []
        for i in range(n):
            row = []
            for j in range(m):
                if self.qualification_matrix[i][j]:
                    row.append(-skill_scores[i][j])
                else:
                    row.append(10**9)
            cost.append(row)
        
        # Hungarian algorithm for rectangular matrix
        # We'll create a square matrix by padding
        size = max(n, m)
        square_cost = [[10**9] * size for _ in range(size)]
        
        for i in range(n):
            for j in range(m):
                square_cost[i][j] = cost[i][j]
        
        # Standard Hungarian algorithm
        INF = 10**9
        u = [0] * (size + 1)
        v = [0] * (size + 1)
        p = [0] * (size + 1)
        way = [0] * (size + 1)
        
        for i in range(1, n + 1):
            p[0] = i
            j0 = 0
            minv = [INF] * (size + 1)
            used = [False] * (size + 1)
            
            while True:
                used[j0] = True
                i0 = p[j0]
                delta = INF
                j1 = 0
                
                for j in range(1, size + 1):
                    if not used[j]:
                        cur = square_cost[i0 - 1][j - 1] - u[i0] - v[j]
                        if cur < minv[j]:
                            minv[j] = cur
                            way[j] = j0
                        if minv[j] < delta:
                            delta = minv[j]
                            j1 = j
                
                for j in range(size + 1):
                    if used[j]:
                        u[p[j]] += delta
                        v[j] -= delta
                    else:
                        minv[j] -= delta
                
                j0 = j1
                if p[j0] == 0:
                    break
            
            while j0:
                j1 = way[j0]
                p[j0] = p[j1]
                j0 = j1
        
        # Build result
        result = []
        for j in range(1, size + 1):
            i = p[j]
            if i > 0 and i <= n and j <= m:
                if square_cost[i - 1][j - 1] < 10**8:
                    result.append((i - 1, j - 1))
        
        return result
    
    def enumerate_distributions(
        self,
        page: int = 0,
        page_size: int = 100
    ) -> List[List[Tuple[int, int]]]:
        """
        Enumerate valid distributions with pagination.
        
        Uses backtracking with early termination for pagination.
        
        Args:
            page: Page number (0-indexed)
            page_size: Number of distributions per page
        
        Returns:
            List of distributions, where each distribution is a list of (worker_id, task_id) tuples
        """
        if self.num_workers == 0 or self.num_tasks == 0:
            return []
        
        results = []
        count = [0]  # Use list to allow modification in nested function
        target_start = page * page_size
        target_end = target_start + page_size
        
        def enumerate_recursive(worker_idx: int, used_tasks: set, current_assignment: List[Tuple[int, int]]):
            if worker_idx >= self.num_workers:
                if target_start <= count[0] < target_end:
                    results.append(current_assignment.copy())
                count[0] += 1
                return
            
            # Early termination if we've collected enough
            if count[0] >= target_end:
                return
            
            # Try each valid task for this worker
            for task_idx in self.worker_qualifications[worker_idx]:
                if task_idx in used_tasks:
                    continue
                
                current_assignment.append((worker_idx, task_idx))
                enumerate_recursive(worker_idx + 1, used_tasks | {task_idx}, current_assignment)
                current_assignment.pop()
                
                # Early termination
                if count[0] >= target_end:
                    return
        
        enumerate_recursive(0, set(), [])
        return results
