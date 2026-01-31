"""SQLAlchemy models for the VoltSafe application."""
from sqlalchemy import Column, Integer, String, Boolean, Float
from database import Base


class Appliance(Base):
    """Appliance model representing an IoT-enabled device."""
    __tablename__ = "appliances"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    wattage = Column(Float, nullable=False)
    is_on = Column(Boolean, default=False, nullable=False)

    def __repr__(self):
        return f"<Appliance(id={self.id}, name='{self.name}', wattage={self.wattage}, is_on={self.is_on})>"