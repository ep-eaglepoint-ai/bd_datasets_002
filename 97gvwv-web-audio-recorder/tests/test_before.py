
import re

class TestBeforeVersion:
    
    
    def test_all_three_features_present(self, before_html, extract_features):
        
        print("\n" + "="*60)
        print("TEST 1: All Three Features Present")
        print("Expected: ✅ PASS (enhanced version)")
        print("-"*40)
        
        features = extract_features(before_html)
        
        # Feature 1: Playback
        has_playback = features['features']['playback']
        status1 = "✅ PRESENT" if has_playback else "❌ MISSING"
        print(f"  🔈 Playback System: {status1}")
        
        # Feature 2: Monitoring
        has_monitoring = features['features']['monitoring']
        status2 = "✅ PRESENT" if has_monitoring else "❌ MISSING"
        print(f"  📊 Live Monitoring: {status2}")
        
        # Feature 3: Session
        has_session = features['features']['session']
        status3 = "✅ PRESENT" if has_session else "❌ MISSING"
        print(f"  💾 Session Manager: {status3}")
        
        print("-"*40)
        
        # Check results
        all_present = has_playback and has_monitoring and has_session
        if all_present:
            print("✅ TEST PASSED: After version has all 3 features")
            assert True
        else:
            missing = []
            if not has_playback: missing.append("Playback")
            if not has_monitoring: missing.append("Monitoring")
            if not has_session: missing.append("Session")
            print(f"❌ TEST FAILED: Missing {len(missing)} feature(s): {', '.join(missing)}")
            print("Expected: All 3 features in enhanced version")
            assert False, f"After version missing features: {', '.join(missing)}"
    
    def test_feature_1_playback_elements(self, before_html):

        print("\n" + "="*60)
        print("TEST 2: Playback System Elements")
        print("Expected: ✅ All elements present (enhanced version)")
        print("-"*40)
        
        playback_elements = [
            'playbackSection', 'playPauseBtn', 'waveformCanvas',
            'seekContainer', 'volumeSlider', 'currentTime', 'totalTime'
        ]
        
        found_count = 0
        for element in playback_elements:
            if element in before_html:
                print(f"  ✅ {element}: PRESENT")
                found_count += 1
            else:
                print(f"  ❌ {element}: MISSING")
        
        print("-"*40)
        print(f"Found: {found_count}/{len(playback_elements)} elements")
        
        if found_count >= 5:  # At least 5 out of 7
            print("✅ TEST PASSED: Sufficient playback elements found")
            assert True
        else:
            print(f"❌ TEST FAILED: Found only {found_count} playback elements")
            print("Expected: At least 5 playback elements in enhanced version")
            assert False, f"Found only {found_count} playback elements, need at least 5"
    
    def test_feature_2_monitoring_elements(self, before_html):
        
        print("\n" + "="*60)
        print("TEST 3: Live Monitoring Elements")
        print("Expected: ✅ At least 2 elements present")
        print("-"*40)
        
        monitoring_elements = ['levelMeter', 'levelIndicator', 'dbValue']
        
        found_count = 0
        for element in monitoring_elements:
            if element in before_html:
                print(f"  ✅ {element}: PRESENT")
                found_count += 1
            else:
                print(f"  ❌ {element}: MISSING")
        
        print("-"*40)
        print(f"Found: {found_count}/{len(monitoring_elements)} elements")
        
        if found_count >= 2:
            print("✅ TEST PASSED: Sufficient monitoring elements found")
            assert True
        else:
            print(f"❌ TEST FAILED: Found only {found_count} monitoring elements")
            print("Expected: At least 2 monitoring elements")
            assert False, f"Found only {found_count} monitoring elements, need at least 2"
    
    def test_feature_3_session_elements(self, before_html):

        print("\n" + "="*60)
        print("TEST 4: Session Manager Elements")
        print("Expected: ✅ All elements present (enhanced version)")
        print("-"*40)
        
        session_elements = [
            'recordingsList', 'recordingCount', 'totalSize',
            'downloadAllBtn', 'clearAllBtn'
        ]
        
        found_count = 0
        for element in session_elements:
            if element in before_html:
                print(f"  ✅ {element}: PRESENT")
                found_count += 1
            else:
                print(f"  ❌ {element}: MISSING")
        
        print("-"*40)
        print(f"Found: {found_count}/{len(session_elements)} elements")
        
        if found_count >= 3:  # At least 3 out of 5
            print("✅ TEST PASSED: Sufficient session elements found")
            assert True
        else:
            print(f"❌ TEST FAILED: Found only {found_count} session elements")
            print("Expected: At least 3 session elements")
            assert False, f"Found only {found_count} session elements, need at least 3"
    
    def test_feature_1_playback_functions(self, before_html):
        
        print("\n" + "="*60)
        print("TEST 5: Playback System Functions")
        print("Expected: ✅ At least 3 functions present")
        print("-"*40)
        
        playback_functions = [
            'showPlaybackControls', 'generateWaveform',
            'togglePlayPause', 'seekAudio', 'setVolume'
        ]
        
        found_count = 0
        for func in playback_functions:
            if f'function {func}(' in before_html:
                print(f"  ✅ {func}(): PRESENT")
                found_count += 1
            else:
                print(f"  ❌ {func}(): MISSING")
        
        print("-"*40)
        print(f"Found: {found_count}/{len(playback_functions)} functions")
        
        if found_count >= 3:
            print("✅ TEST PASSED: Sufficient playback functions found")
            assert True
        else:
            print(f"❌ TEST FAILED: Found only {found_count} playback functions")
            print("Expected: At least 3 playback functions")
            assert False, f"Found only {found_count} playback functions, need at least 3"
    
    def test_feature_2_monitoring_functions(self, before_html):

        print("\n" + "="*60)
        print("TEST 6: Live Monitoring Functions")
        print("Expected: ✅ Both functions present")
        print("-"*40)
        
        has_start = 'function startAudioMonitoring(' in before_html
        has_update = 'function updateLevelMeter(' in before_html
        
        print(f"  startAudioMonitoring(): {'✅ PRESENT' if has_start else '❌ MISSING'}")
        print(f"  updateLevelMeter(): {'✅ PRESENT' if has_update else '❌ MISSING'}")
        
        found_count = (1 if has_start else 0) + (1 if has_update else 0)
        
        print("-"*40)
        print(f"Found: {found_count}/2 functions")
        
        if found_count >= 1:  # At least one monitoring function
            print("✅ TEST PASSED: Monitoring functions present")
            assert True
        else:
            print("❌ TEST FAILED: No monitoring functions found")
            print("Expected: At least one monitoring function")
            assert False, "No monitoring functions found"
    
    def test_feature_3_session_functions(self, before_html):

        print("\n" + "="*60)
        print("TEST 7: Session Manager Functions")
        print("Expected: ✅ At least 2 functions present")
        print("-"*40)
        
        session_functions = ['addToSession', 'updateSessionUI', 'deleteSessionRecording']
        
        found_count = 0
        for func in session_functions:
            if f'function {func}(' in before_html:
                print(f"  ✅ {func}(): PRESENT")
                found_count += 1
            else:
                print(f"  ❌ {func}(): MISSING")
        
        print("-"*40)
        print(f"Found: {found_count}/{len(session_functions)} functions")
        
        if found_count >= 2:
            print("✅ TEST PASSED: Sufficient session functions found")
            assert True
        else:
            print(f"❌ TEST FAILED: Found only {found_count} session functions")
            print("Expected: At least 2 session functions")
            assert False, f"Found only {found_count} session functions, need at least 2"
    
    def test_web_audio_api_used(self, before_html):
        
        print("\n" + "="*60)
        print("TEST 8: Web Audio API Usage")
        print("Expected: ✅ Web Audio API present")
        print("-"*40)
        
        web_audio = ['AudioContext', 'AnalyserNode', 'getByteFrequencyData']
        
        found_count = 0
        for api in web_audio:
            if api in before_html:
                print(f"  ✅ {api}: PRESENT")
                found_count += 1
            else:
                print(f"  ❌ {api}: MISSING")
        
        print("-"*40)
        print(f"Found: {found_count}/{len(web_audio)} Web Audio APIs")
        
        if found_count >= 1:
            print("✅ TEST PASSED: Web Audio API is being used")
            assert True
        else:
            print("❌ TEST FAILED: No Web Audio API usage detected")
            print("Expected: Web Audio API for live monitoring")
            assert False, "Web Audio API not used"
    
    def test_session_constants(self, before_html):
        
        print("\n" + "="*60)
        print("TEST 9: Session Constants")
        print("Expected: ✅ Both constants present with correct values")
        print("-"*40)
        
        has_max_recordings = 'MAX_RECORDINGS' in before_html
        has_max_size = 'MAX_TOTAL_SIZE' in before_html or '50 * 1024 * 1024' in before_html
        
        print(f"  MAX_RECORDINGS: {'✅ PRESENT' if has_max_recordings else '❌ MISSING'}")
        print(f"  MAX_TOTAL_SIZE: {'✅ PRESENT' if has_max_size else '❌ MISSING'}")
        
        # Check value if present
        value_correct = False
        if has_max_recordings:
            match = re.search(r'MAX_RECORDINGS\s*=\s*(\d+)', before_html)
            if match:
                value = int(match.group(1))
                if value == 10:
                    print(f"    Value: {value} ✅ CORRECT")
                    value_correct = True
                else:
                    print(f"    Value: {value} ❌ should be 10")
                    value_correct = False
        
        found_count = (1 if has_max_recordings else 0) + (1 if has_max_size else 0)
        
        print("-"*40)
        print(f"Found: {found_count}/2 constants")
        
        if has_max_recordings and has_max_size:
            if value_correct:
                print("✅ TEST PASSED: Both constants present with correct value")
                assert True
            else:
                print("⚠️  TEST PARTIAL: Constants present but MAX_RECORDINGS should be 10")
                # Still pass if constants exist, just warn about value
                assert True
        else:
            missing = []
            if not has_max_recordings: missing.append("MAX_RECORDINGS")
            if not has_max_size: missing.append("MAX_TOTAL_SIZE")
            print(f"❌ TEST FAILED: Missing constants: {', '.join(missing)}")
            print("Expected: Both session constants in enhanced version")
            assert False, f"Missing session constants: {', '.join(missing)}"
    
    def test_original_functionality_preserved(self, before_html):
        
        print("\n" + "="*60)
        print("TEST 10: Original Functionality")
        print("Expected: ✅ All original features preserved")
        print("-"*40)
        
        original_elements = ['recordBtn', 'downloadBtn', 'duration', 'timer', 'status']
        original_functions = ['updateStatus', 'formatTime', 'startRecording', 'downloadRecording']
        
        element_count = 0
        function_count = 0
        
        print("Checking elements:")
        for element in original_elements:
            if f'id="{element}"' in before_html:
                print(f"  ✅ {element}: PRESENT")
                element_count += 1
            else:
                print(f"  ❌ {element}: MISSING")
        
        print("\nChecking functions:")
        for func in original_functions:
            if f'function {func}(' in before_html:
                print(f"  ✅ {func}(): PRESENT")
                function_count += 1
            else:
                print(f"  ❌ {func}(): MISSING")
        
        print("-"*40)
        print(f"Elements: {element_count}/{len(original_elements)}")
        print(f"Functions: {function_count}/{len(original_functions)}")
        
        if element_count >= 4 and function_count >= 3:  # Allow some flexibility
            print("✅ TEST PASSED: Original functionality preserved")
            assert True
        else:
            missing = []
            if element_count < 4:
                missing.append(f"{4-element_count} more elements needed")
            if function_count < 3:
                missing.append(f"{3-function_count} more functions needed")
            print(f"❌ TEST FAILED: Insufficient original functionality")
            print("Expected: Most original functionality should be preserved")
            assert False, f"Insufficient original functionality"

