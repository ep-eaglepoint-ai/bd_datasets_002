# main.py
import time
import random
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from . import models, database

models.Base.metadata.create_all(bind=database.engine)
app = FastAPI()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def call_ai_provider(chunk: str):
    # Simulate external API latency and flakiness
    time.sleep(random.uniform(1.5, 4.0))
    if random.random() < 0.18:
        raise Exception("Upstream AI Provider: Connection Reset")
    return f"Summary: {chunk[:50]}..."

@app.post("/v1/analyze")
def analyze_document(text: str, db: Session = Depends(get_db)):
    # PROBLEM: Synchronous execution blocks the event loop.
    # PROBLEM: No progress visibility or persistence for failures.
    try:
        summary = call_ai_provider(text)
        job = models.AnalysisJob(raw_text=text, analysis_result=summary)
        db.add(job)
        db.commit()
        return {"job_id": job.id, "result": job.analysis_result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))