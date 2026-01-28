from sqlalchemy.orm import Session
from typing import List, Optional

from models import Product, Category, Review, Inventory
from schemas import ProductCreate, ProductUpdate


def get_products(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    category_id: Optional[int] = None,
    is_active: Optional[bool] = True
) -> tuple[List[Product], int]:
    query = db.query(Product)
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
    
    total = query.count()
    products = query.offset(skip).limit(limit).all()
    
    for product in products:
        category = db.query(Category).filter(Category.id == product.category_id).first()
        product.category = category
        
        reviews = db.query(Review).filter(Review.product_id == product.id).all()
        product.reviews = reviews
        
        inventory = db.query(Inventory).filter(Inventory.product_id == product.id).first()
        product.inventory = inventory
    
    return products, total


def get_product(db: Session, product_id: int) -> Optional[Product]:
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if product:
        product.category = db.query(Category).filter(Category.id == product.category_id).first()
        product.reviews = db.query(Review).filter(Review.product_id == product.id).all()
        product.inventory = db.query(Inventory).filter(Inventory.product_id == product.id).first()
    
    return product


def get_products_by_ids(db: Session, product_ids: List[int]) -> List[Product]:
    products = []
    for product_id in product_ids:
        product = get_product(db, product_id)
        if product:
            products.append(product)
    return products


def create_product(db: Session, product: ProductCreate) -> Product:
    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


def update_product(db: Session, product_id: int, product: ProductUpdate) -> Optional[Product]:
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        return None
    
    update_data = product.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_product, field, value)
    
    db.commit()
    db.refresh(db_product)
    return db_product


def delete_product(db: Session, product_id: int) -> bool:
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        return False
    
    db.delete(db_product)
    db.commit()
    return True


def get_categories(db: Session) -> List[Category]:
    return db.query(Category).all()


def get_category_products(db: Session, category_id: int) -> List[Product]:
    products = db.query(Product).filter(Product.category_id == category_id).all()
    
    for product in products:
        product.reviews = db.query(Review).filter(Review.product_id == product.id).all()
        product.inventory = db.query(Inventory).filter(Inventory.product_id == product.id).first()
    
    return products


def calculate_average_rating(db: Session, product_id: int) -> Optional[float]:
    reviews = db.query(Review).filter(Review.product_id == product_id).all()
    if not reviews:
        return None
    return sum(r.rating for r in reviews) / len(reviews)


def get_low_stock_products(db: Session, threshold: int = 10) -> List[Product]:
    products = db.query(Product).all()
    low_stock = []
    
    for product in products:
        inventory = db.query(Inventory).filter(Inventory.product_id == product.id).first()
        if inventory and (inventory.quantity - inventory.reserved) < threshold:
            product.inventory = inventory
            low_stock.append(product)
    
    return low_stock

