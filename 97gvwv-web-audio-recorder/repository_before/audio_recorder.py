#!/usr/bin/env python3
"""
Audio Recorder - All-in-One Server
Just run this file - no other files needed!
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
            overflow: hidden;
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
            width: 90%;
            max-width: 480px;
            padding: 3rem 2.5rem;
            background: var(--surface);
            border: 1px solid var(--border);
            box-shadow: 0 0 60px rgba(0, 0, 0, 0.5);
            animation: slideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
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

        .controls {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
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

        .status.error {
            border-left-color: var(--accent);
            color: var(--accent);
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
    </style>
</head>
<body>
    <div class="container">
        <h1>Audio Recorder</h1>
        <p class="subtitle">Minimal. Precise. Clean.</p>

        <div class="controls">
            <div class="input-group">
                <label for="duration">Duration (seconds)</label>
                <input type="number" id="duration" min="1" max="300" value="5" step="1">
            </div>

            <div class="button-group">
                <button id="recordBtn">Start Recording</button>
                <button id="downloadBtn" disabled>Download</button>
            </div>
        </div>

        <div class="timer" id="timer">00:00</div>

        <div class="visualizer" id="visualizer">
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
        </div>

        <div class="status" id="status">
            Ready to record. Set duration and press start.
        </div>
    </div>

    <script>
        let mediaRecorder;
        let audioChunks = [];
        let audioBlob;
        let timerInterval;
        let remainingSeconds;

        const recordBtn = document.getElementById('recordBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const durationInput = document.getElementById('duration');
        const statusDiv = document.getElementById('status');
        const visualizer = document.getElementById('visualizer');
        const timerDiv = document.getElementById('timer');

        function updateStatus(message, type = 'info') {
            statusDiv.textContent = message;
            statusDiv.className = `status visible ${type}`;
        }

        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }

        function updateTimer() {
            timerDiv.textContent = formatTime(remainingSeconds);
            remainingSeconds--;

            if (remainingSeconds < 0) {
                clearInterval(timerInterval);
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

                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    downloadBtn.disabled = false;
                    updateStatus('Recording complete. Click Download to save.', 'success');
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
                    if (mediaRecorder.state === 'recording') {
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
            }
        }

        function downloadRecording() {
            if (!audioBlob) return;

            const url = URL.createObjectURL(audioBlob);
            const a = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            a.href = url;
            a.download = `recording_${timestamp}.wav`;
            a.click();
            URL.revokeObjectURL(url);
            
            updateStatus('Recording downloaded successfully!', 'success');
        }

        recordBtn.addEventListener('click', startRecording);
        downloadBtn.addEventListener('click', downloadRecording);

        updateStatus('Ready to record. Set duration and press start.', 'info');
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
        print(f"  🎙️  Audio Recorder Server Started")
        print("=" * 60)
        print(f"\n  URL: {url}")
        print(f"  Port: {PORT}")
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