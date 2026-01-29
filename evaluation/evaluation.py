import subprocess
import sys
import os

def run_evaluation():
    print("🚀 Running JS-based Evaluation via Python Bridge...")
    
    # Run the JS evaluation script
    result = subprocess.run(['node', 'evaluation/evaluation.js'], shell=True)
    
    if result.returncode != 0:
        print("❌ Evaluation failed")
        sys.exit(1)
    
    print("\n✅ Evaluation complete")

if __name__ == "__main__":
    run_evaluation()
