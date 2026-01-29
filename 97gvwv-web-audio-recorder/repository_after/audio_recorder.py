#!/usr/bin/env python3
"""
Audio Recorder - All-in-One Server
Professional audio workstation with playback, monitoring, and session management
"""

import http.server
import socketserver
import webbrowser

PORT = 8000

HTML_CONTENT = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audio Recorder</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Cormorant+Garamond:wght@300;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0a0a0a;
            --surface: #1a1a1a;
            --border: #2a2a2a;
            --text: #e8e8e8;
            --text-dim: #888888;
            --accent: #ff4136;
            --accent-glow: rgba(255, 65, 54, 0.3);
            --success: #2ecc71;
            --warning: #f39c12;
            --mono: 'IBM Plex Mono', monospace;
            --serif: 'Cormorant Garamond', serif;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--mono);
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow-x: hidden;
            padding: 1rem;
        }

        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                linear-gradient(var(--border) 1px, transparent 1px),
                linear-gradient(90deg, var(--border) 1px, transparent 1px);
            background-size: 60px 60px;
            opacity: 0.3;
            animation: gridPulse 20s ease-in-out infinite;
            pointer-events: none;
        }

        @keyframes gridPulse {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.4; }
        }

        .container {
            position: relative;
            width: 100%;
            max-width: 800px;
            padding: 2rem;
            background: var(--surface);
            border: 1px solid var(--border);
            box-shadow: 0 0 60px rgba(0, 0, 0, 0.5);
            animation: slideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            margin: 0 auto;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        h1 {
            font-family: var(--serif);
            font-size: 2.5rem;
            font-weight: 300;
            letter-spacing: -0.02em;
            margin-bottom: 0.5rem;
            color: var(--text);
        }

        .subtitle {
            font-size: 0.75rem;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.15em;
            margin-bottom: 2.5rem;
            opacity: 0;
            animation: fadeIn 0.6s 0.2s forwards;
        }

        @keyframes fadeIn {
            to { opacity: 1; }
        }

        /* FEATURE 2: Live Input Monitoring */
        .monitoring-section {
            margin-bottom: 2rem;
            opacity: 0;
            animation: fadeIn 0.6s 0.4s forwards;
        }

        .monitoring-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
        }

        .monitoring-label {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--text-dim);
        }

        .db-value {
            font-size: 0.7rem;
            color: var(--text-dim);
            font-weight: 600;
        }

        .level-meter {
            width: 100%;
            height: 24px;
            background: linear-gradient(90deg, 
                var(--success) 0%, 
                var(--success) 60%,
                var(--warning) 60%,
                var(--warning) 85%,
                var(--accent) 85%,
                var(--accent) 100%
            );
            border-radius: 2px;
            overflow: hidden;
            position: relative;
        }

        .level-indicator {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 3px;
            background: var(--text);
            transform: translateX(-50%);
            transition: left 0.1s ease-out;
        }

        .level-zones {
            display: flex;
            justify-content: space-between;
            margin-top: 0.5rem;
            font-size: 0.65rem;
            color: var(--text-dim);
        }

        .controls {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .input-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        label {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--text-dim);
        }

        input[type="number"] {
            font-family: var(--mono);
            font-size: 1rem;
            padding: 0.75rem 1rem;
            background: var(--bg);
            border: 1px solid var(--border);
            color: var(--text);
            outline: none;
            transition: all 0.3s ease;
        }

        input[type="number"]:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .button-group {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
        }

        button {
            flex: 1;
            font-family: var(--mono);
            font-size: 0.85rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 1rem;
            background: transparent;
            border: 1px solid var(--border);
            color: var(--text);
            cursor: pointer;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
        }

        button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: var(--accent);
            transition: left 0.3s ease;
            z-index: -1;
        }

        button:hover::before {
            left: 0;
        }

        button:hover {
            color: white;
            border-color: var(--accent);
        }

        button:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }

        button:disabled::before {
            display: none;
        }

        #recordBtn.recording {
            background: var(--accent);
            border-color: var(--accent);
            color: white;
            animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        .timer {
            font-family: var(--mono);
            font-size: 3rem;
            font-weight: 600;
            text-align: center;
            margin: 2rem 0;
            color: var(--accent);
            letter-spacing: 0.05em;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .timer.visible {
            opacity: 1;
        }

        .visualizer {
            height: 100px;
            margin-top: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .visualizer.active {
            opacity: 1;
        }

        .bar {
            width: 3px;
            height: 20px;
            background: var(--accent);
            opacity: 0.3;
            animation: barPulse 1.2s ease-in-out infinite;
        }

        .bar:nth-child(2) { animation-delay: 0.1s; }
        .bar:nth-child(3) { animation-delay: 0.2s; }
        .bar:nth-child(4) { animation-delay: 0.3s; }
        .bar:nth-child(5) { animation-delay: 0.4s; }
        .bar:nth-child(6) { animation-delay: 0.5s; }
        .bar:nth-child(7) { animation-delay: 0.4s; }
        .bar:nth-child(8) { animation-delay: 0.3s; }
        .bar:nth-child(9) { animation-delay: 0.2s; }
        .bar:nth-child(10) { animation-delay: 0.1s; }

        @keyframes barPulse {
            0%, 100% {
                height: 20px;
                opacity: 0.3;
            }
            50% {
                height: 80px;
                opacity: 0.8;
            }
        }

        /* FEATURE 1: Audio Playback System */
        .playback-section {
            margin-top: 2rem;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.4s ease;
            max-height: 0;
            overflow: hidden;
        }

        .playback-section.visible {
            opacity: 1;
            transform: translateY(0);
            max-height: 400px;
        }

        .playback-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid var(--border);
        }

        .metadata {
            display: flex;
            gap: 1.5rem;
            font-size: 0.7rem;
            color: var(--text-dim);
            margin-bottom: 1rem;
        }

        .metadata-item {
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }

        .waveform-container {
            height: 80px;
            background: var(--bg);
            border-radius: 4px;
            margin: 1rem 0;
            position: relative;
            overflow: hidden;
        }

        #waveformCanvas {
            width: 100%;
            height: 100%;
        }

        .playback-controls {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin: 1rem 0;
        }

        .playback-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg);
            border: 1px solid var(--border);
            color: var(--text);
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .playback-btn:hover {
            border-color: var(--accent);
            color: var(--accent);
        }

        .time-display {
            font-family: var(--mono);
            font-size: 0.9rem;
            color: var(--text-dim);
            min-width: 100px;
            text-align: center;
        }

        .seek-container {
            flex: 1;
            position: relative;
            height: 4px;
            background: var(--border);
            border-radius: 2px;
            cursor: pointer;
        }

        .seek-progress {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            background: var(--accent);
            border-radius: 2px;
            width: 0%;
            transition: width 0.1s linear;
        }

        .volume-control {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 1rem;
        }

        .volume-slider {
            flex: 1;
            height: 4px;
            background: var(--border);
            border-radius: 2px;
            cursor: pointer;
            position: relative;
        }

        .volume-level {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            background: var(--text-dim);
            border-radius: 2px;
            width: 70%;
        }

        /* FEATURE 3: Session Manager */
        .session-section {
            margin-top: 2rem;
            opacity: 0;
            animation: fadeIn 0.6s 0.6s forwards;
        }

        .session-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }

        .session-stats {
            font-size: 0.7rem;
            color: var(--text-dim);
        }

        .recordings-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }

        .recording-card {
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 1rem;
            transition: all 0.3s ease;
            position: relative;
        }

        .recording-card.playing {
            border-color: var(--accent);
            box-shadow: 0 0 0 1px var(--accent-glow);
        }

        .recording-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 0.75rem;
        }

        .recording-time {
            font-size: 0.7rem;
            color: var(--text-dim);
        }

        .recording-id {
            font-size: 0.6rem;
            color: var(--text-dim);
            background: var(--surface);
            padding: 0.2rem 0.4rem;
            border-radius: 2px;
        }

        .recording-preview {
            height: 40px;
            background: var(--surface);
            border-radius: 2px;
            margin: 0.5rem 0;
            overflow: hidden;
        }

        .recording-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 0.75rem;
        }

        .action-btn {
            flex: 1;
            padding: 0.5rem;
            font-size: 0.7rem;
            background: transparent;
            border: 1px solid var(--border);
            color: var(--text);
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .action-btn:hover {
            border-color: var(--accent);
            color: var(--accent);
        }

        .delete-btn:hover {
            border-color: var(--accent);
            color: var(--accent);
        }

        .session-actions {
            display: flex;
            gap: 1rem;
            margin-top: 1.5rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border);
        }

        .status {
            min-height: 60px;
            padding: 1rem;
            background: var(--bg);
            border-left: 3px solid transparent;
            font-size: 0.85rem;
            line-height: 1.6;
            margin-top: 1.5rem;
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
        }

        .status.visible {
            opacity: 1;
            transform: translateY(0);
        }

        .status.info {
            border-left-color: var(--text-dim);
            color: var(--text-dim);
        }

        .status.success {
            border-left-color: var(--success);
            color: var(--success);
        }

        .status.warning {
            border-left-color: var(--warning);
            color: var(--warning);
        }

        .status.error {
            border-left-color: var(--accent);
            color: var(--accent);
        }

        /* Mobile Responsiveness */
        @media (max-width: 768px) {
            .container {
                padding: 1.5rem;
            }
            
            h1 {
                font-size: 2rem;
            }
            
            .recordings-list {
                grid-template-columns: 1fr;
            }
            
            .button-group, .session-actions {
                flex-direction: column;
            }
            
            .metadata {
                flex-wrap: wrap;
                gap: 0.75rem;
            }
        }

        @media (max-width: 480px) {
            .playback-controls {
                flex-wrap: wrap;
            }
            
            .time-display {
                order: 3;
                width: 100%;
                margin-top: 0.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Audio Recorder</h1>
        <p class="subtitle">Professional Audio Workstation</p>

        <!-- FEATURE 2: Live Input Monitoring -->
        <div class="monitoring-section">
            <div class="monitoring-header">
                <span class="monitoring-label">Microphone Level</span>
                <span class="db-value" id="dbValue">-∞ dB</span>
            </div>
            <div class="level-meter" id="levelMeter">
                <div class="level-indicator" id="levelIndicator"></div>
            </div>
            <div class="level-zones">
                <span>Optimal</span>
                <span>Quiet</span>
                <span>Clipping</span>
            </div>
        </div>

        <div class="controls">
            <div class="input-group">
                <label for="duration">Duration (seconds)</label>
                <input type="number" id="duration" min="1" max="300" value="5" step="1" aria-label="Recording duration in seconds">
            </div>

            <div class="button-group">
                <button id="recordBtn">Start Recording</button>
                <button id="downloadBtn" disabled>Download Latest</button>
            </div>
        </div>

        <div class="timer" id="timer">00:00</div>

        <div class="visualizer" id="visualizer">
            <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
            <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
        </div>

        <!-- FEATURE 1: Audio Playback System -->
        <div class="playback-section" id="playbackSection">
            <div class="playback-header">
                <span class="monitoring-label">Audio Playback</span>
                <button id="closePlayer" class="action-btn" style="flex: 0; padding: 0.25rem 0.5rem;">×</button>
            </div>
            
            <div class="metadata" id="recordingMetadata">
                <div class="metadata-item">
                    <span>Duration:</span>
                    <span id="metaDuration">0s</span>
                </div>
                <div class="metadata-item">
                    <span>Size:</span>
                    <span id="metaSize">0 KB</span>
                </div>
                <div class="metadata-item">
                    <span>Sample Rate:</span>
                    <span id="metaSampleRate">44.1kHz</span>
                </div>
            </div>

            <div class="waveform-container">
                <canvas id="waveformCanvas"></canvas>
            </div>

            <div class="playback-controls">
                <button class="playback-btn" id="playPauseBtn" aria-label="Play/Pause">
                    <span id="playIcon">▶</span>
                </button>
                <div class="time-display">
                    <span id="currentTime">0:00</span> / <span id="totalTime">0:00</span>
                </div>
                <div class="seek-container" id="seekContainer">
                    <div class="seek-progress" id="seekProgress"></div>
                </div>
            </div>

            <div class="volume-control">
                <span style="font-size: 0.7rem; color: var(--text-dim);">Volume:</span>
                <div class="volume-slider" id="volumeSlider">
                    <div class="volume-level" id="volumeLevel"></div>
                </div>
            </div>
        </div>

        <!-- FEATURE 3: Session Manager -->
        <div class="session-section">
            <div class="session-header">
                <span class="monitoring-label">Session Recordings</span>
                <span class="session-stats">
                    <span id="recordingCount">0</span>/10 recordings • 
                    <span id="totalSize">0</span>/50MB
                </span>
            </div>

            <div class="recordings-list" id="recordingsList">
                <!-- Recording cards will be inserted here -->
            </div>

            <div class="session-actions">
                <button id="downloadAllBtn" class="action-btn" disabled>Download All (ZIP)</button>
                <button id="clearAllBtn" class="action-btn">Clear Session</button>
            </div>
        </div>

        <div class="status" id="status">
            Ready to record. Grant microphone permission to start monitoring.
        </div>
    </div>

    <script>
        // ============================================
        // GLOBAL STATE & CONSTANTS
        // ============================================
        const MAX_RECORDINGS = 10;
        const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB in bytes
        let mediaRecorder = null;
        let audioChunks = [];
        let currentAudioBlob = null;
        let timerInterval = null;
        let remainingSeconds = 0;
        let monitoringInterval = null;
        let audioContext = null;
        let analyser = null;
        let microphone = null;
        let currentAudio = null;
        let isPlaying = false;
        let playbackStartTime = 0;
        let playbackDuration = 0;
        let playbackInterval = null;
        
        // Session storage for Feature 3
        let sessionRecordings = [];
        let totalSessionSize = 0;

        // ============================================
        // DOM ELEMENTS
        // ============================================
        const recordBtn = document.getElementById('recordBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const durationInput = document.getElementById('duration');
        const statusDiv = document.getElementById('status');
        const visualizer = document.getElementById('visualizer');
        const timerDiv = document.getElementById('timer');
        
        // Feature 1: Playback System
        const playbackSection = document.getElementById('playbackSection');
        const playPauseBtn = document.getElementById('playPauseBtn');
        const playIcon = document.getElementById('playIcon');
        const currentTimeEl = document.getElementById('currentTime');
        const totalTimeEl = document.getElementById('totalTime');
        const seekContainer = document.getElementById('seekContainer');
        const seekProgress = document.getElementById('seekProgress');
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeLevel = document.getElementById('volumeLevel');
        const waveformCanvas = document.getElementById('waveformCanvas');
        const closePlayerBtn = document.getElementById('closePlayer');
        const metaDuration = document.getElementById('metaDuration');
        const metaSize = document.getElementById('metaSize');
        const metaSampleRate = document.getElementById('metaSampleRate');
        
        // Feature 2: Monitoring
        const levelIndicator = document.getElementById('levelIndicator');
        const dbValue = document.getElementById('dbValue');
        
        // Feature 3: Session Manager
        const recordingsList = document.getElementById('recordingsList');
        const recordingCount = document.getElementById('recordingCount');
        const totalSize = document.getElementById('totalSize');
        const downloadAllBtn = document.getElementById('downloadAllBtn');
        const clearAllBtn = document.getElementById('clearAllBtn');

        // ============================================
        // UTILITY FUNCTIONS
        // ============================================
        function updateStatus(message, type = 'info') {
            statusDiv.textContent = message;
            statusDiv.className = `status visible ${type}`;
        }

        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${String(secs).padStart(2, '0')}`;
        }

        function formatFileSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }

        function formatTimestamp(date) {
            return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + 
                   ' - ' + date.toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'});
        }

        function generateUniqueId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        }

        // ============================================
        // FEATURE 2: LIVE INPUT MONITORING
        // ============================================
        async function startAudioMonitoring() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
                
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.8;
                
                microphone = audioContext.createMediaStreamSource(stream);
                microphone.connect(analyser);
                
                updateStatus('Microphone monitoring active. Speak to see levels.', 'success');
                
                // Start monitoring visualization
                monitoringInterval = requestAnimationFrame(updateLevelMeter);
                
            } catch (error) {
                console.warn('Microphone monitoring not available:', error.message);
                updateStatus('Microphone access denied. Monitoring disabled.', 'warning');
            }
        }

        function updateLevelMeter() {
            if (!analyser) {
                monitoringInterval = requestAnimationFrame(updateLevelMeter);
                return;
            }
            
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            
            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            
            // Convert to dB-like value (0-100)
            const level = Math.min(100, (average / 128) * 100);
            
            // Update visual indicator
            levelIndicator.style.left = `${level}%`;
            
            // Update dB value
            const dB = level > 1 ? Math.round(20 * Math.log10(level)) : -Infinity;
            dbValue.textContent = dB === -Infinity ? '-∞ dB' : `${dB} dB`;
            
            // Color feedback
            if (level > 85) {
                dbValue.style.color = 'var(--accent)';
            } else if (level > 60) {
                dbValue.style.color = 'var(--success)';
            } else if (level > 20) {
                dbValue.style.color = 'var(--warning)';
            } else {
                dbValue.style.color = 'var(--text-dim)';
            }
            
            monitoringInterval = requestAnimationFrame(updateLevelMeter);
        }

        // ============================================
        // ORIGINAL RECORDING FUNCTIONALITY (Preserved)
        // ============================================
        function updateTimer() {
            timerDiv.textContent = formatTime(remainingSeconds);
            remainingSeconds--;

            if (remainingSeconds < 0) {
                clearInterval(timerInterval);
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }
        }

        async function startRecording() {
            try {
                const duration = parseInt(durationInput.value);
                
                if (!duration || duration <= 0) {
                    updateStatus('Please enter a valid duration', 'error');
                    return;
                }

                if (duration > 300) {
                    updateStatus('Maximum duration is 5 minutes (300 seconds)', 'error');
                    return;
                }

                // Check session limits
                if (sessionRecordings.length >= MAX_RECORDINGS) {
                    updateStatus(`Maximum ${MAX_RECORDINGS} recordings reached. Delete some first.`, 'error');
                    return;
                }

                // Temporarily disconnect monitoring during recording
                if (microphone && analyser) {
                    microphone.disconnect(analyser);
                }

                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    currentAudioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    
                    // Add to session (Feature 3)
                    addToSession(currentAudioBlob, duration);
                    
                    // Show playback controls (Feature 1)
                    showPlaybackControls(currentAudioBlob, duration);
                    
                    // Restore monitoring
                    if (microphone && analyser) {
                        microphone.connect(analyser);
                    }
                    
                    downloadBtn.disabled = false;
                    updateStatus('Recording complete. Ready to play or download.', 'success');
                    visualizer.classList.remove('active');
                    timerDiv.classList.remove('visible');
                    
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                recordBtn.classList.add('recording');
                recordBtn.textContent = 'Recording...';
                recordBtn.disabled = true;
                durationInput.disabled = true;
                downloadBtn.disabled = true;
                visualizer.classList.add('active');
                timerDiv.classList.add('visible');

                remainingSeconds = duration;
                timerDiv.textContent = formatTime(remainingSeconds);
                timerInterval = setInterval(updateTimer, 1000);

                updateStatus(`Recording for ${duration} seconds...`, 'info');

                setTimeout(() => {
                    if (mediaRecorder && mediaRecorder.state === 'recording') {
                        mediaRecorder.stop();
                        recordBtn.classList.remove('recording');
                        recordBtn.textContent = 'Start Recording';
                        recordBtn.disabled = false;
                        durationInput.disabled = false;
                        clearInterval(timerInterval);
                    }
                }, duration * 1000);

            } catch (error) {
                updateStatus(`Error: ${error.message}`, 'error');
                console.error('Recording failed:', error);
                recordBtn.classList.remove('recording');
                recordBtn.textContent = 'Start Recording';
                recordBtn.disabled = false;
                durationInput.disabled = false;
                visualizer.classList.remove('active');
                timerDiv.classList.remove('visible');
                
                // Restore monitoring on error
                if (microphone && analyser) {
                    microphone.connect(analyser);
                }
            }
        }

        function downloadRecording() {
            if (!currentAudioBlob) return;

            const url = URL.createObjectURL(currentAudioBlob);
            const a = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            a.href = url;
            a.download = `recording_${timestamp}.wav`;
            a.click();
            URL.revokeObjectURL(url);
            
            updateStatus('Recording downloaded successfully!', 'success');
        }

        // ============================================
        // FEATURE 1: AUDIO PLAYBACK SYSTEM
        // ============================================
        function showPlaybackControls(audioBlob, duration) {
            if (!audioBlob) return;
            
            // Update metadata
            const size = audioBlob.size;
            metaDuration.textContent = `${duration}s`;
            metaSize.textContent = formatFileSize(size);
            metaSampleRate.textContent = '44.1kHz'; // Default for MediaRecorder
            
            // Generate waveform
            generateWaveform(audioBlob);
            
            // Create audio element
            if (currentAudio) {
                currentAudio.pause();
                URL.revokeObjectURL(currentAudio.src);
            }
            
            const audioUrl = URL.createObjectURL(audioBlob);
            currentAudio = new Audio(audioUrl);
            currentAudio.preload = 'metadata';
            playbackDuration = duration;
            
            // Set up audio events
            currentAudio.addEventListener('loadedmetadata', () => {
                totalTimeEl.textContent = formatTime(currentAudio.duration);
                playbackDuration = currentAudio.duration;
            });
            
            currentAudio.addEventListener('timeupdate', updatePlaybackProgress);
            currentAudio.addEventListener('ended', () => {
                isPlaying = false;
                playIcon.textContent = '▶';
                currentAudio.currentTime = 0;
                updatePlaybackProgress();
            });
            
            // Set initial volume
            currentAudio.volume = 0.7;
            volumeLevel.style.width = '70%';
            
            // Show playback section
            playbackSection.classList.add('visible');
            
            // Update UI
            currentTimeEl.textContent = '0:00';
            totalTimeEl.textContent = formatTime(duration);
            seekProgress.style.width = '0%';
            
            // Set focus for accessibility
            playPauseBtn.focus();
        }

        function generateWaveform(audioBlob) {
            const ctx = waveformCanvas.getContext('2d');
            const width = waveformCanvas.width = waveformCanvas.offsetWidth;
            const height = waveformCanvas.height = waveformCanvas.offsetHeight;
            
            // Clear canvas
            ctx.clearRect(0, 0, width, height);
            
            // Draw placeholder waveform (in a real implementation, 
            // you would decode the audio and draw actual waveform)
            ctx.fillStyle = 'var(--accent-glow)';
            ctx.strokeStyle = 'var(--accent)';
            ctx.lineWidth = 2;
            
            // Simple placeholder visualization
            ctx.beginPath();
            const centerY = height / 2;
            const barWidth = 4;
            const barSpacing = 2;
            const maxBars = Math.floor(width / (barWidth + barSpacing));
            
            for (let i = 0; i < maxBars; i++) {
                const x = i * (barWidth + barSpacing);
                const progress = i / maxBars;
                const barHeight = Math.sin(progress * Math.PI * 8) * (height * 0.4) + height * 0.1;
                
                ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
            }
        }

        function togglePlayPause() {
            if (!currentAudio) return;
            
            if (isPlaying) {
                currentAudio.pause();
                isPlaying = false;
                playIcon.textContent = '▶';
                clearInterval(playbackInterval);
            } else {
                currentAudio.play()
                    .then(() => {
                        isPlaying = true;
                        playIcon.textContent = '⏸';
                        playbackStartTime = Date.now() - (currentAudio.currentTime * 1000);
                        playbackInterval = setInterval(updatePlaybackProgress, 100);
                    })
                    .catch(error => {
                        updateStatus(`Playback error: ${error.message}`, 'error');
                    });
            }
        }

        function updatePlaybackProgress() {
            if (!currentAudio) return;
            
            const current = currentAudio.currentTime;
            const duration = currentAudio.duration || playbackDuration;
            const progress = (current / duration) * 100;
            
            seekProgress.style.width = `${progress}%`;
            currentTimeEl.textContent = formatTime(current);
        }

        function seekAudio(event) {
            if (!currentAudio) return;
            
            const rect = seekContainer.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, x / rect.width));
            
            currentAudio.currentTime = percentage * (currentAudio.duration || playbackDuration);
            updatePlaybackProgress();
        }

        function setVolume(event) {
            if (!currentAudio) return;
            
            const rect = volumeSlider.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, x / rect.width));
            
            currentAudio.volume = percentage;
            volumeLevel.style.width = `${percentage * 100}%`;
        }

        function closePlayer() {
            if (currentAudio) {
                currentAudio.pause();
                isPlaying = false;
                playIcon.textContent = '▶';
                clearInterval(playbackInterval);
                URL.revokeObjectURL(currentAudio.src);
                currentAudio = null;
            }
            playbackSection.classList.remove('visible');
        }

        // ============================================
        // FEATURE 3: SESSION MANAGER
        // ============================================
        function addToSession(audioBlob, duration) {
            const recording = {
                id: generateUniqueId(),
                timestamp: new Date(),
                duration: duration,
                size: audioBlob.size,
                blob: audioBlob,
                url: URL.createObjectURL(audioBlob)
            };
            
            sessionRecordings.unshift(recording); // Add to beginning
            totalSessionSize += audioBlob.size;
            
            updateSessionUI();
            updateStatus(`Added recording #${sessionRecordings.length} to session`, 'success');
        }

        function updateSessionUI() {
            // Update stats
            recordingCount.textContent = sessionRecordings.length;
            totalSize.textContent = formatFileSize(totalSessionSize);
            
            // Enable/disable buttons based on limits
            downloadAllBtn.disabled = sessionRecordings.length === 0;
            recordBtn.disabled = sessionRecordings.length >= MAX_RECORDINGS || 
                                totalSessionSize >= MAX_TOTAL_SIZE;
            
            if (sessionRecordings.length >= MAX_RECORDINGS) {
                updateStatus(`Maximum ${MAX_RECORDINGS} recordings reached`, 'warning');
            } else if (totalSessionSize >= MAX_TOTAL_SIZE) {
                updateStatus('Maximum 50MB session size reached', 'warning');
            }
            
            // Update recordings list
            recordingsList.innerHTML = '';
            
            sessionRecordings.forEach(recording => {
                const card = document.createElement('div');
                card.className = 'recording-card';
                card.id = `recording-${recording.id}`;
                
                const isCurrentlyPlaying = currentAudio && 
                    currentAudio.src === recording.url && 
                    isPlaying;
                
                if (isCurrentlyPlaying) {
                    card.classList.add('playing');
                }
                
                card.innerHTML = `
                    <div class="recording-header">
                        <div class="recording-time">${formatTimestamp(recording.timestamp)}</div>
                        <div class="recording-id">${recording.id.slice(-6)}</div>
                    </div>
                    <div class="metadata" style="margin: 0.5rem 0; font-size: 0.7rem;">
                        <span>${recording.duration}s • ${formatFileSize(recording.size)}</span>
                    </div>
                    <div class="recording-preview">
                        <!-- Waveform preview could be added here -->
                    </div>
                    <div class="recording-actions">
                        <button class="action-btn play-btn" data-id="${recording.id}">
                            ${isCurrentlyPlaying ? '⏸' : '▶'}
                        </button>
                        <button class="action-btn download-btn" data-id="${recording.id}">
                            ↓
                        </button>
                        <button class="action-btn delete-btn" data-id="${recording.id}">
                            ×
                        </button>
                    </div>
                `;
                
                recordingsList.appendChild(card);
            });
            
            // Add event listeners to new buttons
            document.querySelectorAll('.play-btn').forEach(btn => {
                btn.addEventListener('click', (e) => playSessionRecording(e.target.dataset.id));
            });
            
            document.querySelectorAll('.download-btn').forEach(btn => {
                btn.addEventListener('click', (e) => downloadSessionRecording(e.target.dataset.id));
            });
            
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => deleteSessionRecording(e.target.dataset.id));
            });
        }

        function playSessionRecording(recordingId) {
            const recording = sessionRecordings.find(r => r.id === recordingId);
            if (!recording) return;
            
            // Stop any currently playing audio
            if (currentAudio) {
                currentAudio.pause();
                if (currentAudio.src !== recording.url) {
                    URL.revokeObjectURL(currentAudio.src);
                }
            }
            
            // Update playback section for this recording
            showPlaybackControls(recording.blob, recording.duration);
            
            // Play the audio
            togglePlayPause();
            
            // Update UI to show which recording is playing
            updateSessionUI();
        }

        function downloadSessionRecording(recordingId) {
            const recording = sessionRecordings.find(r => r.id === recordingId);
            if (!recording) return;
            
            const url = recording.url;
            const a = document.createElement('a');
            const timestamp = recording.timestamp.toISOString().replace(/[:.]/g, '-').slice(0, -5);
            a.href = url;
            a.download = `recording_${timestamp}.wav`;
            a.click();
            
            updateStatus('Recording downloaded', 'success');
        }

        function deleteSessionRecording(recordingId) {
            const index = sessionRecordings.findIndex(r => r.id === recordingId);
            if (index === -1) return;
            
            const recording = sessionRecordings[index];
            
            // Revoke URL to prevent memory leak
            URL.revokeObjectURL(recording.url);
            
            // If this recording is currently playing, stop it
            if (currentAudio && currentAudio.src === recording.url) {
                currentAudio.pause();
                currentAudio = null;
                playbackSection.classList.remove('visible');
            }
            
            // Remove from session
            totalSessionSize -= recording.size;
            sessionRecordings.splice(index, 1);
            
            updateSessionUI();
            updateStatus('Recording deleted', 'info');
        }

        async function downloadAllRecordings() {
            if (sessionRecordings.length === 0) return;
            
            try {
                // Dynamically import JSZip only when needed
                const JSZip = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
                const zip = new JSZip.default();
                
                sessionRecordings.forEach((recording, index) => {
                    const timestamp = recording.timestamp.toISOString().replace(/[:.]/g, '-').slice(0, -5);
                    const filename = `recording_${timestamp}.wav`;
                    zip.file(filename, recording.blob);
                });
                
                const content = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                a.href = url;
                a.download = `audio_session_${new Date().toISOString().slice(0, 10)}.zip`;
                a.click();
                URL.revokeObjectURL(url);
                
                updateStatus(`Downloaded ${sessionRecordings.length} recordings as ZIP`, 'success');
                
            } catch (error) {
                console.error('ZIP creation failed:', error);
                updateStatus('ZIP download failed. Download recordings individually.', 'error');
                
                // Fallback: Download all individually
                sessionRecordings.forEach(recording => {
                    downloadSessionRecording(recording.id);
                });
            }
        }

        function clearSession() {
            if (sessionRecordings.length === 0) return;
            
            if (!confirm(`Clear all ${sessionRecordings.length} recordings?`)) return;
            
            // Revoke all URLs
            sessionRecordings.forEach(recording => {
                URL.revokeObjectURL(recording.url);
            });
            
            // Stop any playing audio
            if (currentAudio) {
                currentAudio.pause();
                currentAudio = null;
                playbackSection.classList.remove('visible');
            }
            
            // Clear session
            sessionRecordings = [];
            totalSessionSize = 0;
            
            updateSessionUI();
            updateStatus('Session cleared', 'info');
        }

        // ============================================
        // KEYBOARD ACCESSIBILITY
        // ============================================
        document.addEventListener('keydown', (e) => {
            // Spacebar toggles play/pause
            if (e.code === 'Space' && 
                (e.target === playPauseBtn || 
                 e.target === document.body || 
                 !['input', 'button', 'textarea'].includes(e.target.tagName.toLowerCase()))) {
                e.preventDefault();
                if (currentAudio) {
                    togglePlayPause();
                }
            }
            
            // Arrow keys for seeking
            if (currentAudio && !e.altKey && !e.ctrlKey && !e.metaKey) {
                if (e.code === 'ArrowLeft') {
                    e.preventDefault();
                    currentAudio.currentTime = Math.max(0, currentAudio.currentTime - 5);
                    updatePlaybackProgress();
                } else if (e.code === 'ArrowRight') {
                    e.preventDefault();
                    currentAudio.currentTime = Math.min(currentAudio.duration, currentAudio.currentTime + 5);
                    updatePlaybackProgress();
                }
            }
            
            // Escape closes player
            if (e.code === 'Escape' && playbackSection.classList.contains('visible')) {
                closePlayer();
            }
        });

        // ============================================
        // EVENT LISTENERS
        // ============================================
        recordBtn.addEventListener('click', startRecording);
        downloadBtn.addEventListener('click', downloadRecording);
        playPauseBtn.addEventListener('click', togglePlayPause);
        closePlayerBtn.addEventListener('click', closePlayer);
        downloadAllBtn.addEventListener('click', downloadAllRecordings);
        clearAllBtn.addEventListener('click', clearSession);
        
        // Seek and volume controls
        seekContainer.addEventListener('click', seekAudio);
        volumeSlider.addEventListener('click', setVolume);
        
        // Make seek container draggable for better UX
        let isSeeking = false;
        seekContainer.addEventListener('mousedown', () => {
            isSeeking = true;
            document.addEventListener('mousemove', handleSeekMove);
            document.addEventListener('mouseup', () => {
                isSeeking = false;
                document.removeEventListener('mousemove', handleSeekMove);
            });
        });
        
        function handleSeekMove(e) {
            if (!isSeeking || !currentAudio) return;
            const rect = seekContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, x / rect.width));
            currentAudio.currentTime = percentage * (currentAudio.duration || playbackDuration);
            updatePlaybackProgress();
        }
        
        // Volume slider draggable
        let isVolumeAdjusting = false;
        volumeSlider.addEventListener('mousedown', () => {
            isVolumeAdjusting = true;
            document.addEventListener('mousemove', handleVolumeMove);
            document.addEventListener('mouseup', () => {
                isVolumeAdjusting = false;
                document.removeEventListener('mousemove', handleVolumeMove);
            });
        });
        
        function handleVolumeMove(e) {
            if (!isVolumeAdjusting || !currentAudio) return;
            const rect = volumeSlider.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, x / rect.width));
            currentAudio.volume = percentage;
            volumeLevel.style.width = `${percentage * 100}%`;
        }

        // ============================================
        // INITIALIZATION
        // ============================================
        async function initializeApp() {
            updateStatus('Initializing audio workstation...', 'info');
            
            // Start live monitoring
            await startAudioMonitoring();
            
            // Update UI
            updateSessionUI();
            
            // Set initial status
            updateStatus('Ready to record. Speak to see microphone levels.', 'success');
        }

        // Start the app when page loads
        window.addEventListener('load', initializeApp);
        
        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            if (monitoringInterval) {
                cancelAnimationFrame(monitoringInterval);
            }
            if (audioContext) {
                audioContext.close();
            }
            if (currentAudio) {
                URL.revokeObjectURL(currentAudio.src);
            }
            sessionRecordings.forEach(recording => {
                URL.revokeObjectURL(recording.url);
            });
        });
    </script>
</body>
</html>
"""

class RequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Permissions-Policy', 'microphone=*')
        self.end_headers()
        self.wfile.write(HTML_CONTENT.encode())

def main():
    with socketserver.TCPServer(("", PORT), RequestHandler) as httpd:
        url = f"http://localhost:{PORT}"
        
        print("=" * 60)
        print(f"  🎙️  Professional Audio Workstation Started")
        print("=" * 60)
        print(f"\n  URL: {url}")
        print(f"  Port: {PORT}")
        print("\n  Features Implemented:")
        print("    1. Audio Playback System with Waveform Visualization")
        print("    2. Live Input Monitoring with Level Meter")
        print("    3. Session Manager with Recording History")
        print("\n  Opening browser...")
        print("\n  Press Ctrl+C to stop the server\n")
        print("=" * 60)
        
        webbrowser.open(url)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n  ✅ Server stopped.\n")

if __name__ == "__main__":
    main()