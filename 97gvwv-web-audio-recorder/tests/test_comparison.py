
"""
Comparison tests between before and after versions
"""
import pytest
import re

class TestComparison:
    """Compare before and after versions"""
    
    def test_feature_addition_comparison(self, before_html, after_html, extract_features):
        """Compare feature sets between before and after"""
        before_features = extract_features(before_html)
        after_features = extract_features(after_html)
        
        print(f"\n📊 COMPARISON SUMMARY:")
        print(f"  HTML Size: {before_features['stats']['size']:,} → {after_features['stats']['size']:,} chars")
        print(f"  Functions: {len(before_features['functions'])} → {len(after_features['functions'])}")
        
        # Feature comparison
        feature_names = {
            'playback': 'Playback System',
            'monitoring': 'Live Monitoring',
            'session': 'Session Manager'
        }
        
        print("\n🎯 FEATURE STATUS:")
        all_features_added = True
        for feature_key, feature_name in feature_names.items():
            before_has = before_features['features'][feature_key]
            after_has = after_features['features'][feature_key]
            
            status = "ADDED ✓" if (not before_has and after_has) else "MISSING ✗"
            print(f"  {feature_name}: {status} (Before: {before_has}, After: {after_has})")
            
            if not (not before_has and after_has):
                all_features_added = False
        
        assert all_features_added, "Not all required features were added"
        print("\n✅ All three features successfully added!")
    
    def test_code_growth_analysis(self, before_html, after_html, extract_features):
        """Analyze code growth between versions"""
        before_features = extract_features(before_html)
        after_features = extract_features(after_html)
        
        # After should have more code
        assert after_features['stats']['size'] > before_features['stats']['size'], \
            "After version should have more code than before version"
        
        # After should have more functions
        assert len(after_features['functions']) > len(before_features['functions']), \
            "After version should have more functions than before version"
        
        growth_percentage = ((after_features['stats']['size'] - before_features['stats']['size']) / 
                           before_features['stats']['size'] * 100)
        print(f"\n📈 Code Growth: +{growth_percentage:.1f}%")
    
    def test_original_code_preservation(self, before_html, after_html):
        """Verify original code is preserved in after version"""
        # Check key original patterns preserved
        original_patterns = [
            'function updateStatus',
            'function formatTime',
            'function startRecording',
            'function downloadRecording',
            'id="recordBtn"',
            'id="downloadBtn"',
            'id="duration"',
            '--accent: #ff4136',
            '--success: #2ecc71',
            'MediaRecorder'
        ]
        
        print("\n🔍 ORIGINAL CODE PRESERVATION:")
        all_preserved = True
        for pattern in original_patterns:
            in_before = pattern in before_html
            in_after = pattern in after_html
            
            if in_before and in_after:
                print(f"  ✓ {pattern[:30]}...")
            else:
                print(f"  ✗ {pattern[:30]}... (Before: {in_before}, After: {in_after})")
                all_preserved = False
        
        assert all_preserved, "Original code not fully preserved"
        print("✅ All original code preserved!")
    
    def test_quality_improvement_comparison(self, before_html, after_html):
        """Compare quality improvements"""
        quality_checks = {
            'Keyboard Accessibility': "addEventListener('keydown'",
            'Memory Management': 'URL.revokeObjectURL',
            'Mobile Responsive': '@media (max-width:',
            'Error Handling': 'try {',
            'Resource Cleanup': 'audioContext.close()',
            'Performance': 'requestAnimationFrame'
        }
        
        print("\n🔧 QUALITY IMPROVEMENTS:")
        improvements_found = 0
        for name, pattern in quality_checks.items():
            in_before = pattern in before_html
            in_after = pattern in after_html
            
            if not in_before and in_after:
                print(f"  ✓ {name} (Added)")
                improvements_found += 1
            elif in_before and in_after:
                print(f"  ○ {name} (Already present)")
            else:
                print(f"  ✗ {name} (Missing)")
        
        # Require at least 4 quality improvements
        assert improvements_found >= 4, \
            f"Too few quality improvements: {improvements_found}/6"
        print(f"\n✅ Quality improvements: {improvements_found}/6 added")
    
    def test_feature_completeness(self, after_html):
        """Test feature completeness in after version"""
        # Comprehensive feature checklist
        feature_components = {
            'Playback System': ['playbackSection', 'togglePlayPause', 'seekAudio', 'waveformCanvas'],
            'Live Monitoring': ['levelMeter', 'audioContext', 'AnalyserNode', 'getByteFrequencyData'],
            'Session Manager': ['MAX_RECORDINGS', 'addToSession', 'recordingsList', 'updateSessionUI'],
            'Core Features': ['startRecording', 'downloadRecording', 'MediaRecorder'],
            'Quality': ["addEventListener('keydown'", 'URL.revokeObjectURL', '@media (max-width:']
        }
        
        print("\n📋 FEATURE COMPLETENESS CHECK:")
        total_components = 0
        found_components = 0
        
        for category, components in feature_components.items():
            category_found = sum(1 for comp in components if comp in after_html)
            total_components += len(components)
            found_components += category_found
            
            percentage = (category_found / len(components)) * 100
            print(f"  {category}: {category_found}/{len(components)} ({percentage:.0f}%)")
        
        overall_percentage = (found_components / total_components) * 100
        print(f"\n📊 Overall Completeness: {found_components}/{total_components} ({overall_percentage:.0f}%)")
        
        assert overall_percentage >= 80, \
            f"Feature completeness too low: {overall_percentage:.0f}%"