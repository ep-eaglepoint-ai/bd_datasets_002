"""FastAPI backend for VoltSafe Home Load Balancer."""
import asyncio
from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db, init_db, reset_db, AsyncSessionLocal
from models import Appliance
from schemas import (
    ApplianceCreate, ApplianceResponse, ApplianceUpdate,
    ToggleRequest, ToggleResponse, LoadStatusResponse
)

# Safety ceiling constant
MAX_LOAD_WATTS = 5000.0

# Global lock for atomic power operations
power_lock = asyncio.Lock()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown."""
    await init_db()
    # Seed default appliances if database is empty
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(func.count(Appliance.id)))
        count = result.scalar()
        if count == 0:
            default_appliances = [
                Appliance(name="Living Room Heater", wattage=1500.0, is_on=False),
                Appliance(name="EV Charger", wattage=3000.0, is_on=False),
                Appliance(name="Kitchen Oven", wattage=2000.0, is_on=False),
                Appliance(name="Water Heater", wattage=1500.0, is_on=False),
                Appliance(name="Air Conditioner", wattage=2500.0, is_on=False),
            ]
            session.add_all(default_appliances)
            await session.commit()
    yield


app = FastAPI(
    title="VoltSafe Load Balancer API",
    description="API for managing home appliance loads with safety interlocks",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def calculate_current_load(session: AsyncSession, exclude_id: int = None) -> float:
    """Calculate the current total load of all active appliances."""
    query = select(func.coalesce(func.sum(Appliance.wattage), 0.0)).where(Appliance.is_on == True)
    if exclude_id is not None:
        query = query.where(Appliance.id != exclude_id)
    result = await session.execute(query)
    return float(result.scalar() or 0.0)


def create_power_limit_error(appliance_name: str, current_load: float, 
                              requested_wattage: float, new_total: float) -> dict:
    """
    Create a structured error response for power limit exceeded.
    
    The response contains:
    - 'message': A user-friendly, non-technical message suitable for UI display
    - 'user_message': Same as message, explicitly named for clarity
    - 'technical_details': Technical information for debugging/logging (optional use)
    
    Design Note: The frontend extracts only the 'message' field for display,
    ensuring end users see clear, non-technical error messages.
    """
    exceeded_by = round(new_total - MAX_LOAD_WATTS, 2)
    
    # User-friendly message - no technical jargon
    user_message = (
        f"Unable to turn on {appliance_name}. "
        f"This would exceed the home's safe power limit. "
        f"Please turn off another appliance first."
    )
    
    return {
        # Primary user-facing message (used by frontend)
        "message": user_message,
        "user_message": user_message,
        "error_type": "POWER_LIMIT_EXCEEDED",
        # Technical details for debugging/testing - not shown to users
        "technical_details": {
            "current_load": current_load,
            "requested_additional": requested_wattage,
            "would_be_total": new_total,
            "max_allowed": MAX_LOAD_WATTS,
            "exceeded_by": exceeded_by
        }
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "max_load": MAX_LOAD_WATTS}


@app.get("/api/appliances", response_model=List[ApplianceResponse])
async def get_appliances(db: AsyncSession = Depends(get_db)):
    """Get all appliances."""
    result = await db.execute(select(Appliance).order_by(Appliance.id))
    appliances = result.scalars().all()
    return appliances


@app.get("/api/appliances/{appliance_id}", response_model=ApplianceResponse)
async def get_appliance(appliance_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific appliance by ID."""
    result = await db.execute(select(Appliance).where(Appliance.id == appliance_id))
    appliance = result.scalar_one_or_none()
    if not appliance:
        raise HTTPException(status_code=404, detail="Appliance not found")
    return appliance


@app.post("/api/appliances", response_model=ApplianceResponse, status_code=201)
async def create_appliance(appliance: ApplianceCreate, db: AsyncSession = Depends(get_db)):
    """Create a new appliance."""
    db_appliance = Appliance(
        name=appliance.name,
        wattage=appliance.wattage,
        is_on=False
    )
    db.add(db_appliance)
    await db.commit()
    await db.refresh(db_appliance)
    return db_appliance


@app.put("/api/appliances/{appliance_id}", response_model=ApplianceResponse)
async def update_appliance(
    appliance_id: int,
    appliance: ApplianceUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an appliance."""
    result = await db.execute(select(Appliance).where(Appliance.id == appliance_id))
    db_appliance = result.scalar_one_or_none()
    if not db_appliance:
        raise HTTPException(status_code=404, detail="Appliance not found")
    
    if appliance.name is not None:
        db_appliance.name = appliance.name
    if appliance.wattage is not None:
        db_appliance.wattage = appliance.wattage
    
    await db.commit()
    await db.refresh(db_appliance)
    return db_appliance


@app.delete("/api/appliances/{appliance_id}", status_code=204)
async def delete_appliance(appliance_id: int, db: AsyncSession = Depends(get_db)):
    """Delete an appliance."""
    result = await db.execute(select(Appliance).where(Appliance.id == appliance_id))
    db_appliance = result.scalar_one_or_none()
    if not db_appliance:
        raise HTTPException(status_code=404, detail="Appliance not found")
    
    await db.delete(db_appliance)
    await db.commit()


@app.post("/api/appliances/{appliance_id}/toggle", response_model=ToggleResponse)
async def toggle_appliance(
    appliance_id: int,
    toggle: ToggleRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Toggle an appliance on/off with atomic capacity validation.
    
    This endpoint implements the Safety Interlock Mechanism:
    - Uses a global lock to prevent race conditions
    - Performs atomic capacity check before state transition
    - Ensures idempotent behavior for repeated requests
    
    Error Response Design:
    - Returns user-friendly 'message' field for UI display
    - Includes 'technical_details' for debugging (not shown to users)
    """
    global power_lock
    
    # Acquire lock for atomic operation
    async with power_lock:
        # Get appliance within locked section
        result = await db.execute(
            select(Appliance).where(Appliance.id == appliance_id)
        )
        appliance = result.scalar_one_or_none()
        
        if not appliance:
            raise HTTPException(status_code=404, detail="Appliance not found")
        
        # Idempotent check: if already in desired state, return success
        if appliance.is_on == toggle.is_on:
            current_load = await calculate_current_load(db)
            return ToggleResponse(
                success=True,
                appliance=ApplianceResponse(
                    id=appliance.id,
                    name=appliance.name,
                    wattage=appliance.wattage,
                    is_on=appliance.is_on
                ),
                current_total_load=current_load,
                message=f"Appliance already {'ON' if appliance.is_on else 'OFF'}"
            )
        
        # If turning ON, check capacity
        if toggle.is_on:
            current_load = await calculate_current_load(db, exclude_id=appliance.id)
            new_total = current_load + appliance.wattage
            
            # Precision check: reject if exceeds limit even by 0.01W
            if new_total > MAX_LOAD_WATTS:
                error_response = create_power_limit_error(
                    appliance.name, current_load, appliance.wattage, new_total
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=error_response
                )
            
            # Safe to turn on
            appliance.is_on = True
            await db.commit()
            await db.refresh(appliance)
            
            return ToggleResponse(
                success=True,
                appliance=ApplianceResponse(
                    id=appliance.id,
                    name=appliance.name,
                    wattage=appliance.wattage,
                    is_on=appliance.is_on
                ),
                current_total_load=new_total,
                message=f"{appliance.name} activated successfully"
            )
        else:
            # Turning OFF - always allowed
            appliance.is_on = False
            await db.commit()
            await db.refresh(appliance)
            
            current_load = await calculate_current_load(db)
            
            return ToggleResponse(
                success=True,
                appliance=ApplianceResponse(
                    id=appliance.id,
                    name=appliance.name,
                    wattage=appliance.wattage,
                    is_on=appliance.is_on
                ),
                current_total_load=current_load,
                message=f"{appliance.name} deactivated successfully"
            )


@app.get("/api/load-status", response_model=LoadStatusResponse)
async def get_load_status(db: AsyncSession = Depends(get_db)):
    """Get the current load status of the system."""
    current_load = await calculate_current_load(db)
    available = MAX_LOAD_WATTS - current_load
    utilization = (current_load / MAX_LOAD_WATTS) * 100
    
    # Determine status
    if utilization >= 90:
        load_status = "critical"
    elif utilization >= 70:
        load_status = "warning"
    else:
        load_status = "safe"
    
    return LoadStatusResponse(
        current_load=round(current_load, 2),
        max_load=MAX_LOAD_WATTS,
        available_capacity=round(available, 2),
        utilization_percent=round(utilization, 2),
        status=load_status
    )


@app.post("/api/reset", status_code=200)
async def reset_system():
    """Reset the system (for testing purposes)."""
    await reset_db()
    await init_db()
    return {"message": "System reset successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)