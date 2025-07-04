from functools import wraps
from typing import Any, Callable
from fastapi import HTTPException
from bson import ObjectId


def validate_object_id(obj_id: str) -> ObjectId:
    """
    Validate and convert string to ObjectId.
    
    Args:
        obj_id: String representation of ObjectId
        
    Returns:
        ObjectId: Valid ObjectId object
        
    Raises:
        HTTPException: If ObjectId is invalid
    """
    if not ObjectId.is_valid(obj_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    return ObjectId(obj_id)


def validate_portfolio_id(portfolio_id: str) -> ObjectId:
    """
    Validate and convert portfolio ID to ObjectId.
    
    Args:
        portfolio_id: String representation of portfolio ID
        
    Returns:
        ObjectId: Valid ObjectId object
        
    Raises:
        HTTPException: If portfolio ID is invalid
    """
    if not ObjectId.is_valid(portfolio_id):
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    return ObjectId(portfolio_id)


def validate_item_id(item_id: str) -> ObjectId:
    """
    Validate and convert item ID to ObjectId.
    
    Args:
        item_id: String representation of item ID
        
    Returns:
        ObjectId: Valid ObjectId object
        
    Raises:
        HTTPException: If item ID is invalid
    """
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
    return ObjectId(item_id)


def validate_section_id(section_id: str) -> ObjectId:
    """
    Validate and convert section ID to ObjectId.
    
    Args:
        section_id: String representation of section ID
        
    Returns:
        ObjectId: Valid ObjectId object
        
    Raises:
        HTTPException: If section ID is invalid
    """
    if not ObjectId.is_valid(section_id):
        raise HTTPException(status_code=400, detail="Invalid section ID")
    return ObjectId(section_id)


def validate_object_ids(*field_names: str) -> Callable:
    """
    Decorator to validate ObjectId fields in route parameters.
    
    Args:
        *field_names: Names of fields to validate as ObjectIds
        
    Returns:
        Decorator function
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Validate specified ObjectId fields
            for field_name in field_names:
                if field_name in kwargs:
                    kwargs[field_name] = validate_object_id(kwargs[field_name])
            return await func(*args, **kwargs)
        return wrapper
    return decorator