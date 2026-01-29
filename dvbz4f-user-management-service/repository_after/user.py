from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional, Dict, Any

@dataclass
class User:
    id: str
    username: str
    email: str
    password_hash: str
    salt: str
    created_at: str
    updated_at: str
    is_active: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
