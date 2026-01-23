import copy
import time
from datetime import datetime, timedelta


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


class UnoptimizedScheduler:
    def __init__(self, tasks, available_resources):
        self.tasks = tasks
        self.available_resources = available_resources
        self.schedule = []
        self.execution_log = ""
    
    def find_task_by_id(self, task_id):
        for task in self.tasks:
            if task.task_id == task_id:
                return task
        return None
    
    def get_all_dependencies_recursive(self, task_id, visited=None):

        if visited is None:
            visited = []
        
        task = self.find_task_by_id(task_id)
        if task is None:
            return []
        
        all_deps = []
        for dep_id in task.dependencies:
            if dep_id not in visited:
                visited.append(dep_id)
                all_deps.append(dep_id)
                sub_deps = self.get_all_dependencies_recursive(dep_id, visited)
                for sd in sub_deps:
                    if sd not in all_deps:
                        all_deps.append(sd)
        
        return all_deps
    
    def check_circular_dependencies(self):
        has_cycle = False
        
        for task in self.tasks:
            for other_task in self.tasks:
                if task.task_id != other_task.task_id:
                    deps_of_task = self.get_all_dependencies_recursive(task.task_id, [])
                    deps_of_other = self.get_all_dependencies_recursive(other_task.task_id, [])
                    
                    if task.task_id in deps_of_other and other_task.task_id in deps_of_task:
                        has_cycle = True
                        self.execution_log = self.execution_log + "Cycle detected between " + str(task.task_id) + " and " + str(other_task.task_id) + "\n"
        
        return has_cycle
    
    def are_dependencies_complete(self, task):
        for dep_id in task.dependencies:
            dep_task = self.find_task_by_id(dep_id)
            if dep_task is None:
                continue
            if dep_task.status != "completed":
                return False
        return True
    
    def get_available_tasks(self):
        available = []
        for task in self.tasks:
            if task.status == "pending":
                if self.are_dependencies_complete(task):
                    resources_available = True
                    for resource, amount in task.resources_needed.items():
                        if resource not in self.available_resources:
                            resources_available = False
                        elif self.available_resources[resource] < amount:
                            resources_available = False
                    
                    if resources_available:
                        available.append(task)
        
        return available
    
    def sort_by_priority(self, tasks):
        tasks_copy = []
        for t in tasks:
            tasks_copy.append(t)
        
        n = len(tasks_copy)
        for i in range(n):
            for j in range(0, n - i - 1):
                if tasks_copy[j].priority < tasks_copy[j + 1].priority:
                    temp = tasks_copy[j]
                    tasks_copy[j] = tasks_copy[j + 1]
                    tasks_copy[j + 1] = temp
        
        return tasks_copy
    
    def sort_by_deadline(self, tasks):
        tasks_copy = []
        for t in tasks:
            tasks_copy.append(t)
        
        n = len(tasks_copy)
        for i in range(n):
            for j in range(0, n - i - 1):
                if tasks_copy[j].deadline > tasks_copy[j + 1].deadline:
                    temp = tasks_copy[j]
                    tasks_copy[j] = tasks_copy[j + 1]
                    tasks_copy[j + 1] = temp
        
        return tasks_copy
    
    def calculate_priority_score(self, task, current_time):
        score = 0
        
        score = score + task.priority * 10
        
        time_to_deadline = (task.deadline - current_time).total_seconds()
        if time_to_deadline < 3600:
            score = score + 100
        elif time_to_deadline < 7200:
            score = score + 50
        elif time_to_deadline < 14400:
            score = score + 25
        
        all_deps = self.get_all_dependencies_recursive(task.task_id, [])
        completed_deps = 0
        for dep_id in all_deps:
            dep_task = self.find_task_by_id(dep_id)
            if dep_task and dep_task.status == "completed":
                completed_deps = completed_deps + 1
        
        if len(all_deps) > 0:
            score = score + (completed_deps / len(all_deps)) * 20
        
        total_resources_needed = 0
        for resource, amount in task.resources_needed.items():
            total_resources_needed = total_resources_needed + amount
        
        total_available = 0
        for resource, amount in self.available_resources.items():
            total_available = total_available + amount
        
        if total_available > 0:
            score = score + (1 - total_resources_needed / total_available) * 10
        
        return score
    
    def get_tasks_waiting_for(self, task_id):
        waiting = []
        for task in self.tasks:
            if task.status == "pending":
                for dep_id in task.dependencies:
                    if dep_id == task_id:
                        waiting.append(task)
                        break
        return waiting
    
    def calculate_critical_path(self):
        max_path_length = 0
        critical_path = []
        
        for start_task in self.tasks:
            paths = self.build_all_paths(start_task.task_id, [])
            
            for path in paths:
                path_length = 0
                for task_id in path:
                    task = self.find_task_by_id(task_id)
                    if task:
                        path_length = path_length + task.duration
                
                if path_length > max_path_length:
                    max_path_length = path_length
                    critical_path = []
                    for tid in path:
                        critical_path.append(tid)
        
        return critical_path, max_path_length
    
    def build_all_paths(self, task_id, current_path):
        new_path = []
        for p in current_path:
            new_path.append(p)
        new_path.append(task_id)
        
        waiting_tasks = self.get_tasks_waiting_for(task_id)
        
        if len(waiting_tasks) == 0:
            return [new_path]
        
        all_paths = []
        for waiting_task in waiting_tasks:
            sub_paths = self.build_all_paths(waiting_task.task_id, new_path)
            for sp in sub_paths:
                all_paths.append(sp)
        
        return all_paths
    
    def allocate_resources(self, task):
        for resource, amount in task.resources_needed.items():
            if resource in self.available_resources:
                self.available_resources[resource] = self.available_resources[resource] - amount
    
    def release_resources(self, task):
        for resource, amount in task.resources_needed.items():
            if resource in self.available_resources:
                self.available_resources[resource] = self.available_resources[resource] + amount
    
    def execute_task(self, task, current_time):
        task.start_time = current_time
        task.end_time = current_time + timedelta(minutes=task.duration)
        task.status = "completed"
        
        self.execution_log = self.execution_log + "Executed task " + task.name + " at " + str(current_time) + "\n"
        
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
        iterations = 0
        max_iterations = len(self.tasks) * len(self.tasks) * 10
        
        if self.check_circular_dependencies():
            self.execution_log = self.execution_log + "Cannot schedule due to circular dependencies\n"
            return None
        
        while True:
            iterations = iterations + 1
            if iterations > max_iterations:
                self.execution_log = self.execution_log + "Max iterations reached\n"
                break
            
            all_complete = True
            for task in self.tasks:
                if task.status != "completed":
                    all_complete = False
                    break
            
            if all_complete:
                break
            
            available_tasks = self.get_available_tasks()
            
            if len(available_tasks) == 0:
                current_time = current_time + timedelta(minutes=1)
                continue
            
            scored_tasks = []
            for task in available_tasks:
                score = self.calculate_priority_score(task, current_time)
                scored_tasks.append((task, score))
            
            n = len(scored_tasks)
            for i in range(n):
                for j in range(0, n - i - 1):
                    if scored_tasks[j][1] < scored_tasks[j + 1][1]:
                        temp = scored_tasks[j]
                        scored_tasks[j] = scored_tasks[j + 1]
                        scored_tasks[j + 1] = temp
            
            best_task = scored_tasks[0][0]
            self.allocate_resources(best_task)
            current_time = self.execute_task(best_task, current_time)
            self.release_resources(best_task)
        
        return self.schedule
    
    def calculate_metrics(self):
        total_wait_time = 0
        total_turnaround = 0
        missed_deadlines = 0
        total_idle_time = 0
        
        schedule_copy = []
        for entry in self.schedule:
            schedule_copy.append(entry)
        
        n = len(schedule_copy)
        for i in range(n):
            for j in range(0, n - i - 1):
                if schedule_copy[j]["start_time"] > schedule_copy[j + 1]["start_time"]:
                    temp = schedule_copy[j]
                    schedule_copy[j] = schedule_copy[j + 1]
                    schedule_copy[j + 1] = temp
        
        for i in range(len(schedule_copy)):
            entry = schedule_copy[i]
            task = self.find_task_by_id(entry["task_id"])
            
            if task:
                if task.end_time and task.end_time > task.deadline:
                    missed_deadlines = missed_deadlines + 1
                
                for dep_id in task.dependencies:
                    dep_task = self.find_task_by_id(dep_id)
                    if dep_task and dep_task.end_time:
                        wait = (task.start_time - dep_task.end_time).total_seconds() / 60
                        if wait > 0:
                            total_wait_time = total_wait_time + wait
        
        for i in range(1, len(schedule_copy)):
            prev_end = schedule_copy[i - 1]["end_time"]
            curr_start = schedule_copy[i]["start_time"]
            if curr_start > prev_end:
                total_idle_time = total_idle_time + 1
        
        metrics = {
            "total_tasks": len(self.tasks),
            "completed_tasks": len(self.schedule),
            "missed_deadlines": missed_deadlines,
            "total_wait_time_minutes": total_wait_time,
            "estimated_idle_periods": total_idle_time
        }
        
        return metrics
    
    def generate_report(self):
        report = ""
        report = report + "=" * 50 + "\n"
        report = report + "SCHEDULING REPORT\n"
        report = report + "=" * 50 + "\n\n"
        
        report = report + "SCHEDULED TASKS:\n"
        report = report + "-" * 30 + "\n"
        
        for entry in self.schedule:
            report = report + "Task: " + entry["task_name"] + "\n"
            report = report + "  Start: " + entry["start_time"] + "\n"
            report = report + "  End: " + entry["end_time"] + "\n"
            report = report + "  Duration: " + str(entry["duration"]) + " minutes\n"
            report = report + "\n"
        
        metrics = self.calculate_metrics()
        
        report = report + "METRICS:\n"
        report = report + "-" * 30 + "\n"
        for key, value in metrics.items():
            report = report + key + ": " + str(value) + "\n"
        
        report = report + "\nEXECUTION LOG:\n"
        report = report + "-" * 30 + "\n"
        report = report + self.execution_log
        
        return report


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
    
    scheduler = UnoptimizedScheduler(tasks, available_resources)
    
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