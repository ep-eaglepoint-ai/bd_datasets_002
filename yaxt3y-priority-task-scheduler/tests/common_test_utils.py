import sys
import os
import importlib.util

def import_scheduler(path, module_name):
    spec = importlib.util.spec_from_file_location(module_name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BEFORE_PATH = os.path.join(BASE_DIR, "repository_before", "scheduler.py")
AFTER_PATH = os.path.join(BASE_DIR, "repository_after", "scheduler.py")

# Imports
scheduler_before = import_scheduler(BEFORE_PATH, "scheduler_before")
scheduler_after = import_scheduler(AFTER_PATH, "scheduler_after")

UnoptimizedScheduler = scheduler_before.UnoptimizedScheduler
OptimizedScheduler = scheduler_after.OptimizedScheduler
# Using compatible Task class from newer implementation.
TaskBefore = scheduler_before.Task
TaskAfter = scheduler_after.Task
