"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List


class ApplianceBase(BaseModel):
    """Base schema for appliance data."""
    name: str = Field(..., min_length=1, max_length=100)
    wattage: float = Field(..., gt=0)


class ApplianceCreate(ApplianceBase):
    """Schema for creating a new appliance."""
    pass


class ApplianceUpdate(BaseModel):
    """Schema for updating an appliance."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    wattage: Optional[float] = Field(None, gt=0)


class ApplianceResponse(ApplianceBase):
    """Schema for appliance response."""
    id: int
    is_on: bool

    model_config = ConfigDict(from_attributes=True)


class ToggleRequest(BaseModel):
    """Schema for toggle request."""
    is_on: bool


class ToggleResponse(BaseModel):
    """Schema for toggle response."""
    success: bool
    appliance: ApplianceResponse
    current_total_load: float
    message: str


class LoadStatusResponse(BaseModel):
    """Schema for load status response."""
    current_load: float
    max_load: float
    available_capacity: float
    utilization_percent: float
    status: str  # 'safe', 'warning', 'critical'


class ErrorResponse(BaseModel):
    """Schema for error responses."""
    detail: str
    current_load: Optional[float] = None
    requested_load: Optional[float] = None