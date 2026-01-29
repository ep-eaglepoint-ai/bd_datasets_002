import subprocess
import os

def test_javascript_circuit_breaker():
    """
    Bridge test to run the JavaScript test suite from pytest.
    """
    # Use list format for better cross-platform reliability in Docker/Linux
    result = subprocess.run(['npm', 'test'], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
        
    assert result.returncode == 0
    assert "pass" in result.stdout.lower()
