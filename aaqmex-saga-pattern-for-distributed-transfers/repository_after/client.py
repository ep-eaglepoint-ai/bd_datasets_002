import httpx
import uuid


class TransactionOrchestrator:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.client = httpx.Client(timeout=10.0)
    
    def transfer(self, source_user: str, target_user: str, amount: float):
        # Single saga ID for the entire transaction
        saga_id = str(uuid.uuid4())
        
        try:
            # Step 1: Debit source user
            debit_response = self.client.post(
                f"{self.base_url}/debit",
                json={"user": source_user, "amount": amount},
                headers={"transaction-id": saga_id}  # Same saga ID
            )
            debit_response.raise_for_status()
            
            # Step 2: Credit target user
            credit_response = self.client.post(
                f"{self.base_url}/credit",
                json={"user": target_user, "amount": amount},
                headers={"transaction-id": saga_id}  # Same saga ID
            )
            credit_response.raise_for_status()
            
            return {"status": "success", "saga_id": saga_id}
        
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 500:
                # Compensate: refund the source user
                compensate_response = self.client.post(
                    f"{self.base_url}/compensate_debit",
                    json={"user": source_user, "amount": amount},
                    headers={"transaction-id": saga_id}  # Same saga ID
                )
                compensate_response.raise_for_status()
                return {"status": "rolled_back", "saga_id": saga_id}
            raise
    
    def get_saga_state(self, saga_id: str):
        response = self.client.get(f"{self.base_url}/saga/{saga_id}")
        response.raise_for_status()
        return response.json()
    
    def close(self):
        self.client.close()


def run_demo():
    import time
    from multiprocessing import Process
    import uvicorn
    
    # Start server in background
    def start_server():
        from repository_after.server import app
        uvicorn.run(app, host="127.0.0.1", port=8000, log_level="error")
    
    server_process = Process(target=start_server)
    server_process.start()
    time.sleep(2)  # Wait for server to start
    
    try:
        orchestrator = TransactionOrchestrator("http://127.0.0.1:8000")
        
        # Get initial balances
        initial_response = httpx.get("http://127.0.0.1:8000/balances")
        initial_balances = initial_response.json()
        initial_total = sum(initial_balances.values())
        
        print(f"Initial balances: {initial_balances}")
        print(f"Initial total: {initial_total}")
        
        # Run 100 transfers
        success_count = 0
        rollback_count = 0
        users = list(initial_balances.keys())
        
        for i in range(100):
            source = users[i % len(users)]
            target = users[(i + 1) % len(users)]
            result = orchestrator.transfer(source, target, 10)
            
            if result["status"] == "success":
                success_count += 1
            else:
                rollback_count += 1
        
        # Get final balances
        final_response = httpx.get("http://127.0.0.1:8000/balances")
        final_balances = final_response.json()
        final_total = sum(final_balances.values())
        
        print(f"\nFinal balances: {final_balances}")
        print(f"Final total: {final_total}")
        print(f"\nSuccessful transfers: {success_count}")
        print(f"Rolled back transfers: {rollback_count}")
        print(f"Total money preserved: {initial_total == final_total}")
        
        orchestrator.close()
    finally:
        server_process.terminate()
        server_process.join()


if __name__ == "__main__":
    run_demo()
