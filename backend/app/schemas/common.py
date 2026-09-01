from typing import Generic, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationMeta(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    total: int = Field(default=0, ge=0)
    total_pages: int = Field(default=0, ge=0)


class ResponseEnvelope(BaseModel, Generic[T]):
    success: bool = True
    data: T
    meta: Optional[PaginationMeta] = None


class ErrorDetail(BaseModel):
    code: str
    message: str
    field: Optional[str] = None


class ErrorEnvelope(BaseModel):
    success: bool = False
    error: ErrorDetail


ApiResponse = ResponseEnvelope

