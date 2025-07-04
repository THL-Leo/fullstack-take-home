from typing import Optional, Dict, Any
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from .validation import validate_object_id


async def get_portfolio_or_404(db: AsyncIOMotorDatabase, portfolio_id: str) -> Dict[str, Any]:
    """
    Get portfolio by ID or raise 404 error.
    
    Args:
        db: Database instance
        portfolio_id: Portfolio ID string
        
    Returns:
        Dict: Portfolio document
        
    Raises:
        HTTPException: If portfolio not found
    """
    portfolio_obj_id = validate_object_id(portfolio_id)
    portfolio = await db.portfolios.find_one({"_id": portfolio_obj_id})
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    return portfolio


async def get_section_or_404(db: AsyncIOMotorDatabase, portfolio_id: str, section_id: str) -> Dict[str, Any]:
    """
    Get section by ID from portfolio or raise 404 error.
    
    Args:
        db: Database instance
        portfolio_id: Portfolio ID string
        section_id: Section ID string
        
    Returns:
        Dict: Section document
        
    Raises:
        HTTPException: If portfolio or section not found
    """
    portfolio = await get_portfolio_or_404(db, portfolio_id)
    section_obj_id = validate_object_id(section_id)
    
    section = next((s for s in portfolio.get("sections", []) if s["_id"] == section_obj_id), None)
    
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    
    return section


def find_item_by_id(portfolio: Dict[str, Any], item_id: str) -> Optional[Dict[str, Any]]:
    """
    Find item by ID in portfolio, handling both _id and id fields.
    
    Args:
        portfolio: Portfolio document
        item_id: Item ID string
        
    Returns:
        Dict or None: Item document if found
    """
    item_obj_id = validate_object_id(item_id)
    print(f"🔍 find_item_by_id: Looking for {item_id} (as ObjectId: {item_obj_id})")
    
    for i, item in enumerate(portfolio.get("items", [])):
        # Handle both _id and id fields
        item_id_field = item.get("_id") or item.get("id")
        
        print(f"  Checking item {i}: {item_id_field} == {item_obj_id}? {item_id_field == item_obj_id}")
        print(f"  Checking item {i}: str({item_id_field}) == {item_id}? {str(item_id_field) == item_id}")
        
        # Try both ObjectId and string comparison
        if item_id_field == item_obj_id or str(item_id_field) == item_id:
            print(f"✅ Found matching item!")
            print(f"  Full item structure: {list(item.keys())}")
            print(f"  Item _id: {item.get('_id')}")
            print(f"  Item id: {item.get('id')}")
            return item
    
    print(f"❌ No matching item found")
    return None


async def get_item_or_404(db: AsyncIOMotorDatabase, portfolio_id: str, item_id: str) -> tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Get item by ID from portfolio or raise 404 error.
    
    Args:
        db: Database instance
        portfolio_id: Portfolio ID string
        item_id: Item ID string
        
    Returns:
        tuple: (portfolio, item) documents
        
    Raises:
        HTTPException: If portfolio or item not found
    """
    print(f"🔍 Looking for item {item_id} in portfolio {portfolio_id}")
    portfolio = await get_portfolio_or_404(db, portfolio_id)
    print(f"✅ Found portfolio with {len(portfolio.get('items', []))} items")
    
    for i, portfolio_item in enumerate(portfolio.get("items", [])):
        item_id_field = portfolio_item.get("_id") or portfolio_item.get("id")
        print(f"  Item {i}: ID field = {item_id_field} (type: {type(item_id_field)})")
    
    item = find_item_by_id(portfolio, item_id)
    print(f"🔍 find_item_by_id result: {item is not None}")
    
    if not item:
        print(f"❌ Item {item_id} not found in portfolio {portfolio_id}")
        raise HTTPException(status_code=404, detail="Item not found")
    
    item_id_field = item.get('_id') or item.get('id')
    print(f"✅ Found item: {item_id_field}")
    return portfolio, item





async def remove_item_from_portfolio(db: AsyncIOMotorDatabase, portfolio_id: str, item_id: str) -> bool:
    """
    Remove item from portfolio items array.
    
    Args:
        db: Database instance
        portfolio_id: Portfolio ID string
        item_id: Item ID string
        
    Returns:
        bool: True if item was removed, False otherwise
    """
    portfolio_obj_id = validate_object_id(portfolio_id)
    item_obj_id = validate_object_id(item_id)
    
    print(f"🗑️ remove_item_from_portfolio: portfolio_id={portfolio_id}, item_id={item_id}")
    print(f"   ObjectId conversion: {item_obj_id}")
    
    # Try to remove by _id field (ObjectId)
    result = await db.portfolios.update_one(
        {"_id": portfolio_obj_id},
        {"$pull": {"items": {"_id": item_obj_id}}}
    )
    
    print(f"📊 Remove by _id result: matched={result.matched_count}, modified={result.modified_count}")
    
    # If that didn't work, try to remove by id field (string)
    if result.modified_count == 0:
        print(f"🔄 Trying to remove by id field (string)...")
        result = await db.portfolios.update_one(
            {"_id": portfolio_obj_id},
            {"$pull": {"items": {"id": item_id}}}
        )
        print(f"📊 Remove by id result: matched={result.matched_count}, modified={result.modified_count}")
    
    success = result.modified_count > 0
    print(f"✅ Item removal {'succeeded' if success else 'failed'}")
    return success


async def remove_section_from_portfolio(db: AsyncIOMotorDatabase, portfolio_id: str, section_id: str) -> bool:
    """
    Remove section from portfolio sections array.
    
    Args:
        db: Database instance
        portfolio_id: Portfolio ID string
        section_id: Section ID string
        
    Returns:
        bool: True if section was removed, False otherwise
    """
    portfolio_obj_id = validate_object_id(portfolio_id)
    section_obj_id = validate_object_id(section_id)
    
    result = await db.portfolios.update_one(
        {"_id": portfolio_obj_id},
        {"$pull": {"sections": {"_id": section_obj_id}}}
    )
    
    return result.modified_count > 0