import asyncio
import time
import json
import os
import sys
from datetime import datetime, timezone
import pytest

# Add current directory to path so we can import repository_after
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from repository_after import Event, EventBus, UserCreatedEvent

async def run_benchmark():
    bus = EventBus()
    count = 10000
    received = 0
    
    async def handler(event: Event):
        nonlocal received
        received += 1

    bus.subscribe(Event, handler)
    
    start_time = time.perf_counter()
    tasks = [bus.publish_async(Event()) for _ in range(count)]
    await asyncio.gather(*tasks)
    end_time = time.perf_counter()
    
    duration = end_time - start_time
    throughput = count / duration
    latency_ms = (duration / count) * 1000
    
    return {
        "throughput": throughput,
        "latency_ms": latency_ms,
        "total_events": count,
        "total_duration": duration
    }

import subprocess

def run_tests():
    # Run pytest as a subprocess to avoid issues with running loop
    result = subprocess.run([sys.executable, "-m", "pytest", "tests/test_solution.py"])
    return result.returncode == 0

async def main():
    print("Starting evaluation...")
    
    test_success = run_tests()
    print(f"Tests passed: {test_success}")
    
    print("Running benchmark...")
    bench_results = await run_benchmark()
    print(f"Throughput: {bench_results['throughput']:.2f} events/sec")
    print(f"Latency: {bench_results['latency_ms']:.4f} ms/event")
    
    # Check if requirements met
    latency_requirement = bench_results['latency_ms'] < 1.0
    throughput_requirement = bench_results['throughput'] > 10000
    
    evaluation_report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "test_results": {
            "success": test_success
        },
        "performance_metrics": bench_results,
        "requirements_met": {
            "latency_under_1ms": latency_requirement,
            "throughput_over_10k": throughput_requirement,
            "all_tests_passed": test_success
        }
    }
    
    # Generate timestamped report directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_dir = f"evaluation/reports/{timestamp}"
    os.makedirs(report_dir, exist_ok=True)
    
    report_path = f"{report_dir}/report.json"
    with open(report_path, "w") as f:
        json.dump(evaluation_report, f, indent=4)
    
    # Also save as latest.json for easy access
    with open("evaluation/reports/latest.json", "w") as f:
        json.dump(evaluation_report, f, indent=4)
        
    print(f"Evaluation complete. Report saved to {report_path}")

if __name__ == "__main__":
    asyncio.run(main())
