
import pytest
import re
import sys
from pathlib import Path

# Add paths to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent / "repository_before"))
sys.path.insert(0, str(Path(__file__).parent.parent / "repository_after"))

@pytest.fixture
def before_html():
    """Load HTML from before version"""
    try:
        # Read file directly - FIXED PATH
        with open('/app/repository_before/audio_recorder.py', 'r') as f:
            content = f.read()
        
        # Extract HTML content
        match = re.search(r'HTML_CONTENT = """(.*?)"""', content, re.DOTALL)
        if match:
            return match.group(1)
        else:
            pytest.skip("HTML_CONTENT not found in before version")
    except FileNotFoundError:
        pytest.skip("Before version file not found")

@pytest.fixture
def after_html():
    """Load HTML from after version"""
    try:
        # Read file directly - FIXED PATH
        with open('/app/repository_after/audio_recorder.py', 'r') as f:
            content = f.read()
        
        # Extract HTML content
        match = re.search(r'HTML_CONTENT = """(.*?)"""', content, re.DOTALL)
        if match:
            return match.group(1)
        else:
            pytest.skip("HTML_CONTENT not found in after version")
    except FileNotFoundError:
        pytest.skip("After version file not found")

@pytest.fixture
def extract_features():
    """Extract features from HTML using regex"""
    def _extractor(html):
        features = {
            'elements': re.findall(r'id=["\']([^"\']+)["\']', html),
            'functions': re.findall(r'function\s+(\w+)\s*\(', html),
            'features': {
                'playback': any(x in html for x in ['playbackSection', 'togglePlayPause', 'waveformCanvas']),
                'monitoring': any(x in html for x in ['levelMeter', 'audioContext', 'AnalyserNode']),
                'session': any(x in html for x in ['sessionRecordings', 'MAX_RECORDINGS', 'addToSession'])
            },
            'constants': re.findall(r'const\s+(\w+)\s*=', html),
            'stats': {
                'lines': html.count('\n'),
                'size': len(html)
            }
        }
        return features
    return _extractor

