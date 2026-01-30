from typing import List


class GridHeatmapSolver:
    def __init__(self, grid_size, iterations):
        self.size = grid_size
        self.iterations = iterations    
        # Initialize grid with some heat in the center
        self.grid = []
        for _ in range(grid_size):
            row = []
            for _ in range(grid_size):
                row.append(0.0)
            self.grid.append(row)
        self.grid[grid_size//2][grid_size//2] = 1000.0
        # Pre-allocate double buffer to avoid deepcopy overhead
        self.buffer = []
        for _ in range(grid_size):
            row = []
            for _ in range(grid_size):
                row.append(0.0)
            self.buffer.append(row)

    def simulate_diffusion(self) -> List[List[float]]:
        # Handle edge case: grid too small to have neighbors
        if self.size <= 1:
            return self.grid
        
        for _ in range(self.iterations):
            # Read from self.grid, write to self.buffer
            current = self.grid
            next_grid = self.buffer
            
            # Process interior cells (always 4 neighbors) - fastest path
            if self.size > 2:
                for r in range(1, self.size - 1):
                    for c in range(1, self.size - 1):
                        # Inline neighbor calculation: up, down, left, right
                        neighbor_sum = (
                            current[r - 1][c] +  # up
                            current[r + 1][c] +  # down
                            current[r][c - 1] +  # left
                            current[r][c + 1]    # right
                        )
                        avg_temp = neighbor_sum / 4.0
                        next_grid[r][c] = (current[r][c] + avg_temp) / 2.0
            
            # Process top and bottom edges (excluding corners)
            if self.size > 1:
                # Top edge (row 0, columns 1 to size-2)
                if self.size > 2:
                    for c in range(1, self.size - 1):
                        neighbor_sum = (
                            current[1][c] +  # down
                            current[0][c - 1] +  # left
                            current[0][c + 1]   # right
                        )
                        avg_temp = neighbor_sum / 3.0
                        next_grid[0][c] = (current[0][c] + avg_temp) / 2.0
                
                # Bottom edge (row size-1, columns 1 to size-2)
                if self.size > 2:
                    for c in range(1, self.size - 1):
                        neighbor_sum = (
                            current[self.size - 2][c] +  # up
                            current[self.size - 1][c - 1] +  # left
                            current[self.size - 1][c + 1]   # right
                        )
                        avg_temp = neighbor_sum / 3.0
                        next_grid[self.size - 1][c] = (current[self.size - 1][c] + avg_temp) / 2.0
                
                # Left edge (column 0, rows 1 to size-2)
                if self.size > 2:
                    for r in range(1, self.size - 1):
                        neighbor_sum = (
                            current[r - 1][0] +  # up
                            current[r + 1][0] +  # down
                            current[r][1]       # right
                        )
                        avg_temp = neighbor_sum / 3.0
                        next_grid[r][0] = (current[r][0] + avg_temp) / 2.0
                
                # Right edge (column size-1, rows 1 to size-2)
                if self.size > 2:
                    for r in range(1, self.size - 1):
                        neighbor_sum = (
                            current[r - 1][self.size - 1] +  # up
                            current[r + 1][self.size - 1] +  # down
                            current[r][self.size - 2]       # left
                        )
                        avg_temp = neighbor_sum / 3.0
                        next_grid[r][self.size - 1] = (current[r][self.size - 1] + avg_temp) / 2.0
                
                # Process corners (2 neighbors each)
                # Top-left corner (0, 0)
                if self.size > 1:
                    neighbor_sum = current[1][0] + current[0][1]  # down, right
                    avg_temp = neighbor_sum / 2.0
                    next_grid[0][0] = (current[0][0] + avg_temp) / 2.0
                
                # Top-right corner (0, size-1)
                if self.size > 1:
                    neighbor_sum = current[1][self.size - 1] + current[0][self.size - 2]  # down, left
                    avg_temp = neighbor_sum / 2.0
                    next_grid[0][self.size - 1] = (current[0][self.size - 1] + avg_temp) / 2.0
                
                # Bottom-left corner (size-1, 0)
                if self.size > 1:
                    neighbor_sum = current[self.size - 2][0] + current[self.size - 1][1]  # up, right
                    avg_temp = neighbor_sum / 2.0
                    next_grid[self.size - 1][0] = (current[self.size - 1][0] + avg_temp) / 2.0
                
                # Bottom-right corner (size-1, size-1)
                if self.size > 1:
                    neighbor_sum = current[self.size - 2][self.size - 1] + current[self.size - 1][self.size - 2]  # up, left
                    avg_temp = neighbor_sum / 2.0
                    next_grid[self.size - 1][self.size - 1] = (current[self.size - 1][self.size - 1] + avg_temp) / 2.0
            
            # Swap buffers for next iteration
            self.grid, self.buffer = next_grid, current
            
        return self.grid

