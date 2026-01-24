class GraphAfter:
    def __init__(self):
        self.nodes = {}
        self.weights = {}  # Properly initialized
    
    def add_edge(self, from_node, to_node, weight):
        if self.nodes is None:
            self.nodes = {}
        if self.weights is None:
            self.weights = {}
        
        if from_node not in self.nodes:
            self.nodes[from_node] = []
        self.nodes[from_node].append(to_node)
        key = (from_node, to_node)  # Using tuple as key instead of string
        self.weights[key] = weight
        return self
    
    def bfs(self, start):
        if self.nodes is None:
            return []
        
        if start not in self.nodes:
            return []
        
        visited = {}
        result = []
        queue = [start]
        visited[start] = True
        
        # Fixed: len(queue) > 0 instead of >= 0
        while len(queue) > 0:
            current = queue[0]
            queue = queue[1:]
            
            result.append(current)
            
            if current in self.nodes:
                neighbors = self.nodes[current]
                for neighbor in neighbors:
                    if neighbor not in visited or not visited[neighbor]:
                        visited[neighbor] = True
                        queue.append(neighbor)
        
        return result
    
    def dfs(self, start, target):
        if self.nodes is None:
            return None, False
        
        if start not in self.nodes:
            return None, False
        
        visited = {}
        path = []
        return self._dfs_helper(start, target, visited, path)
    
    def _dfs_helper(self, current, target, visited, path):
        visited[current] = True
        path = path + [current]
        
        if current == target:
            # Fixed: return a copy of the path
            return list(path), True
        
        if current in self.nodes:
            neighbors = self.nodes[current]
            for next_node in neighbors:
                if next_node not in visited or not visited[next_node]:
                    result_path, found = self._dfs_helper(next_node, target, visited, path)
                    if found:
                        return result_path, True
        
        return None, False
    
    def find_shortest_path(self, start, end):
        if self.nodes is None:
            return []
        
        if start not in self.nodes:
            return []
        
        if start == end:
            return [start]
        
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
                neighbors = self.nodes[current]
                # Fixed: check if NOT visited
                for neighbor in neighbors:
                    if neighbor not in visited or not visited[neighbor]:
                        visited[neighbor] = True
                        parent[neighbor] = current
                        queue.append(neighbor)
        
        if end not in visited or not visited[end]:
            return []
        
        path = []
        node = end
        while node != start:
            if node not in parent:
                return []
            path = [node] + path
            node = parent[node]
        path = [start] + path
        return path
