import time
from typing import Dict, Any, Optional
# time: Used for timestamping requests and calculating windows.
# typing: Standard library for type hinting and interface definition.

class WeatherAPI:
    def get_current_weather(self, city: str) -> Dict[str, Any]:
        # Simulated data retrieval
        return {"city": city, "temp": 22, "status": "sunny"}

class AuthService:
    def login(self, username: str, password_hash: str) -> bool:
        # Simulated auth check
        return username == "admin" and password_hash == "secret"

class APIServer:
    def __init__(self):
        self.weather = WeatherAPI()
        self.auth = AuthService()

    def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        # Request structure: {'path': str, 'ip': str, 'user_id': Optional[str], 'payload': dict}
        path = request.get('path')
        if path == '/login':
            success = self.auth.login(request['payload']['user'], request['payload']['pwd'])
            return {"status": 200 if success else 401}
        elif path.startswith('/weather'):
            return {"status": 200, "data": self.weather.get_current_weather("London")}
        return {"status": 404}