from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from enum import Enum
import random

app = FastAPI()

class SagaState(str, Enum):
    PENDING = "PENDING"
    DEBITED = "DEBITED"
    CREDITED = "CREDITED"
    COMPENSATED = "COMPENSATED"

balances = {"alice": 1000, "bob": 1000, "charlie": 1000}
saga_states = {}  # saga_id -> {state, source_user, target_user, amount, results}


class TransactionRequest(BaseModel):
    user: str
    amount: float


@app.post("/debit")
async def debit(request: TransactionRequest, req: Request):
    transaction_id = req.headers.get("transaction-id")
    if not transaction_id:
        raise HTTPException(status_code=400, detail="transaction-id header is required")
    
    # Check if this saga already processed this step
    if transaction_id in saga_states:
        saga = saga_states[transaction_id]
        if saga["state"] in [SagaState.DEBITED, SagaState.CREDITED, SagaState.COMPENSATED]:
            return {"status": "success", "message": "already processed", "balance": saga.get("debit_result")}
    
    if request.user not in balances:
        raise HTTPException(status_code=404, detail="user not found")
    
    balances[request.user] -= request.amount
    result_balance = balances[request.user]
    
    # Track saga state
    saga_states[transaction_id] = {
        "state": SagaState.DEBITED,
        "source_user": request.user,
        "amount": request.amount,
        "debit_result": result_balance
    }
    
    return {"status": "success", "balance": result_balance}


@app.post("/credit")
async def credit(request: TransactionRequest, req: Request):
    transaction_id = req.headers.get("transaction-id")
    if not transaction_id:
        raise HTTPException(status_code=400, detail="transaction-id header is required")
    
    # Check saga state
    if transaction_id not in saga_states:
        raise HTTPException(status_code=400, detail="saga not found - must call /debit first")
    
    saga = saga_states[transaction_id]
    
    # Idempotency: if already credited, return success
    if saga["state"] == SagaState.CREDITED:
        return {"status": "success", "message": "already processed", "balance": saga.get("credit_result")}
    
    # Cannot credit if already compensated
    if saga["state"] == SagaState.COMPENSATED:
        raise HTTPException(status_code=400, detail="saga already compensated")
    
    # Fault injection: 30% failure rate
    if random.random() < 0.3:
        raise HTTPException(status_code=500, detail="Internal Server Error")
    
    if request.user not in balances:
        raise HTTPException(status_code=404, detail="user not found")
    
    balances[request.user] += request.amount
    result_balance = balances[request.user]
    
    # Update saga state
    saga["state"] = SagaState.CREDITED
    saga["target_user"] = request.user
    saga["credit_result"] = result_balance
    
    return {"status": "success", "balance": result_balance}


@app.post("/compensate_debit")
async def compensate_debit(request: TransactionRequest, req: Request):
    transaction_id = req.headers.get("transaction-id")
    if not transaction_id:
        raise HTTPException(status_code=400, detail="transaction-id header is required")
    
    # Check saga state
    if transaction_id not in saga_states:
        raise HTTPException(status_code=400, detail="saga not found - must call /debit first")
    
    saga = saga_states[transaction_id]
    
    # Idempotency: if already compensated, return success
    if saga["state"] == SagaState.COMPENSATED:
        return {"status": "success", "message": "already compensated", "balance": saga.get("compensate_result")}
    
    # Cannot compensate if already credited
    if saga["state"] == SagaState.CREDITED:
        raise HTTPException(status_code=400, detail="saga already completed - cannot compensate")
    
    # Must be in DEBITED state to compensate
    if saga["state"] != SagaState.DEBITED:
        raise HTTPException(status_code=400, detail="saga not in DEBITED state")
    
    if request.user not in balances:
        raise HTTPException(status_code=404, detail="user not found")
    
    balances[request.user] += request.amount
    result_balance = balances[request.user]
    
    # Update saga state
    saga["state"] = SagaState.COMPENSATED
    saga["compensate_result"] = result_balance
    
    return {"status": "success", "balance": result_balance}


@app.get("/balances")
def get_balances():
    return balances

@app.get("/saga/{saga_id}")
def get_saga_state(saga_id: str):
    if saga_id not in saga_states:
        raise HTTPException(status_code=404, detail="saga not found")
    return saga_states[saga_id]
