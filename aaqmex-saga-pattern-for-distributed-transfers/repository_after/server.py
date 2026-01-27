from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import random

app = FastAPI()

balances = {"alice": 1000, "bob": 1000, "charlie": 1000}
processed_transactions = set()


class TransactionRequest(BaseModel):
    user: str
    amount: float


@app.post("/debit")
def debit(request: TransactionRequest, transaction_id: str = Header(...)):
    if transaction_id in processed_transactions:
        return {"status": "success", "message": "already processed"}
    
    if request.user not in balances:
        raise HTTPException(status_code=404, detail="user not found")
    
    balances[request.user] -= request.amount
    processed_transactions.add(transaction_id)
    return {"status": "success", "balance": balances[request.user]}


@app.post("/credit")
def credit(request: TransactionRequest, transaction_id: str = Header(...)):
    if transaction_id in processed_transactions:
        return {"status": "success", "message": "already processed"}
    
    if random.random() < 0.3:
        raise HTTPException(status_code=500, detail="Internal Server Error")
    
    if request.user not in balances:
        raise HTTPException(status_code=404, detail="user not found")
    
    balances[request.user] += request.amount
    processed_transactions.add(transaction_id)
    return {"status": "success", "balance": balances[request.user]}


@app.post("/compensate_debit")
def compensate_debit(request: TransactionRequest, transaction_id: str = Header(...)):
    if transaction_id in processed_transactions:
        return {"status": "success", "message": "already processed"}
    
    if request.user not in balances:
        raise HTTPException(status_code=404, detail="user not found")
    
    balances[request.user] += request.amount
    processed_transactions.add(transaction_id)
    return {"status": "success", "balance": balances[request.user]}


@app.get("/balances")
def get_balances():
    return balances
