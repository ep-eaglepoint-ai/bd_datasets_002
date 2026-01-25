import time
import threading
import math
from typing import Dict, Any, Optional

# time: Used for timestamping requests and calculating windows.
# typing: Standard library for type hinting and interface definition.

class RateLimiter:
    def __init__(self):
        self.lock = threading.RLock()
        self.buckets = {} 
        self.window_size = 60
        
        # Configuration
        self.ip_limit = 2000  
        self.ip_capacity = 100
        self.user_capacity = 1000
        self.refill_rate_ip = 100 / 60.0 
        self.refill_rate_user = 1000 / 60.0
        
        self.ban_threshold = 5
        self.ban_duration = 30 * 60 

    def _get_bucket(self, key: str):
        if key not in self.buckets:
            self.buckets[key] = {
                'tokens': 0,
                'last_update': time.time(),
                'violations': 0,
                'ban_expiry': 0,
                'violation_window_start': time.time()
            }
        return self.buckets[key]

    def check_limit(self, key: str, capacity: int, refill_rate: float) -> Dict[str, Any]:
        with self.lock:
            current_time = time.time()
            
            if key not in self.buckets:
                self.buckets[key] = {
                    'tokens': capacity,
                    'last_update': current_time,
                    'violations': 0,
                    'ban_expiry': 0,
                    'violation_window_start': current_time
                }
            
            bucket = self.buckets[key]

            # 1. Check Ban
            if bucket['ban_expiry'] > current_time:
                remaining_ban = bucket['ban_expiry'] - current_time
                return {
                    "allowed": False, 
                    "reason": "banned", 
                    "retry_after": remaining_ban,
                    "remaining": 0,
                    "limit": capacity
                }

            # 2. Refill
            time_passed = current_time - bucket['last_update']
            bucket['tokens'] = min(capacity, bucket['tokens'] + time_passed * refill_rate)
            bucket['last_update'] = current_time

            # 3. Check Quota
            if bucket['tokens'] >= 1:
                bucket['tokens'] -= 1
                return {
                    "allowed": True, 
                    "remaining": int(bucket['tokens']),
                    "limit": capacity,
                    "retry_after": 0
                }
            else:
                if current_time - bucket['violation_window_start'] > 60:
                    bucket['violations'] = 0
                    bucket['violation_window_start'] = current_time
                
                bucket['violations'] += 1
                
                retry_after = (1 - bucket['tokens']) / refill_rate
                
                if bucket['violations'] > self.ban_threshold:
                    bucket['ban_expiry'] = current_time + self.ban_duration
                    return {
                        "allowed": False, 
                        "reason": "banned", 
                        "retry_after": self.ban_duration,
                        "remaining": 0,
                        "limit": capacity
                    }
                
                return {
                    "allowed": False, 
                    "reason": "rate_limit", 
                    "retry_after": retry_after,
                    "remaining": 0,
                    "limit": capacity
                }
    
    def cleanup(self):
        """Removes old entries to prevent memory leaks."""
        with self.lock:
            current_time = time.time()
            keys_to_remove = []
            for key, bucket in self.buckets.items():
                if current_time - bucket['last_update'] > 3600 and bucket['ban_expiry'] < current_time:
                     keys_to_remove.append(key)
            for key in keys_to_remove:
                del self.buckets[key]

class WeatherAPI:
    def get_current_weather(self, city: str) -> Dict[str, Any]:
        return {"city": city, "temp": 22, "status": "sunny"}

class ReputationEngine:
    def __init__(self):
        self.scores = {} 
        self.lock = threading.RLock()

    def get_score(self, key: str) -> int:
        with self.lock:
            return self.scores.get(key, 100)

    def penalize(self, key: str, amount: int):
        with self.lock:
            current = self.get_score(key)
            self.scores[key] = max(0, current - amount)

class AuthService:
    def login(self, username: str, password_hash: str) -> bool:
        return username == "admin" and password_hash == "secret"

class APIServer:
    def __init__(self):
        self.weather = WeatherAPI()
        self.auth = AuthService()
        self.limiter = RateLimiter()
        self.reputation = ReputationEngine()

    def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        path = request.get('path')
        ip = request.get('ip')
        user_id = request.get('user_id')
        reputation_key = user_id if user_id else ip
        score = self.reputation.get_score(reputation_key)
        user_cap = self.limiter.user_capacity
        ip_cap = self.limiter.ip_capacity
        
        if score < 50:
            user_cap = 10
            ip_cap = 10
        
        limit_result = None
        
        if user_id:
            limit_result = self.limiter.check_limit(f"user:{user_id}", user_cap, self.limiter.refill_rate_user)
        else:
            limit_result = self.limiter.check_limit(f"ip:{ip}", ip_cap, self.limiter.refill_rate_ip)
            
        headers = {
            "X-RateLimit-Limit": str(limit_result['limit']),
            "X-RateLimit-Remaining": str(limit_result['remaining']),
            "Retry-After": str(math.ceil(limit_result['retry_after']))
        }

        if not limit_result['allowed']:
            if limit_result['reason'] == 'banned':
                return {"status": 403, "error": "Forbidden: IP/User Banned", "headers": headers}
            else:
                return {"status": 429, "error": "Too Many Requests", "headers": headers}

        if path == '/login':
            success = self.auth.login(request['payload']['user'], request['payload']['pwd'])
            if not success:
                self.reputation.penalize(reputation_key, 20)
            return {"status": 200 if success else 401, "headers": headers}
        elif path.startswith('/weather'):
            return {"status": 200, "data": self.weather.get_current_weather("London"), "headers": headers}
        
        return {"status": 404, "headers": headers}