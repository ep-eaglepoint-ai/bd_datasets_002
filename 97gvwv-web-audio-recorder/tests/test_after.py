
"""
Tests for the AFTER version (enhanced audio recorder with all features)
"""
import re
import os

class TestAfterVersion:
    """Test the enhanced audio recorder"""
    
    def test_file_exists(self):
        """Test that after version file exists"""
        assert os.path.exists('/app/repository_after/audio_recorder.py'), \
            "After version file not found"
        
    def test_all_features_present(self, after_html, extract_features):
        """Verify ALL three features are implemented in after version"""
        features = extract_features(after_html)

        assert features['features']['playback'], \
            "Feature 1 (Playback System) missing in after version"
        assert features['features']['monitoring'], \
            "Feature 2 (Live Monitoring) missing in after version"
        assert features['features']['session'], \
            "Feature 3 (Session Manager) missing in after version"
    
    def test_feature_1_playback_system(self, after_html):
        """Test Feature 1: Audio Playback System"""
        playback_elements = [
            'playbackSection', 'playPauseBtn', 'waveformCanvas',
            'seekContainer', 'volumeSlider', 'currentTime', 'totalTime'
        ]
        
        for element_id in playback_elements:
            assert f'id="{element_id}"' in after_html or element_id in after_html, \
                f"Playback element {element_id} missing in after version"
   
        playback_functions = [
            'showPlaybackControls', 'generateWaveform',
            'togglePlayPause', 'seekAudio', 'setVolume'
        ]
        
        for func in playback_functions:
            assert f'function {func}(' in after_html, \
                f"Playback function {func} missing in after version"
    
    def test_feature_2_live_monitoring(self, after_html):
        """Test Feature 2: Live Input Monitoring - FLEXIBLE VERSION"""
        monitoring_elements = [
            'levelMeter', 'levelIndicator', 'dbValue'
        ]
        
        elements_found = 0
        for element_id in monitoring_elements:
            if f'id="{element_id}"' in after_html or element_id in after_html:
                elements_found += 1
        
        assert elements_found >= 2, \
            f"Too few monitoring elements found: {elements_found}/3"
     
        assert 'function startAudioMonitoring(' in after_html, \
            "Monitoring function startAudioMonitoring missing"
        assert 'function updateLevelMeter(' in after_html, \
            "Monitoring function updateLevelMeter missing"
       
        web_audio_indicators = [
            'AudioContext',
            'webkitAudioContext', 
            'AnalyserNode',
            'createAnalyser',
            'createMediaStreamSource',
            'getByteFrequencyData',
            'frequencyBinCount',
            '.connect(', 
            'MediaStreamSource'
        ]
        
        web_audio_found = any(indicator in after_html for indicator in web_audio_indicators)
        assert web_audio_found, \
            "No Web Audio API indicators found. Need AudioContext or related API."
        
        found_indicators = [i for i in web_audio_indicators if i in after_html]
        if found_indicators:
            print(f"✅ Web Audio API indicators found: {', '.join(found_indicators)}")
        else:
            print("⚠️  No specific Web Audio API indicators found")
    
    def test_feature_3_session_manager(self, after_html):
        """Test Feature 3: Session Manager"""
        session_elements = [
            'recordingsList', 'recordingCount', 'totalSize',
            'downloadAllBtn', 'clearAllBtn'
        ]
        
        for element_id in session_elements:
            assert f'id="{element_id}"' in after_html or element_id in after_html, \
                f"Session element {element_id} missing in after version"
        
        assert 'MAX_RECORDINGS' in after_html, \
            "Recording limit constant MAX_RECORDINGS missing"
        assert 'MAX_TOTAL_SIZE' in after_html, \
            "Size limit constant MAX_TOTAL_SIZE missing"
    
        match = re.search(r'const MAX_RECORDINGS\s*=\s*(\d+)', after_html)
        if match:
            assert int(match.group(1)) == 10, \
                f"MAX_RECORDINGS should be 10, got {match.group(1)}"
        else:
            match = re.search(r'MAX_RECORDINGS\s*=\s*(\d+)', after_html)
            assert match and int(match.group(1)) == 10, \
                "MAX_RECORDINGS value not found or not equal to 10"
    
        session_functions = [
            'addToSession', 'updateSessionUI',
            'deleteSessionRecording', 'downloadAllRecordings'
        ]
        
        functions_found = 0
        for func in session_functions:
            if f'function {func}(' in after_html:
                functions_found += 1
        
        assert functions_found >= 3, \
            f"Too few session functions found: {functions_found}/4"
    
    def test_original_functionality_preserved(self, after_html):
        """Test original functionality is preserved in after version"""
    
        original_elements = ['recordBtn', 'downloadBtn', 'duration', 'timer', 'status']
        for element in original_elements:
            assert f'id="{element}"' in after_html, \
                f"Original element {element} missing in after version"
        
        original_functions = [
            'updateStatus', 'formatTime', 'updateTimer',
            'startRecording', 'downloadRecording'
        ]
        for func in original_functions:
            assert f'function {func}(' in after_html, \
                f"Original function {func} missing in after version"
    
    def test_quality_improvements(self, after_html):
        """Test quality improvements in after version"""

        assert "addEventListener('keydown'" in after_html, \
            "Keyboard accessibility missing"
 
        assert "URL.revokeObjectURL" in after_html, \
            "Memory management missing (URL objects not revoked)"
        
        assert '@media' in after_html, \
            "Mobile responsiveness missing (no media queries)"
        
        assert 'try {' in after_html, \
            "Error handling (try block) missing"
        assert 'catch' in after_html, \
            "Error handling (catch block) missing"
    
    def test_performance_optimizations(self, after_html):
        """Test performance optimizations in after version"""
      
        assert 'requestAnimationFrame' in after_html or 'setInterval' in after_html, \
            "No animation/update mechanism found"
     
        assert 'URL.revokeObjectURL' in after_html or 'audioContext.close()' in after_html, \
            "No resource cleanup found"