import copy
import time
import heapq
import collections
from datetime import datetime, timedelta
import io

class Task:
    def __init__(self, task_id, name, priority, duration, deadline, dependencies, resources_needed):
        self.task_id = task_id
        self.name = name
        self.priority = priority
        self.duration = duration
        self.deadline = deadline
        self.dependencies = dependencies
        self.resources_needed = resources_needed
        self.start_time = None
        self.end_time = None
        self.status = "pending"

    def __repr__(self):
        return f"<Task {self.task_id}: {self.name}>"

class OptimizedScheduler:
    def __init__(self, tasks, available_resources):
        self.tasks = tasks
        self.available_resources = available_resources.copy()
        self.schedule = []
        self.execution_log = []
        
        self.task_map = {t.task_id: t for t in tasks}
        
        self.dependents = collections.defaultdict(list)
        for t in tasks:
            for dep_id in t.dependencies:
                if dep_id in self.task_map:
                    self.dependents[dep_id].append(t.task_id)

    def find_task_by_id(self, task_id):
        return self.task_map.get(task_id)

    def check_circular_dependencies(self):
        in_degree = {t.task_id: 0 for t in self.tasks}
        for t in self.tasks:
            for dep_id in t.dependencies:
                if dep_id in in_degree:
                    in_degree[t.task_id] += 1
        
        queue = collections.deque([tid for tid, deg in in_degree.items() if deg == 0])
        visited_count = 0
        
        while queue:
            node_id = queue.popleft()
            visited_count += 1
            
            for distinct_dependent in self.dependents[node_id]:
                in_degree[distinct_dependent] -= 1
                if in_degree[distinct_dependent] == 0:
                    queue.append(distinct_dependent)
                    
        has_cycle = visited_count != len(self.tasks)
        if has_cycle:
            self.execution_log.append("Cycle detected in dependency graph")
            
        return has_cycle

    def calculate_critical_path(self):
        in_degree = {t.task_id: 0 for t in self.tasks}
        for t in self.tasks:
            for dep_id in t.dependencies:
                if dep_id in in_degree:
                    in_degree[t.task_id] += 1
                    
        queue = collections.deque([tid for tid, deg in in_degree.items() if deg == 0])
        topo_order = []
        while queue:
            u = queue.popleft()
            topo_order.append(u)
            for v in self.dependents[u]:
                in_degree[v] -= 1
                if in_degree[v] == 0:
                    queue.append(v)
        
        if len(topo_order) != len(self.tasks):
            return [], 0
            
        max_dist = {tid: 0 for tid in self.task_map}
        predecessor = {tid: None for tid in self.task_map}
        
        for tid in self.task_map:
            max_dist[tid] = self.task_map[tid].duration
            
        overall_max_len = 0
        end_node = None
        
        for tid in topo_order:
            task = self.task_map[tid]
            current_max_prev = 0
            best_pred = None
            
            for dep_id in task.dependencies:
                if dep_id in max_dist:
                    if max_dist[dep_id] > current_max_prev:
                        current_max_prev = max_dist[dep_id]
                        best_pred = dep_id
            
            if best_pred is not None:
                max_dist[tid] += current_max_prev
                predecessor[tid] = best_pred
            
            if max_dist[tid] > overall_max_len:
                overall_max_len = max_dist[tid]
                end_node = tid
                
        path = []
        curr = end_node
        while curr is not None:
            path.append(curr)
            curr = predecessor[curr]
            
        return list(reversed(path)), overall_max_len

    def execute_task(self, task, current_time):
        task.start_time = current_time
        task.end_time = current_time + timedelta(minutes=task.duration)
        task.status = "completed"
        
        self.execution_log.append(f"Executed task {task.name} at {current_time}")
        
        schedule_entry = {
            "task_id": task.task_id,
            "task_name": task.name,
            "start_time": str(current_time),
            "end_time": str(task.end_time),
            "duration": task.duration
        }
        self.schedule.append(schedule_entry)
        
        return task.end_time

    def generate_schedule(self, start_time):
        current_time = start_time
        
        if self.check_circular_dependencies():
            self.execution_log.append("Cannot schedule due to circular dependencies")
            return None

        pending_dependency_count = {t.task_id: 0 for t in self.tasks}
        for t in self.tasks:
            count = 0
            for dep_id in t.dependencies:
                if dep_id in self.task_map:
                    count += 1
            pending_dependency_count[t.task_id] = count
            
        ready_heap = []
        
        for t in self.tasks:
            if pending_dependency_count[t.task_id] == 0:
                heapq.heappush(ready_heap, (-t.priority, t.deadline, t.task_id))
                
        running_tasks = []
        completed_count = 0
        n_tasks = len(self.tasks)
         
        while completed_count < n_tasks:
            if not ready_heap and running_tasks:
                 next_end, finished_tid = heapq.heappop(running_tasks)
                 current_time = max(current_time, next_end)
                 heapq.heappush(running_tasks, (next_end, finished_tid))
            
            while running_tasks and running_tasks[0][0] <= current_time:
                end_t, finished_tid = heapq.heappop(running_tasks)
                task = self.task_map[finished_tid]
                
                for res, amt in task.resources_needed.items():
                    if res in self.available_resources:
                        self.available_resources[res] += amt
                        
                completed_count += 1
                
                for dep_tid in self.dependents[finished_tid]:
                    pending_dependency_count[dep_tid] -= 1
                    if pending_dependency_count[dep_tid] == 0:
                        dep_task = self.task_map[dep_tid]
                        heapq.heappush(ready_heap, (-dep_task.priority, dep_task.deadline, dep_task.task_id))

            non_executable = []
            matched_task = None
            
            while ready_heap:
                prio, deadline, tid = heapq.heappop(ready_heap)
                task = self.task_map[tid]
                
                can_run = True
                for res, amt in task.resources_needed.items():
                    if self.available_resources.get(res, 0) < amt:
                        can_run = False
                        break
                
                if can_run:
                    matched_task = task
                    break
                else:
                    non_executable.append((prio, deadline, tid))
            
            for item in non_executable:
                heapq.heappush(ready_heap, item)
                
            if matched_task:
                for res, amt in matched_task.resources_needed.items():
                    if res in self.available_resources:
                         self.available_resources[res] -= amt
                
                self.execute_task(matched_task, current_time)
                heapq.heappush(running_tasks, (matched_task.end_time, matched_task.task_id))
            else:
                 if running_tasks:
                     next_time = running_tasks[0][0]
                     if next_time > current_time:
                         current_time = next_time
                     else:
                         if not running_tasks and ready_heap:
                             self.execution_log.append("Resource deadlock detected")
                             break
                         
                         current_time = next_time
                 else:
                     if completed_count < n_tasks:
                         pass
                     break
                     
        return self.schedule

    def calculate_metrics(self):
        total_wait_time = 0.0
        missed_deadlines = 0
        total_idle_time = 0
        
        sorted_schedule = sorted(self.schedule, key=lambda x: x["start_time"])
        
        for i, entry in enumerate(sorted_schedule):
            task = self.task_map[entry["task_id"]]
            
            if task.end_time and task.end_time > task.deadline:
                missed_deadlines += 1
            
            for dep_id in task.dependencies:
                dep_task = self.task_map.get(dep_id)
                if dep_task and dep_task.end_time:
                    wait = (task.start_time - dep_task.end_time).total_seconds() / 60
                    if wait > 0:
                        total_wait_time += wait
            
            if i > 0:
                prev_end = sorted_schedule[i-1]["end_time"]
                curr_start = sorted_schedule[i]["start_time"]
                if curr_start > prev_end:
                    total_idle_time += 1
                    
        metrics = {
            "total_tasks": len(self.tasks),
            "completed_tasks": len(self.schedule),
            "missed_deadlines": missed_deadlines,
            "total_wait_time_minutes": total_wait_time,
            "estimated_idle_periods": total_idle_time
        }
        return metrics

    def generate_report(self):
        parts = []
        parts.append("=" * 50 + "\n")
        parts.append("SCHEDULING REPORT\n")
        parts.append("=" * 50 + "\n\n")
        
        parts.append("SCHEDULED TASKS:\n")
        parts.append("-" * 30 + "\n")
        
        for entry in self.schedule:
            parts.append(f"Task: {entry['task_name']}\n")
            parts.append(f"  Start: {entry['start_time']}\n")
            parts.append(f"  End: {entry['end_time']}\n")
            parts.append(f"  Duration: {entry['duration']} minutes\n")
            parts.append("\n")
            
        metrics = self.calculate_metrics()
        
        parts.append("METRICS:\n")
        parts.append("-" * 30 + "\n")
        for key, value in metrics.items():
            parts.append(f"{key}: {value}\n")
            
        parts.append("\nEXECUTION LOG:\n")
        parts.append("-" * 30 + "\n")
        parts.append("\n".join(self.execution_log))
        if self.execution_log:
             parts.append("\n") 
        
        return "".join(parts)

def create_sample_tasks():
    base_time = datetime.now()
    tasks = [
        Task(1, "Data Collection", 5, 30, base_time + timedelta(hours=4), [], {"cpu": 2, "memory": 4}),
        Task(2, "Data Validation", 4, 20, base_time + timedelta(hours=5), [1], {"cpu": 1, "memory": 2}),
        Task(3, "Data Transformation", 5, 45, base_time + timedelta(hours=6), [2], {"cpu": 4, "memory": 8}),
        Task(4, "Feature Engineering", 3, 60, base_time + timedelta(hours=8), [3], {"cpu": 4, "memory": 16}),
        Task(5, "Model Training", 5, 120, base_time + timedelta(hours=12), [4], {"cpu": 8, "memory": 32}),
        Task(6, "Model Validation", 4, 30, base_time + timedelta(hours=14), [5], {"cpu": 4, "memory": 16}),
        Task(7, "Report Generation", 2, 15, base_time + timedelta(hours=15), [6], {"cpu": 1, "memory": 2}),
        Task(8, "Data Backup", 3, 25, base_time + timedelta(hours=6), [1], {"cpu": 1, "memory": 4}),
        Task(9, "Log Analysis", 2, 20, base_time + timedelta(hours=10), [2, 8], {"cpu": 2, "memory": 4}),
        Task(10, "System Monitoring", 1, 10, base_time + timedelta(hours=16), [7, 9], {"cpu": 1, "memory": 1}),
    ]
    return tasks

def main():
    tasks = create_sample_tasks()
    available_resources = {"cpu": 16, "memory": 64}
    
    scheduler = OptimizedScheduler(tasks, available_resources)
    
    start_time = datetime.now()
    
    print("Starting scheduler...")
    schedule_start = time.time()
    
    schedule = scheduler.generate_schedule(start_time)
    
    schedule_end = time.time()
    print(f"Scheduling completed in {schedule_end - schedule_start:.4f} seconds")
    
    if schedule:
        critical_path, path_length = scheduler.calculate_critical_path()
        print(f"\nCritical path length: {path_length} minutes")
        print(f"Critical path: {critical_path}")
        
        report = scheduler.generate_report()
        print(report)

if __name__ == "__main__":
    main()

Scheduler = OptimizedScheduler