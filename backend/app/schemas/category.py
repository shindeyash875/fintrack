import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


def normalize_title_case(name: str) -> str:
    cleaned = " ".join(name.strip().split())
    return " ".join(word.capitalize() for word in cleaned.split(" "))


class CategoryBase(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Category name, must be unique and non-empty",
    )

    @field_validator("name")
    @classmethod
    def validate_and_normalize_name(cls, v: str) -> str:
        trimmed = " ".join(v.strip().split())
        if not trimmed:
            raise ValueError("Category name cannot be empty or only whitespace")
        if len(trimmed) > 50:
            raise ValueError("Category name cannot exceed 50 characters")
        return normalize_title_case(trimmed)


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
