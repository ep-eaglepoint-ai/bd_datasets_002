from fastapi import FastAPI, Depends, HTTPException, Query, Request, Response
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import time
import hashlib
import json

from database import get_db, engine, Base
from schemas import (
    ProductResponse, ProductListResponse, ProductCreate, ProductUpdate,
    CategoryResponse, InventoryResponse
)
import crud


app = FastAPI(title="Product Catalog API")
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    if duration > 0.2:
        print(f"SLOW REQUEST: {request.method} {request.url.path} took {duration:.3f}s")
    else:
        print(f"{request.method} {request.url.path} - {duration:.3f}s")
    
    return response


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


def build_product_response(product) -> ProductResponse:
    avg_rating = None
    if product.reviews:
        avg_rating = sum(r.rating for r in product.reviews) / len(product.reviews)
    
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


def generate_etag(data: str) -> str:
    return hashlib.md5(data.encode()).hexdigest()


@app.get("/products", response_model=ProductListResponse)
async def list_products(
    request: Request,
    cursor: Optional[int] = Query(None, description="Cursor for pagination (product ID)"),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = None,
    is_active: Optional[bool] = True,
    db: AsyncSession = Depends(get_db)
):
    products, total = await crud.get_products(db, cursor, page_size, category_id, is_active)
    
    items = [build_product_response(p) for p in products]
    
    # Calculate page info for compatibility
    next_cursor = products[-1].id if products else None
    page = 1  # Cursor-based doesn't have traditional pages
    total_pages = (total + page_size - 1) // page_size if total else 0
    
    response_data = ProductListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )
    
    content = response_data.model_dump_json()
    etag = generate_etag(content)
    
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304)
    
    headers = {"etag": etag}
    if next_cursor:
        headers["X-Next-Cursor"] = str(next_cursor)
    
    return Response(
        content=content,
        media_type="application/json",
        headers=headers
    )


@app.get("/products/batch", response_model=List[ProductResponse])
async def get_products_batch(
    ids: str = Query(..., description="Comma-separated product IDs"),
    db: AsyncSession = Depends(get_db)
):
    product_ids = [int(id.strip()) for id in ids.split(",")]
    products = await crud.get_products_by_ids(db, product_ids)
    return [build_product_response(p) for p in products]


@app.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await crud.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return build_product_response(product)


@app.post("/products", response_model=ProductResponse, status_code=201)
async def create_product(product: ProductCreate, db: AsyncSession = Depends(get_db)):
    db_product = await crud.create_product(db, product)
    return build_product_response(db_product)


@app.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: int, product: ProductUpdate, db: AsyncSession = Depends(get_db)):
    db_product = await crud.update_product(db, product_id, product)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return build_product_response(db_product)


@app.delete("/products/{product_id}", status_code=204)
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    success = await crud.delete_product(db, product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")


@app.get("/categories", response_model=List[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    return await crud.get_categories(db)


@app.get("/categories/{category_id}/products", response_model=List[ProductResponse])
async def get_category_products(category_id: int, db: AsyncSession = Depends(get_db)):
    products = await crud.get_category_products(db, category_id)
    return [build_product_response(p) for p in products]


@app.get("/inventory/low-stock", response_model=List[ProductResponse])
async def get_low_stock(
    threshold: int = Query(10, ge=1),
    db: AsyncSession = Depends(get_db)
):
    products = await crud.get_low_stock_products(db, threshold)
    return [build_product_response(p) for p in products]


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
