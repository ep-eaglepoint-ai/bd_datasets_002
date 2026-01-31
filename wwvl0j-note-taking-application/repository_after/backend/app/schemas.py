from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Note Schemas
class NoteBase(BaseModel):
    title: str
    content: str
    notebook_id: int

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    notebook_id: Optional[int] = None

class Note(NoteBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

# Notebook Schemas
class NotebookBase(BaseModel):
    name: str

class NotebookCreate(NotebookBase):
    pass

class Notebook(NotebookBase):
    id: int
    user_id: int
    created_at: datetime
    class Config:
        from_attributes = True

