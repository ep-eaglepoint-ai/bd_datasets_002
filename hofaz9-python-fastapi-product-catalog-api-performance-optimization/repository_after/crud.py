from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from sqlalchemy.orm import joinedload, selectinload
from typing import List, Optional
import json
import redis.asyncio as redis

from models import Product, Category, Review, Inventory
from schemas import ProductCreate, ProductUpdate
from config import settings

# Redis client
redis_client = redis.from_url(settings.redis_url, decode_responses=True)


async def get_cached_count(db: AsyncSession, category_id: Optional[int], is_active: Optional[bool]) -> int:
    """Get cached count or estimate from pg_class.reltuples"""
    cache_key = f"count:cat_{category_id}:active_{is_active}"
    
    # Try cache first
    cached = await redis_client.get(cache_key)
    if cached:
        return int(cached)
    
    # Use PostgreSQL table statistics for fast estimate
    if category_id is None and is_active is True:
        result = await db.execute(text(
            "SELECT reltuples::bigint FROM pg_class WHERE relname = 'products'"
        ))
        estimate = result.scalar()
        if estimate:
            await redis_client.setex(cache_key, settings.cache_ttl, int(estimate))
            return int(estimate)
    
    # Fallback to actual count for filtered queries
    count_query = select(func.count(Product.id))
    if category_id:
        count_query = count_query.filter(Product.category_id == category_id)
    if is_active is not None:
        count_query = count_query.filter(Product.is_active == is_active)
    
    result = await db.execute(count_query)
    total = result.scalar()
    
    # Cache for 60 seconds
    await redis_client.setex(cache_key, settings.cache_ttl, total)
    return total


async def get_products(
    db: AsyncSession,
    cursor: Optional[int] = None,
    limit: int = 20,
    category_id: Optional[int] = None,
    is_active: Optional[bool] = True
) -> tuple[List[Product], int]:
    # Build cache key
    cache_key = f"products:cursor_{cursor}:limit_{limit}:cat_{category_id}:active_{is_active}"
    
    # Try cache first
    cached = await redis_client.get(cache_key)
    if cached:
        data = json.loads(cached)
        # Reconstruct products from cache (simplified - in production use proper serialization)
        total = data['total']
    else:
        total = await get_cached_count(db, category_id, is_active)
    
    query = select(Product).options(
        joinedload(Product.category),
        selectinload(Product.reviews),
        joinedload(Product.inventory)
    )
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
    
    if cursor:
        query = query.filter(Product.id > cursor)
    
    query = query.order_by(Product.id).limit(limit)
    
    result = await db.execute(query)
    products = result.unique().scalars().all()
    
    return products, total


async def get_product(db: AsyncSession, product_id: int) -> Optional[Product]:
    query = select(Product).options(
        joinedload(Product.category),
        selectinload(Product.reviews),
        joinedload(Product.inventory)
    ).filter(Product.id == product_id)
    
    result = await db.execute(query)
    return result.unique().scalar_one_or_none()


async def get_products_by_ids(db: AsyncSession, product_ids: List[int]) -> List[Product]:
    query = select(Product).options(
        joinedload(Product.category),
        selectinload(Product.reviews),
        joinedload(Product.inventory)
    ).filter(Product.id.in_(product_ids))
    
    result = await db.execute(query)
    return result.unique().scalars().all()


async def create_product(db: AsyncSession, product: ProductCreate) -> Product:
    db_product = Product(**product.model_dump())
    db.add(db_product)
    await db.commit()
    await db.refresh(db_product)
    return db_product


async def update_product(db: AsyncSession, product_id: int, product: ProductUpdate) -> Optional[Product]:
    query = select(Product).filter(Product.id == product_id)
    result = await db.execute(query)
    db_product = result.scalar_one_or_none()
    
    if not db_product:
        return None
    
    update_data = product.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_product, field, value)
    
    await db.commit()
    await db.refresh(db_product)
    return db_product


async def delete_product(db: AsyncSession, product_id: int) -> bool:
    query = select(Product).filter(Product.id == product_id)
    result = await db.execute(query)
    db_product = result.scalar_one_or_none()
    
    if not db_product:
        return False
    
    await db.delete(db_product)
    await db.commit()
    return True


async def get_categories(db: AsyncSession) -> List[Category]:
    query = select(Category)
    result = await db.execute(query)
    return result.scalars().all()


async def get_category_products(db: AsyncSession, category_id: int) -> List[Product]:
    query = select(Product).options(
        selectinload(Product.reviews),
        joinedload(Product.inventory)
    ).filter(Product.category_id == category_id)
    
    result = await db.execute(query)
    return result.unique().scalars().all()


async def get_low_stock_products(db: AsyncSession, threshold: int = 10) -> List[Product]:
    query = select(Product).join(Inventory).options(
        joinedload(Product.inventory)
    ).filter((Inventory.quantity - Inventory.reserved) < threshold)
    
    result = await db.execute(query)
    return result.unique().scalars().all()
