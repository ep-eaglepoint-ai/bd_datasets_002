from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db, engine, Base
from schemas import (
    ProductResponse, ProductListResponse, ProductCreate, ProductUpdate,
    CategoryResponse, InventoryResponse
)
import crud

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Product Catalog API")


def build_product_response(product, db: Session) -> ProductResponse:
    avg_rating = crud.calculate_average_rating(db, product.id)
    
    inventory_response = None
    if product.inventory:
        available = product.inventory.quantity - product.inventory.reserved
        inventory_response = InventoryResponse(
            quantity=product.inventory.quantity,
            reserved=product.inventory.reserved,
            available=available,
            in_stock=available > 0
        )
    
    return ProductResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        price=product.price,
        category_id=product.category_id,
        is_active=product.is_active,
        created_at=product.created_at,
        category=product.category,
        reviews=product.reviews,
        inventory=inventory_response,
        average_rating=avg_rating,
        review_count=len(product.reviews)
    )


@app.get("/products", response_model=ProductListResponse)
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db)
):
    skip = (page - 1) * page_size
    products, total = crud.get_products(db, skip, page_size, category_id, is_active)
    
    items = [build_product_response(p, db) for p in products]
    
    total_pages = (total + page_size - 1) // page_size
    
    return ProductListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@app.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = crud.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return build_product_response(product, db)


@app.post("/products", response_model=ProductResponse, status_code=201)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    db_product = crud.create_product(db, product)
    return build_product_response(db_product, db)


@app.put("/products/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, product: ProductUpdate, db: Session = Depends(get_db)):
    db_product = crud.update_product(db, product_id, product)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return build_product_response(db_product, db)


@app.delete("/products/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    success = crud.delete_product(db, product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")


@app.get("/categories", response_model=List[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return crud.get_categories(db)


@app.get("/categories/{category_id}/products", response_model=List[ProductResponse])
def get_category_products(category_id: int, db: Session = Depends(get_db)):
    products = crud.get_category_products(db, category_id)
    return [build_product_response(p, db) for p in products]


@app.get("/products/batch", response_model=List[ProductResponse])
def get_products_batch(
    ids: str = Query(..., description="Comma-separated product IDs"),
    db: Session = Depends(get_db)
):
    product_ids = [int(id.strip()) for id in ids.split(",")]
    products = crud.get_products_by_ids(db, product_ids)
    return [build_product_response(p, db) for p in products]


@app.get("/inventory/low-stock", response_model=List[ProductResponse])
def get_low_stock(
    threshold: int = Query(10, ge=1),
    db: Session = Depends(get_db)
):
    products = crud.get_low_stock_products(db, threshold)
    return [build_product_response(p, db) for p in products]


@app.get("/health")
def health_check():
    return {"status": "healthy"}

