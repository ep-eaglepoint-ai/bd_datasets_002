from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List
from .. import models, schemas, database, auth

router = APIRouter(
    prefix="/notebooks",
    tags=["notebooks"]
)

@router.get("/", response_model=List[schemas.Notebook])
async def read_notebooks(
    skip: int = 0, 
    limit: int = 100, 
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    # Determine the select statement
    stmt = select(models.Notebook).where(models.Notebook.user_id == current_user.id).offset(skip).limit(limit)
    result = await db.execute(stmt)
    notebooks = result.scalars().all()
    return notebooks

@router.post("/", response_model=schemas.Notebook)
async def create_notebook(
    notebook: schemas.NotebookCreate, 
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    new_notebook = models.Notebook(**notebook.model_dump(), user_id=current_user.id)
    db.add(new_notebook)
    await db.commit()
    await db.refresh(new_notebook)
    return new_notebook

@router.delete("/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notebook(
    notebook_id: int, 
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    stmt = select(models.Notebook).where(models.Notebook.id == notebook_id, models.Notebook.user_id == current_user.id)
    result = await db.execute(stmt)
    notebook = result.scalars().first()
    
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
        
    await db.delete(notebook)
    await db.commit()
