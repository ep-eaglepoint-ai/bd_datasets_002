from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, or_, and_
from typing import List, Optional
from .. import models, schemas, database, auth
from datetime import datetime

router = APIRouter(
    prefix="/notes",
    tags=["notes"]
)

@router.get("/", response_model=List[schemas.Note])
async def read_notes(
    notebook_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0, 
    limit: int = 100, 
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    stmt = select(models.Note).join(models.Notebook).where(models.Notebook.user_id == current_user.id)
    
    if notebook_id:
        stmt = stmt.where(models.Note.notebook_id == notebook_id)
        
    if search:
        search_filter = or_(
            models.Note.title.ilike(f"%{search}%"),
            models.Note.content.ilike(f"%{search}%")
        )
        stmt = stmt.where(search_filter)
        
    # Sort by updated_at desc
    stmt = stmt.order_by(models.Note.updated_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    notes = result.scalars().all()
    return notes

@router.post("/", response_model=schemas.Note)
async def create_note(
    note: schemas.NoteCreate, 
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    # Verify notebook belongs to user
    stmt = select(models.Notebook).where(models.Notebook.id == note.notebook_id, models.Notebook.user_id == current_user.id)
    result = await db.execute(stmt)
    notebook = result.scalars().first()
    if not notebook:
        raise HTTPException(status_code=400, detail="Notebook not found")

    new_note = models.Note(**note.model_dump())
    db.add(new_note)
    await db.commit()
    await db.refresh(new_note)
    return new_note

@router.get("/{note_id}", response_model=schemas.Note)
async def read_note(
    note_id: int, 
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    stmt = select(models.Note).join(models.Notebook).where(
        models.Note.id == note_id, 
        models.Notebook.user_id == current_user.id
    )
    result = await db.execute(stmt)
    note = result.scalars().first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@router.put("/{note_id}", response_model=schemas.Note)
async def update_note(
    note_id: int, 
    note_update: schemas.NoteUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    stmt = select(models.Note).join(models.Notebook).where(
        models.Note.id == note_id, 
        models.Notebook.user_id == current_user.id
    )
    result = await db.execute(stmt)
    db_note = result.scalars().first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    update_data = note_update.model_dump(exclude_unset=True)
    
    # If moving notebook, verify ownership
    if "notebook_id" in update_data:
        nb_stmt = select(models.Notebook).where(models.Notebook.id == update_data["notebook_id"], models.Notebook.user_id == current_user.id)
        nb_result = await db.execute(nb_stmt)
        if not nb_result.scalars().first():
             raise HTTPException(status_code=400, detail="Target notebook not found")

    for key, value in update_data.items():
        setattr(db_note, key, value)
    
    # Manually update updated_at if not handled by DB trigger effectively in all cases (though onupdate=func.now() helps)
    # forcing it ensures application logic defines "update"
    db_note.updated_at = datetime.utcnow()

    db.add(db_note)
    await db.commit()
    await db.refresh(db_note)
    return db_note

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: int, 
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    stmt = select(models.Note).join(models.Notebook).where(
        models.Note.id == note_id, 
        models.Notebook.user_id == current_user.id
    )
    result = await db.execute(stmt)
    note = result.scalars().first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    await db.delete(note)
    await db.commit()
