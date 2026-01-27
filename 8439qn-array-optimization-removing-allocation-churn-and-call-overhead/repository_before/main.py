import copy

class GridHeatmapSolver:
    def __init__(self, grid_size, iterations):
        self.size = grid_size
        self.iterations = iterations
        # Initialize grid with some heat in the center
        self.grid = [[0.0 for _ in range(grid_size)] for _ in range(grid_size)]
        self.grid[grid_size//2][grid_size//2] = 1000.0

    def get_neighbors(self, r, c, current_grid):
        neighbors = []
        # Logic to find up/down/left/right
        directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < self.size and 0 <= nc < self.size:
                neighbors.append(current_grid[nr][nc])
        return neighbors

    def simulate_diffusion(self):
        for _ in range(self.iterations):
            # Performance Killer 1: Deepcopying the entire grid every step
            new_grid = copy.deepcopy(self.grid)
            
            for r in range(self.size):
                for c in range(self.size):
                    # Performance Killer 2: Function call overhead inside nested loop
                    local_temps = self.get_neighbors(r, c, self.grid)
                    
                    if not local_temps:
                        continue
                    
                    # Simple diffusion math: average of neighbors
                    avg_temp = sum(local_temps) / len(local_temps)
                    
                    # Performance Killer 3: Redundant list access and writes
                    new_grid[r][c] = (self.grid[r][c] + avg_temp) / 2.0
            
            self.grid = new_grid
            
        return self.grid