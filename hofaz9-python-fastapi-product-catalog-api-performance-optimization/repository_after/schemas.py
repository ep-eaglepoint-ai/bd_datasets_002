from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class CategoryResponse(CategoryBase):
    id: int
    
    class Config:
        from_attributes = True


class ReviewBase(BaseModel):
    rating: int
    comment: Optional[str] = None


class ReviewResponse(ReviewBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class InventoryResponse(BaseModel):
    quantity: int
    reserved: int
    available: int
    in_stock: bool
    
    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category_id: Optional[int] = None


class ProductResponse(ProductBase):
    id: int
    is_active: bool
    created_at: datetime
    category: Optional[CategoryResponse] = None
    reviews: List[ReviewResponse] = []
    inventory: Optional[InventoryResponse] = None
    average_rating: Optional[float] = None
    review_count: int = 0
    
    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None
