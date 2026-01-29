import { useState, useEffect } from 'react';
import { Send, GraduationCap, Plus, Trash2, ShieldCheck, Mail, AlertCircle, RefreshCw } from 'lucide-react';

interface Prediction {
    label: string;
    probabilities: {
        spam: number;
        ham: number;
    };
}

interface TrainingExample {
    text: string;
    label: 'spam' | 'ham';
}

const API_BASE = 'http://localhost:8000';

const INITIAL_TRAINING_DATA: TrainingExample[] = [
    { text: "Congratulations! You've won a $1,000 Walmart gift card. Click here to claim now!", label: 'spam' },
    { text: "Urgent: Your account has been compromised. Verify your identity at this link.", label: 'spam' },
    { text: "Get rich quick with this one simple trick! Money back guaranteed.", label: 'spam' },
    { text: "Hey, are we still meeting for lunch at 12:30?", label: 'ham' },
    { text: "The report is ready for your review. Let me know if you have questions.", label: 'ham' },
    { text: "Can you pick up some milk on your way home?", label: 'ham' },
];

export default function App() {
    const [inputText, setInputText] = useState('');
    const [prediction, setPrediction] = useState<Prediction | null>(null);
    const [trainingData, setTrainingData] = useState<TrainingExample[]>(INITIAL_TRAINING_DATA);
    const [newExample, setNewExample] = useState<TrainingExample>({ text: '', label: 'ham' });
    const [isTrained, setIsTrained] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check health on mount
    useEffect(() => {
        fetch(`${API_BASE}/health`)
            .catch(() => setError('Backend server is not reachable. Is it running?'));
    }, []);

    const handleTrain = async (customData?: TrainingExample[]) => {
        setLoading(true);
        setError(null);
        const dataToTrain = customData || trainingData;

        try {
            const response = await fetch(`${API_BASE}/train`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    texts: dataToTrain.map(d => d.text),
                    labels: dataToTrain.map(d => d.label)
                }),
            });

            if (!response.ok) throw new Error('Training failed');
            setIsTrained(true);
            if (!customData) setTrainingData(dataToTrain);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePredict = async () => {
        if (!inputText) return;
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: inputText }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Prediction failed');
            }

            const result = await response.json();
            setPrediction(result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addExample = () => {
        if (!newExample.text) return;
        setTrainingData([...trainingData, newExample]);
        setNewExample({ text: '', label: 'ham' });
    };

    const removeExample = (index: number) => {
        setTrainingData(trainingData.filter((_, i) => i !== index));
        setIsTrained(false);
    };

    return (
        <div className="app">
            <header>
                <h1>Spam Guard AI</h1>
                <p className="subtitle">Real-time spam detection using Multinomial Naive Bayes</p>
            </header>

            <div className="container">
                {/* Left Column: Prediction */}
                <div className="column">
                    <div className="card">
                        <h2><ShieldCheck size={20} /> Predict Message</h2>
                        <div className="form-group">
                            <label>Message Content</label>
                            <textarea
                                rows={5}
                                placeholder="Paste message here..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                            />
                        </div>

                        <div className="table-actions">
                            <button
                                className="primary"
                                onClick={handlePredict}
                                disabled={loading || !inputText}
                            >
                                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                                Predict
                            </button>

                            {!isTrained && (
                                <button className="secondary" onClick={() => handleTrain(INITIAL_TRAINING_DATA)} disabled={loading}>
                                    <GraduationCap size={18} />
                                    Quick Train
                                </button>
                            )}
                        </div>

                        {error && (
                            <div className="error-msg" style={{ marginTop: '1rem', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        {prediction && (
                            <div className="results">
                                <h3>Analysis Results</h3>
                                <div className={`result-badge ${prediction.label}`}>
                                    {prediction.label === 'spam' ? 'Identified as Spam' : 'Legitimate Message'}
                                </div>

                                <div className="prob-bar-container">
                                    <div className="prob-label">
                                        <span>Spam Confidence</span>
                                        <span>{(prediction.probabilities.spam * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="prob-bar">
                                        <div className="prob-fill spam" style={{ width: `${prediction.probabilities.spam * 100}%` }}></div>
                                    </div>
                                </div>

                                <div className="prob-bar-container">
                                    <div className="prob-label">
                                        <span>Ham Confidence (Safe)</span>
                                        <span>{(prediction.probabilities.ham * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="prob-bar">
                                        <div className="prob-fill ham" style={{ width: `${prediction.probabilities.ham * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Training Data */}
                <div className="column">
                    <div className="card">
                        <h2><GraduationCap size={20} /> Training Dataset</h2>
                        <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Message</th>
                                        <th>Label</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trainingData.map((ex, i) => (
                                        <tr key={i}>
                                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.text}</td>
                                            <td>
                                                <span className={`result-badge ${ex.label}`} style={{ padding: '0.1rem 0.5rem', margin: 0 }}>{ex.label}</span>
                                            </td>
                                            <td>
                                                <button className="danger" onClick={() => removeExample(i)}><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="add-example">
                            <label>Add New Example</label>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                <input
                                    placeholder="Text..."
                                    value={newExample.text}
                                    onChange={(e) => setNewExample({ ...newExample, text: e.target.value })}
                                />
                                <select
                                    value={newExample.label}
                                    onChange={(e) => setNewExample({ ...newExample, label: e.target.value as 'spam' | 'ham' })}
                                    style={{ width: '100px' }}
                                >
                                    <option value="ham">Ham</option>
                                    <option value="spam">Spam</option>
                                </select>
                                <button className="secondary" onClick={addExample}><Plus size={18} /></button>
                            </div>
                            <button
                                className="primary"
                                style={{ width: '100%' }}
                                onClick={() => handleTrain()}
                                disabled={loading || trainingData.length === 0}
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                {isTrained ? 'Retrain Model' : 'Train Model'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
