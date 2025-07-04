from fastapi import APIRouter, HTTPException, Depends
from typing import List
from bson import ObjectId

from app.models import Portfolio, PortfolioCreate, PortfolioItem, PortfolioItemCreate, Section, SectionCreate
from app.database import get_database

router = APIRouter()

@router.post("/portfolios", response_model=Portfolio)
async def create_portfolio(portfolio: PortfolioCreate, db=Depends(get_database)):
    """Create a new portfolio"""
    portfolio_dict = portfolio.dict()
    portfolio_dict["items"] = []
    portfolio_dict["sections"] = []
    
    result = await db.portfolios.insert_one(portfolio_dict)
    created_portfolio = await db.portfolios.find_one({"_id": result.inserted_id})
    
    return Portfolio(**created_portfolio)

@router.get("/portfolios/{portfolio_id}", response_model=Portfolio)
async def get_portfolio(portfolio_id: str, db=Depends(get_database)):
    """Get a portfolio by ID"""
    if not ObjectId.is_valid(portfolio_id):
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    
    portfolio = await db.portfolios.find_one({"_id": ObjectId(portfolio_id)})
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    return Portfolio(**portfolio)

@router.put("/portfolios/{portfolio_id}", response_model=Portfolio)
async def update_portfolio(portfolio_id: str, portfolio: PortfolioCreate, db=Depends(get_database)):
    """Update a portfolio"""
    if not ObjectId.is_valid(portfolio_id):
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    
    update_data = portfolio.dict()
    update_data["updated_at"] = None  # Will be set by default_factory
    
    result = await db.portfolios.update_one(
        {"_id": ObjectId(portfolio_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    updated_portfolio = await db.portfolios.find_one({"_id": ObjectId(portfolio_id)})
    return Portfolio(**updated_portfolio)


@router.post("/portfolios/{portfolio_id}/items", response_model=PortfolioItem)
async def create_portfolio_item(portfolio_id: str, item: dict, db=Depends(get_database)):
    """Add an item to a portfolio"""
    if not ObjectId.is_valid(portfolio_id):
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    
    # Check if portfolio exists
    portfolio = await db.portfolios.find_one({"_id": ObjectId(portfolio_id)})
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Create item
    item["_id"] = ObjectId()
    new_item = PortfolioItem(**item)
    
    # Add to portfolio
    await db.portfolios.update_one(
        {"_id": ObjectId(portfolio_id)},
        {"$push": {"items": new_item.dict()}}
    )
    
    return new_item

@router.patch("/portfolios/{portfolio_id}/items/{item_id}")
async def update_portfolio_item(portfolio_id: str, item_id: str, update_data: dict, db=Depends(get_database)):
    """Update a portfolio item"""
    if not ObjectId.is_valid(portfolio_id):
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
    
    # First, find the portfolio to verify it exists
    portfolio = await db.portfolios.find_one({"_id": ObjectId(portfolio_id)})
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Find the item to verify it exists and get its position
    item_found = False
    item_index = None
    
    for i, item in enumerate(portfolio.get("items", [])):
        # Handle different possible ID field names and types
        item_object_id = item.get("_id") or item.get("id")
        
        # Convert to string for comparison if it's an ObjectId
        if isinstance(item_object_id, ObjectId):
            item_id_str = str(item_object_id)
        else:
            item_id_str = str(item_object_id) if item_object_id else None
            
        if item_id_str == item_id:
            item_found = True
            item_index = i
            break
    
    if not item_found:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Build the update query using the array position
    update_query = {}
    for key, value in update_data.items():
        update_query[f"items.{item_index}.{key}"] = value
    
    # Update the specific item using positional update
    result = await db.portfolios.update_one(
        {"_id": ObjectId(portfolio_id)},
        {"$set": update_query}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Fetch and return the updated portfolio to get the updated item
    updated_portfolio = await db.portfolios.find_one({"_id": ObjectId(portfolio_id)})
    
    # Find and return the updated item
    for item in updated_portfolio.get("items", []):
        item_object_id = item.get("_id") or item.get("id")
        if isinstance(item_object_id, ObjectId):
            item_id_str = str(item_object_id)
        else:
            item_id_str = str(item_object_id) if item_object_id else None
            
        if item_id_str == item_id:
            return item
    
    raise HTTPException(status_code=404, detail="Updated item not found")

@router.delete("/portfolios/{portfolio_id}/items/{item_id}")
async def delete_portfolio_item(portfolio_id: str, item_id: str, db=Depends(get_database)):
    """Delete an item from a portfolio"""
    if not ObjectId.is_valid(portfolio_id):
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
    
    # Find the portfolio and item
    portfolio = await db.portfolios.find_one({"_id": ObjectId(portfolio_id)})
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Find the item to get file info before deletion
    item_to_delete = None
    
    for item in portfolio.get("items", []):
        # Handle different possible ID field names and types
        item_object_id = item.get("_id") or item.get("id")
        
        # Convert to string for comparison if it's an ObjectId
        if isinstance(item_object_id, ObjectId):
            item_id_str = str(item_object_id)
        else:
            item_id_str = str(item_object_id) if item_object_id else None
            
        if item_id_str == item_id:
            item_to_delete = item
            break
    
    if not item_to_delete:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Convert item_id to ObjectId for deletion query
    item_object_id = ObjectId(item_id)
    
    # Remove item from portfolio - check multiple possible field patterns
    result = await db.portfolios.update_one(
        {"_id": ObjectId(portfolio_id)},
        {"$pull": {"items": {"$or": [
            {"_id": item_object_id},
            {"id": item_object_id},
            {"_id": item_id},  # String version
            {"id": item_id}    # String version
        ]}}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Verify the item was actually deleted
    updated_portfolio = await db.portfolios.find_one({"_id": ObjectId(portfolio_id)})
    remaining_items = len(updated_portfolio.get("items", []))
    original_items = len(portfolio.get("items", []))
    
    if remaining_items >= original_items:
        raise HTTPException(status_code=500, detail="Item deletion failed - item still exists in database")
    
    # Delete physical files
    import os
    try:
        # Delete main file
        if item_to_delete.get("filename"):
            file_path = os.path.join("uploads", item_to_delete["filename"])
            if os.path.exists(file_path):
                os.remove(file_path)
        
        # Delete thumbnail if it exists
        if item_to_delete.get("thumbnail_url"):
            thumbnail_filename = item_to_delete["thumbnail_url"].replace("/uploads/", "")
            thumbnail_path = os.path.join("uploads", thumbnail_filename)
            if os.path.exists(thumbnail_path):
                os.remove(thumbnail_path)
                
    except Exception as e:
        print(f"Warning: Failed to delete files: {e}")
        # Continue even if file deletion fails
    
    return {"message": "Item deleted successfully", "items_removed": original_items - remaining_items}

@router.delete("/portfolios/{portfolio_id}")
async def delete_portfolio(portfolio_id: str, db=Depends(get_database)):
    """Delete an entire portfolio and all its files"""
    if not ObjectId.is_valid(portfolio_id):
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    
    # Find the portfolio to get file info before deletion
    portfolio = await db.portfolios.find_one({"_id": ObjectId(portfolio_id)})
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Delete all physical files
    import os
    try:
        for item in portfolio.get("items", []):
            # Delete main file
            if item.get("filename"):
                file_path = os.path.join("uploads", item["filename"])
                if os.path.exists(file_path):
                    os.remove(file_path)
            
            # Delete thumbnail if it exists
            if item.get("thumbnail_url"):
                thumbnail_filename = item["thumbnail_url"].replace("/uploads/", "")
                thumbnail_path = os.path.join("uploads", thumbnail_filename)
                if os.path.exists(thumbnail_path):
                    os.remove(thumbnail_path)
                    
    except Exception as e:
        print(f"Warning: Failed to delete some files: {e}")
    
    # Delete portfolio from database
    result = await db.portfolios.delete_one({"_id": ObjectId(portfolio_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    return {"message": "Portfolio deleted successfully"}


@router.get("/portfolios")
async def list_portfolios(db=Depends(get_database)):
    """List all portfolios (basic info only)"""
    portfolios = []
    async for portfolio in db.portfolios.find({}, {"title": 1, "description": 1, "created_at": 1}):
        portfolios.append({
            "id": str(portfolio["_id"]),
            "title": portfolio["title"],
            "description": portfolio.get("description"),
            "created_at": portfolio.get("created_at")
        })
    
    return portfolios


# Section endpoints
@router.post("/portfolios/{portfolio_id}/sections", response_model=Section)
async def create_section(portfolio_id: str, section: SectionCreate, db=Depends(get_database)):
    """Create a new section in a portfolio"""
    if not ObjectId.is_valid(portfolio_id):
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    
    # Check if portfolio exists
    portfolio = await db.portfolios.find_one({"_id": ObjectId(portfolio_id)})
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Create section
    section_dict = section.dict()
    section_dict["_id"] = ObjectId()
    new_section = Section(**section_dict)
    
    # Add to portfolio
    await db.portfolios.update_one(
        {"_id": ObjectId(portfolio_id)},
        {"$push": {"sections": new_section.dict()}}
    )
    
    return new_section

@router.get("/portfolios/{portfolio_id}/sections")
async def list_sections(portfolio_id: str, db=Depends(get_database)):
    """List all sections in a portfolio"""
    if not ObjectId.is_valid(portfolio_id):
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    
    portfolio = await db.portfolios.find_one({"_id": ObjectId(portfolio_id)})
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    sections = portfolio.get("sections", [])
    return [Section(**section) for section in sections]

@router.put("/portfolios/{portfolio_id}/sections/{section_id}", response_model=Section)
async def update_section(portfolio_id: str, section_id: str, section: SectionCreate, db=Depends(get_database)):
    """Update a section"""
    if not ObjectId.is_valid(portfolio_id):
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    if not ObjectId.is_valid(section_id):
        raise HTTPException(status_code=400, detail="Invalid section ID")
    
    # Update section in portfolio
    result = await db.portfolios.update_one(
        {"_id": ObjectId(portfolio_id), "sections._id": ObjectId(section_id)},
        {"$set": {
            "sections.$.title": section.title,
            "sections.$.description": section.description,
            "sections.$.order": section.order,
            "sections.$.updated_at": None  # Will be set by default_factory
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Portfolio or section not found")
    
    # Return updated section
    portfolio = await db.portfolios.find_one({"_id": ObjectId(portfolio_id)})
    for section_data in portfolio.get("sections", []):
        if str(section_data["_id"]) == section_id:
            return Section(**section_data)
    
    raise HTTPException(status_code=404, detail="Section not found")

@router.delete("/portfolios/{portfolio_id}/sections/{section_id}")
async def delete_section(portfolio_id: str, section_id: str, db=Depends(get_database)):
    """Delete a section from a portfolio"""
    if not ObjectId.is_valid(portfolio_id):
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    if not ObjectId.is_valid(section_id):
        raise HTTPException(status_code=400, detail="Invalid section ID")
    
    # Check if portfolio exists
    portfolio = await db.portfolios.find_one({"_id": ObjectId(portfolio_id)})
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Move items in this section to unsorted (remove section_id)
    await db.portfolios.update_one(
        {"_id": ObjectId(portfolio_id)},
        {"$unset": {"items.$[elem].section_id": ""}},
        array_filters=[{"elem.section_id": section_id}]  # Use string, not ObjectId
    )
    
    # Remove section from portfolio
    result = await db.portfolios.update_one(
        {"_id": ObjectId(portfolio_id)},
        {"$pull": {"sections": {"id": section_id}}}  # Use "id" field, not "_id"
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    return {"message": "Section deleted successfully"}