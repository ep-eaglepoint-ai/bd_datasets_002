from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

app = FastAPI(title="Spam Detection API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model variable
model: Optional[Pipeline] = None

class TrainRequest(BaseModel):
    texts: List[str]
    labels: List[str]

class PredictRequest(BaseModel):
    text: str

class BatchPredictRequest(BaseModel):
    texts: List[str]

class PredictionResult(BaseModel):
    label: str
    probabilities: dict

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/train")
def train(request: TrainRequest):
    global model
    if len(request.texts) != len(request.labels):
        raise HTTPException(status_code=400, detail="Number of texts and labels must be equal")
    
    if not request.texts:
        raise HTTPException(status_code=400, detail="Training data cannot be empty")

    # Create and train the pipeline
    new_model = Pipeline([
        ('tfidf', TfidfVectorizer(stop_words='english')),
        ('nb', MultinomialNB())
    ])
    
    try:
        new_model.fit(request.texts, request.labels)
        model = new_model
        return {"message": "Model trained successfully", "count": len(request.texts)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

def get_prediction(text: str) -> PredictionResult:
    if model is None:
        raise HTTPException(status_code=400, detail="Model not trained yet. Please call /train first.")
    
    probs = model.predict_proba([text])[0]
    classes = model.classes_
    label = model.predict([text])[0]
    
    prob_dict = {cls: float(prob) for cls, prob in zip(classes, probs)}
    
    # Ensure spam/ham keys exist even if not in training (though unlikely with proper training)
    return PredictionResult(label=label, probabilities=prob_dict)

@app.post("/predict", response_model=PredictionResult)
def predict(request: PredictRequest):
    return get_prediction(request.text)

@app.post("/predict_batch", response_model=List[PredictionResult])
def predict_batch(request: BatchPredictRequest):
    return [get_prediction(text) for text in request.texts]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
