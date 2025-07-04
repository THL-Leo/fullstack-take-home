from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type, _handler):
        from pydantic_core import core_schema
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ])
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str):
            if ObjectId.is_valid(v):
                return ObjectId(v)
        raise ValueError("Invalid ObjectId")

class ItemMetadata(BaseModel):
    size: int
    dimensions: Optional[dict] = None
    duration: Optional[int] = None
    format: str

class PortfolioItemCreate(BaseModel):
    type: Literal['image', 'video']
    filename: str
    original_name: str
    title: str
    description: str = ""
    order: int = 0

class PortfolioItem(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    type: Literal['image', 'video']
    filename: str
    original_name: str
    url: str
    thumbnail_url: Optional[str] = None
    thumbnail_base64: Optional[str] = None
    title: str
    description: str = ""
    metadata: ItemMetadata
    section_id: Optional[str] = None  # Section assignment - can be ObjectId string or regular string
    order: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class SectionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    order: int = 0

class Section(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    title: str
    description: Optional[str] = None
    order: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class PortfolioCreate(BaseModel):
    title: str
    description: Optional[str] = None

class Portfolio(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    title: str
    description: Optional[str] = None
    items: List[PortfolioItem] = []  # Keep for backward compatibility
    sections: List[Section] = []  # New sections array
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}