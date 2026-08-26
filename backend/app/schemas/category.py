import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CategoryBase(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Category name, must be unique and non-empty",
    )


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(CategoryBase):
    pass


class CategoryRead(CategoryBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    expense_count: Optional[int] = Field(default=0, description="Total expenses linked to this category")

    model_config = ConfigDict(from_attributes=True)
