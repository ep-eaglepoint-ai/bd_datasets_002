"""
Tests for the BEFORE version (original/minimal audio recorder)
"""
import pytest
import re

class TestBeforeVersion:
    """Test the original audio recorder"""
    
    def test_file_exists(self):
        """Test that before version file exists"""
        import os
        assert os.path.exists('/app/repository_before/audio_recorder.py'), \
            "Before version file not found"
    
    def test_basic_elements_exist(self, before_html):
        """Test basic UI elements exist in before version"""
        required_elements = [
            'recordBtn', 'downloadBtn', 'duration',
            'timer', 'visualizer', 'status'
        ]
        
        for element_id in required_elements:
            assert f'id="{element_id}"' in before_html, \
                f"Required element {element_id} missing in before version"
    
    def test_no_new_features(self, before_html, extract_features):
        """Verify new features are NOT present in before version"""
        features = extract_features(before_html)

        assert not features['features']['playback'], \
            "Playback system should not exist in before version"
        assert not features['features']['monitoring'], \
            "Live monitoring should not exist in before version"
        assert not features['features']['session'], \
            "Session manager should not exist in before version"
    
    def test_basic_functions_exist(self, before_html):
        """Test basic JavaScript functions exist in before version"""
        required_functions = [
            'updateStatus', 'formatTime', 'updateTimer',
            'startRecording', 'downloadRecording'
        ]
        
        for func in required_functions:
            assert f'function {func}(' in before_html, \
                f"Required function {func} missing in before version"
    
    def test_media_recorder_api_used(self, before_html):
        """Test MediaRecorder API is used in before version"""
        assert 'MediaRecorder' in before_html, \
            "MediaRecorder API not used in before version"
        assert 'getUserMedia' in before_html, \
            "getUserMedia not used in before version"
        assert 'audio/wav' in before_html, \
            "WAV format not specified in before version"
    
    def test_css_variables_present(self, before_html):
        """Test CSS variables are present in before version"""
        css_variables = [
            '--bg: #0a0a0a',
            '--accent: #ff4136',
            '--success: #2ecc71',
            '--text: #e8e8e8',
            '--border: #2a2a2a'
        ]
        
        for var in css_variables:
            assert var in before_html, \
                f"CSS variable missing in before version: {var}"
    
    def test_no_advanced_features(self, before_html):
        """Test that advanced features are NOT in before version"""
        # CRITICAL features that should NOT be in before version
        critical_features = [
            'playbackSection',    # Feature 1
            'levelMeter',         # Feature 2  
            'sessionRecordings',  # Feature 3
            'AudioContext',       # Web Audio API
            'AnalyserNode',       # Web Audio API
            'togglePlayPause',    # Playback control
            'addToSession',       # Session management
            'updateSessionUI'     # Session management
        ]
        
        # Optional features that MIGHT be in before version
        optional_features = [
            'URL.revokeObjectURL',  # Memory management - could be in original
            'requestAnimationFrame', # Animation - could be in original
            'keydown',              # Keyboard events - could be in original
            '@media',               # Responsive design - could be in original
            'try', 'catch'          # Error handling - could be in original
        ]
        
        print("\n🔍 Checking advanced features in BEFORE version:")
        
        # Check critical features
        critical_found = []
        for feature in critical_features:
            if feature in before_html:
                critical_found.append(feature)
        
        if critical_found:
            print(f"❌ Critical features found that shouldn't be in before: {critical_found}")
            assert False, f"Critical features found in before version: {critical_found}"
        else:
            print("✅ No critical advanced features found (good!)")
        
        # Check optional features (just for info)
        optional_found = []
        for feature in optional_features:
            if feature in before_html:
                optional_found.append(feature)
        
        if optional_found:
            print(f"ℹ️  Optional features found (acceptable): {optional_found}")
        else:
            print("ℹ️  No optional advanced features found")
        
        # Verify the 3 main features are NOT present
        main_features = {
            'Playback System': 'playbackSection',
            'Live Monitoring': 'levelMeter',
            'Session Manager': 'sessionRecordings'
        }
        
        for feature_name, feature_id in main_features.items():
            assert feature_id not in before_html, \
                f"{feature_name} ({feature_id}) should not be in before version"

# """
# Tests for the BEFORE version (original minimal recorder)
# """
# import pytest
# import re

# class TestBeforeVersion:
#     """Test the original audio recorder"""
    
#     def test_basic_elements_exist(self, before_app, html_parser):
#         """Test basic UI elements exist"""
#         soup = html_parser(before_app, 'html.parser')
        
#         required_elements = [
#             'recordBtn', 'downloadBtn', 'duration',
#             'timer', 'visualizer', 'status'
#         ]
        
#         for element_id in required_elements:
#             element = soup.find(id=element_id)
#             assert element is not None, f"Required element {element_id} missing"
    
#     def test_no_new_features(self, before_app, feature_extractor):
#         """Verify new features are NOT present"""
#         features = feature_extractor(before_app)
        
#         # These should be FALSE
#         assert not features['features']['playback'], \
#             "Playback system should not exist in before version"
#         assert not features['features']['monitoring'], \
#             "Live monitoring should not exist in before version"
#         assert not features['features']['session'], \
#             "Session manager should not exist in before version"
    
#     def test_basic_functions_exist(self, before_app):
#         """Test basic JavaScript functions exist"""
#         # Extract functions from script
#         import re
#         script_match = re.search(r'<script>(.*?)</script>', before_app, re.DOTALL)
#         assert script_match, "No script tag found"
        
#         js_code = script_match.group(1)
#         required_functions = [
#             'updateStatus', 'formatTime', 'updateTimer',
#             'startRecording', 'downloadRecording'
#         ]
        
#         for func in required_functions:
#             assert f'function {func}(' in js_code, \
#                 f"Required function {func} missing"
    
#     def test_css_variables(self, before_app):
#         """Test CSS variables exist"""
#         assert '--bg: #0a0a0a' in before_app
#         assert '--accent: #ff4136' in before_app
#         assert '--success: #2ecc71' in before_app
    
#     def test_mobile_responsiveness_optional(self, before_app):
#         """Mobile responsiveness is optional in before version"""
#         # Just check if it exists, don't require it
#         has_media = '@media' in before_app
#         print(f"Mobile media queries in before: {has_media}")
    
#     def test_recording_mechanism(self, before_app):
#         """Test MediaRecorder API usage"""
#         assert 'MediaRecorder' in before_app
#         assert 'getUserMedia' in before_app
#         assert 'audio/wav' in before_app
    
#     @pytest.mark.parametrize("test_input,expected", [
#         ("updateStatus('test', 'error')", True),
#         ("formatTime(60)", True),
#         ("togglePlayPause()", False),  # Should NOT exist
#         ("startAudioMonitoring()", False),  # Should NOT exist
#         ("addToSession()", False)  # Should NOT exist
#     ])
#     def test_function_presence(self, before_app, test_input, expected):
#         """Test specific function presence/absence"""
#         function_name = test_input.split('(')[0]
#         present = function_name in before_app
#         assert present == expected, \
#             f"Function {function_name} presence mismatch: {present} != {expected}"

# # import pytest
# # from bs4 import BeautifulSoup
# # import re

# # class TestBeforeFeatures:
# #     """Test the original audio recorder features"""
    
# #     def test_core_elements_exist(self, before_app):
# #         """Test that all core elements are present"""
# #         html = before_app['html']
# #         soup = BeautifulSoup(html, 'html.parser')
        
# #         required_elements = [
# #             'recordBtn', 'downloadBtn', 'duration',
# #             'timer', 'visualizer', 'status'
# #         ]
        
# #         for element_id in required_elements:
# #             element = soup.find(id=element_id)
# #             assert element is not None, f"Element {element_id} not found"
    
# #     def test_core_javascript_functions(self, before_app):
# #         """Test that core JavaScript functions exist"""
# #         html = before_app['html']
# #         soup = BeautifulSoup(html, 'html.parser')
# #         script = soup.find('script')
        
# #         assert script is not None, "No script tag found"
        
# #         js_code = script.string
# #         required_functions = [
# #             'updateStatus', 'formatTime', 'updateTimer',
# #             'startRecording', 'downloadRecording'
# #         ]
        
# #         for func in required_functions:
# #             pattern = rf'function\s+{func}\s*\('
# #             assert re.search(pattern, js_code) is not None, \
# #                 f"Function {func} not found"
    
# #     def test_css_structure(self, before_app):
# #         """Test CSS structure and variables"""
# #         html = before_app['html']
# #         soup = BeautifulSoup(html, 'html.parser')
# #         style = soup.find('style')
        
# #         assert style is not None, "No style tag found"
        
# #         css_content = style.string
# #         required_variables = [
# #             '--bg', '--surface', '--border', '--text',
# #             '--text-dim', '--accent', '--success'
# #         ]
        
# #         for var in required_variables:
# #             assert var in css_content, f"CSS variable {var} not found"
    
# #     def test_no_new_features(self, before_app, extract_features):
# #         """Verify that new features are NOT present"""
# #         features = extract_features(before_app['html'])
        
# #         # These features should NOT be in the original
# #         assert not features['feature_flags']['playback_system'], \
# #             "Playback system should not be in original"
# #         assert not features['feature_flags']['live_monitoring'], \
# #             "Live monitoring should not be in original"
# #         assert not features['feature_flags']['session_manager'], \
# #             "Session manager should not be in original"
    
# #     def test_mobile_responsiveness(self, before_app):
# #         """Test mobile responsiveness in original"""
# #         html = before_app['html']
# #         soup = BeautifulSoup(html, 'html.parser')
# #         style = soup.find('style')
        
# #         # Original might not have mobile media queries
# #         # This is acceptable, but we note it
# #         css_content = style.string if style else ""
        
# #         # Check if any media queries exist
# #         has_media_queries = '@media' in css_content
        
# #         # This is just informational for comparison
# #         print(f"Original has media queries: {has_media_queries}")
    
# #     def test_error_handling(self, before_app):
# #         """Test error handling in original"""
# #         html = before_app['html']
# #         soup = BeautifulSoup(html, 'html.parser')
# #         script = soup.find('script')
# #         js_code = script.string if script else ""
        
# #         # Check for error handling
# #         assert 'try' in js_code, "No try-catch blocks found"
# #         assert 'catch' in js_code, "No error catching found"
# #         assert 'updateStatus' in js_code, "Status update function not found"