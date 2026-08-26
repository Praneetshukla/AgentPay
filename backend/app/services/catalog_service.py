from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db.models import Product


class CatalogService:
    def __init__(self, db: Session):
        self.db = db

    def list_products(
        self,
        category: Optional[str] = None,
        search: Optional[str] = None,
        available_only: bool = False,
        active_only: bool = True
    ) -> List[Product]:
        query = select(Product)
        
        if active_only:
            query = query.where(Product.active.is_(True))
            
        if category:
            query = query.where(Product.category.ilike(f"%{category.strip()}%"))
            
        if search:
            search_pattern = f"%{search.strip()}%"
            query = query.where(
                (Product.name.ilike(search_pattern)) | 
                (Product.description.ilike(search_pattern)) |
                (Product.sku.ilike(search_pattern))
            )
            
        if available_only:
            query = query.where(Product.stock_quantity > 0)
            
        return list(self.db.scalars(query).all())

    def get_product_by_sku(self, sku: str) -> Optional[Product]:
        query = select(Product).where(Product.sku == sku.strip())
        return self.db.scalars(query).first()
