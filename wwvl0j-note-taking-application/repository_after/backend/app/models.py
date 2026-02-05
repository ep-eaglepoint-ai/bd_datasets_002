from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, func
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    notebooks = relationship("Notebook", back_populates="owner")

class Notebook(Base):
    __tablename__ = "notebooks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    owner = relationship("User", back_populates="notebooks")
    notes = relationship("Note", back_populates="notebook", cascade="all, delete-orphan")

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, default="Untitled")
    content = Column(Text, default="")
    notebook_id = Column(Integer, ForeignKey("notebooks.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    notebook = relationship("Notebook", back_populates="notes")
