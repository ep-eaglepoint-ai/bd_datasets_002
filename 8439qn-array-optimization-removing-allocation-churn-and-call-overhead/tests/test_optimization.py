import pytest
import time
import inspect
import importlib.util
import os
from typing import List

# works with PYTHONPATH set to repository_before or repository_after
from main import GridHeatmapSolver


class TestPerformanceOptimization:
    """Verify performance improvements: 10x-50x speedup, 500x500 grid in <2s"""
    
    def test_large_grid_completes_quickly(self):
        """500x500 grid should complete in under 2 seconds"""
        solver = GridHeatmapSolver(500, 10)
        
        start = time.time()
        result = solver.simulate_diffusion()
        elapsed = time.time() - start
        
        assert elapsed < 2.0, f"500x500 grid took {elapsed:.2f}s, expected < 2.0s"
        assert len(result) == 500
        assert all(len(row) == 500 for row in result)
    
    def test_performance_improvement_medium_grid(self):
        """Medium grid should complete quickly"""
        solver = GridHeatmapSolver(200, 20)
        
        start = time.time()
        result = solver.simulate_diffusion()
        elapsed = time.time() - start
        
        # Should complete in reasonable time (much faster than original)
        assert elapsed < 1.0, f"200x200 grid took {elapsed:.2f}s, expected < 1.0s"
        assert len(result) == 200
    
    def test_performance_improvement_small_grid(self):
        """Small grid should be very fast"""
        solver = GridHeatmapSolver(100, 50)
        
        start = time.time()
        result = solver.simulate_diffusion()
        elapsed = time.time() - start
        
        assert elapsed < 0.5, f"100x100 grid took {elapsed:.2f}s, expected < 0.5s"
        assert len(result) == 100


class TestCodeStructure:
    """Verify code structure: no deepcopy, no numpy, inlined logic, type hints"""
    
    def test_no_deepcopy_uses_double_buffer(self):
        """Verify copy.deepcopy is not used in simulate_diffusion"""
        # Read the source file
        source = inspect.getsource(GridHeatmapSolver.simulate_diffusion)
        
        # Check for copy.deepcopy usage
        assert 'copy.deepcopy' not in source, "Code should not use copy.deepcopy"
        assert 'deepcopy' not in source.lower(), "Code should not use deepcopy"
    
    def test_no_numpy_import(self):
        """Verify numpy is not imported"""
        # Check the module file by reading source directly
        # Try to get the source file path
        spec = importlib.util.find_spec('main')
        if spec and spec.origin:
            with open(spec.origin, 'r') as f:
                source = f.read()
        else:
            # Fallback: try to get source from imported module
            try:
                import main
                source = inspect.getsource(main)
            except (OSError, ImportError):
                # If all else fails, try to find main.py in PYTHONPATH
                pythonpath = os.environ.get('PYTHONPATH', '')
                if pythonpath:
                    main_path = os.path.join(pythonpath, 'main.py')
                    if os.path.exists(main_path):
                        with open(main_path, 'r') as f:
                            source = f.read()
                    else:
                        source = ""
                else:
                    source = ""
        
        # Check for numpy imports
        assert 'import numpy' not in source, "Code should not import numpy"
        assert 'from numpy' not in source, "Code should not import from numpy"
        assert 'import numpy as' not in source, "Code should not import numpy with alias"
    
    def test_neighbor_logic_inlined(self):
        """Verify get_neighbors is not called in simulate_diffusion"""
        source = inspect.getsource(GridHeatmapSolver.simulate_diffusion)
        
        # Check that get_neighbors is not called
        assert 'self.get_neighbors' not in source, "get_neighbors should be inlined, not called"
        assert '.get_neighbors(' not in source, "get_neighbors should be inlined, not called"
    
    def test_type_hints_present(self):
        """Verify type hints List[List[float]] are present"""
        sig = inspect.signature(GridHeatmapSolver.simulate_diffusion)
        
        # Check return type annotation
        return_annotation = sig.return_annotation
        assert return_annotation != inspect.Signature.empty, "simulate_diffusion should have return type hint"
        
        # Check if it's List[List[float]] or similar
        annotation_str = str(return_annotation)
        assert 'List' in annotation_str, f"Return type should include List, got {annotation_str}"
        assert 'float' in annotation_str, f"Return type should include float, got {annotation_str}"


class TestMemoryAllocation:
    
    def test_no_list_creation_in_hot_loop(self):
        """Verify no list creation (neighbors = []) in simulate_diffusion"""
        source = inspect.getsource(GridHeatmapSolver.simulate_diffusion)
        
        # Check for list creation with [] (e.g. neighbors = []) inside for-loops in simulate_diffusion
        lines = source.split('\n')
        in_loop = False
        for line in lines:
            stripped = line.strip()
            if 'for ' in stripped and 'in range' in stripped:
                in_loop = True
            elif stripped.startswith('if ') or stripped.startswith('def ') or stripped.startswith('class '):
                in_loop = False
            elif in_loop and '= []' in stripped and 'neighbors' in stripped.lower():
                pytest.fail("Found list creation in hot loop: " + stripped)
    
    def test_double_buffer_pattern_used(self):
        """Verify double buffer pattern is used (buffer attribute exists)"""
        solver = GridHeatmapSolver(10, 1)
        
        # Check that buffer attribute exists (double buffer pattern)
        assert hasattr(solver, 'buffer'), "GridHeatmapSolver should have buffer attribute for double buffering"
        assert isinstance(solver.buffer, list), "Buffer should be a list"
        assert len(solver.buffer) == solver.size, "Buffer should be same size as grid"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

