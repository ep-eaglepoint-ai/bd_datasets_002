class GraphBefore:
    def __init__(self):
        self.nodes = {}
        # weights map not initialized - this is the bug
    
    def add_edge(self, from_node, to_node, weight):
        if from_node not in self.nodes:
            self.nodes[from_node] = []
        self.nodes[from_node].append(to_node)
        # This will fail because weights is not initialized
        key = f"{from_node}-{to_node}"
        if not hasattr(self, 'weights'):
            self.weights = {}
        self.weights[key] = weight
        return self
    
    def bfs(self, start):
        visited = None  # Not initialized - this is the bug (like nil in Go)
        result = []
        queue = [start]
        
        # Infinite loop bug: len(queue) >= 0 is always true
        while len(queue) >= 0:
            if not queue:
                break
            current = queue[0]
            queue = queue[1:]
            
            # Bug: visited is None, so this will raise AttributeError
            if visited is not None and current in visited and visited.get(current):
                continue
            result.append(current)
            if visited is None:
                visited = {}
            visited[current] = True
            
            # Out of bounds bug: i <= len(...) should be i < len(...)
            if current in self.nodes:
                neighbors = self.nodes[current]
                for i in range(len(neighbors) + 1):  # Bug: +1 causes IndexError
                    neighbor = neighbors[i]  # Will fail on last iteration
                    if visited is None or neighbor not in visited or not visited.get(neighbor):
                        queue.append(neighbor)
        
        return result
    
    def dfs(self, start, target):
        visited = {}
        path = []
        return self._dfs_helper(start, target, visited, path)
    
    def _dfs_helper(self, current, target, visited, path):
        visited[current] = True
        path = path + [current]
        
        if current == target:
            return path, True
        
        if current in self.nodes:
            for next_node in self.nodes[current]:
                # Bug: should check if NOT visited, but checks if visited
                if next_node in visited and visited[next_node]:
                    continue
                result_path, found = self._dfs_helper(next_node, target, visited, path)
                if found:
                    return result_path, True
        
        return None, False
    
    def find_shortest_path(self, start, end):
        visited = {}
        parent = {}
        queue = [start]
        visited[start] = True
        
        while queue:
            current = queue[0]
            queue = queue[1:]
            
            if current == end:
                break
            
            if current in self.nodes:
                for neighbor in self.nodes[current]:
                    # Bug: visited check is inverted - should be "if not visited"
                    if neighbor in visited and visited[neighbor]:
                        parent[neighbor] = current
                        visited[neighbor] = True
                        queue.append(neighbor)
        
        path = []
        node = end
        while node != start:
            if node not in parent:
                return []
            path = [node] + path
            node = parent[node]
        path = [start] + path
        return path
