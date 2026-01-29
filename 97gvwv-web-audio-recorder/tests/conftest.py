
import pytest
import re
import sys
from pathlib import Path

@pytest.fixture
def before_html():
    """Load HTML from BEFORE repository"""
    with open('/app/repository_before/audio_recorder.py', 'r') as f:
        content = f.read()
    
    match = re.search(r'HTML_CONTENT = """(.*?)"""', content, re.DOTALL)
    if not match:
        pytest.fail("No HTML content found in before version!")
    return match.group(1)

@pytest.fixture
def after_html():
    """Load HTML from AFTER repository"""
    with open('/app/repository_after/audio_recorder.py', 'r') as f:
        content = f.read()
    
    match = re.search(r'HTML_CONTENT = """(.*?)"""', content, re.DOTALL)
    if not match:
        pytest.fail("No HTML content found in after version!")
    return match.group(1)

@pytest.fixture
def extract_features():
    def _extractor(html):
        return {
            'features': {
                'playback': any(x in html for x in ['playbackSection', 'togglePlayPause', 'waveformCanvas']),
                'monitoring': any(x in html for x in ['levelMeter', 'audioContext', 'AnalyserNode']),
                'session': any(x in html for x in ['sessionRecordings', 'MAX_RECORDINGS', 'addToSession'])
            }
        }
    return _extractor
