from fastapi import APIRouter, HTTPException, Depends
from typing import List
from bson import ObjectId

from app.models import Portfolio, PortfolioCreate, PortfolioItem, PortfolioItemCreate, Section, SectionCreate
from app.database import get_database
from app.utils.validation import validate_portfolio_id, validate_item_id, validate_section_id
from app.utils.database import get_portfolio_or_404, get_item_or_404, get_section_or_404, remove_item_from_portfolio, remove_section_from_portfolio
from app.utils.file_management import cleanup_item_files, cleanup_portfolio_files

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
    portfolio = await get_portfolio_or_404(db, portfolio_id)
    return Portfolio(**portfolio)

@router.put("/portfolios/{portfolio_id}", response_model=Portfolio)
async def update_portfolio(portfolio_id: str, portfolio: PortfolioCreate, db=Depends(get_database)):
    """Update a portfolio"""
    portfolio_obj_id = validate_portfolio_id(portfolio_id)
    
    update_data = portfolio.dict()
    
    result = await db.portfolios.update_one(
        {"_id": portfolio_obj_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    updated_portfolio = await db.portfolios.find_one({"_id": ObjectId(portfolio_id)})
    return Portfolio(**updated_portfolio)


@router.post("/portfolios/{portfolio_id}/items", response_model=PortfolioItem)
async def create_portfolio_item(portfolio_id: str, item: dict, db=Depends(get_database)):
    """Add an item to a portfolio"""
    # Check if portfolio exists
    portfolio = await get_portfolio_or_404(db, portfolio_id)
    portfolio_obj_id = validate_portfolio_id(portfolio_id)
    
    # Create item
    item["_id"] = ObjectId()
    new_item = PortfolioItem(**item)
    
    # Add to portfolio
    await db.portfolios.update_one(
        {"_id": portfolio_obj_id},
        {"$push": {"items": new_item.dict()}}
    )
    
    return new_item

@router.patch("/portfolios/{portfolio_id}/items/{item_id}")
async def update_portfolio_item(portfolio_id: str, item_id: str, update_data: dict, db=Depends(get_database)):
    """Update a portfolio item"""
    print(f"🚀 PATCH endpoint called: portfolio_id={portfolio_id}, item_id={item_id}")
    print(f"📝 Update data: {update_data}")
    
    # Validate IDs and get portfolio and item
    portfolio, item = await get_item_or_404(db, portfolio_id, item_id)
    print(f"✅ get_item_or_404 succeeded")
    portfolio_obj_id = validate_portfolio_id(portfolio_id)
    item_obj_id = validate_item_id(item_id)
    
    # Find the item index for updating
    item_index = None
    print(f"🔍 Looking for item index...")
    
    for i, portfolio_item in enumerate(portfolio.get("items", [])):
        item_id_field = portfolio_item.get("_id") or portfolio_item.get("id")
        print(f"  Item {i}: {item_id_field} == {item_obj_id}? {item_id_field == item_obj_id}")
        print(f"  Item {i}: str({item_id_field}) == {item_id}? {str(item_id_field) == item_id}")
        
        # Try both ObjectId and string comparison
        if item_id_field == item_obj_id or str(item_id_field) == item_id:
            item_index = i
            print(f"✅ Found item at index {i}")
            break
    
    if item_index is None:
        print(f"❌ Item index not found - raising 404")
        raise HTTPException(status_code=404, detail="Item not found in portfolio")
    
    print(f"📍 Using item index: {item_index}")
    
    # Build the update query using the array position
    update_query = {}
    for key, value in update_data.items():
        update_query[f"items.{item_index}.{key}"] = value
    
    # Update the specific item using positional update
    print(f"💾 Executing MongoDB update: {update_query}")
    result = await db.portfolios.update_one(
        {"_id": portfolio_obj_id},
        {"$set": update_query}
    )
    print(f"📊 Update result: matched={result.matched_count}, modified={result.modified_count}")
    
    if result.matched_count == 0:
        print(f"❌ Portfolio not found during update - raising 404")
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Fetch and return the updated portfolio to get the updated item
    updated_portfolio = await db.portfolios.find_one({"_id": portfolio_obj_id})
    print(f"🔄 Fetched updated portfolio")
    
    # Find and return the updated item
    for portfolio_item in updated_portfolio.get("items", []):
        item_object_id = portfolio_item.get("_id") or portfolio_item.get("id")
        # Try both ObjectId and string comparison (same as find_item_by_id)
        if item_object_id == item_obj_id or str(item_object_id) == item_id:
            print(f"✅ Found updated item, returning it")
            return portfolio_item
    
    print(f"❌ Updated item not found after update - raising 404")
    raise HTTPException(status_code=404, detail="Updated item not found")

@router.delete("/portfolios/{portfolio_id}/items/{item_id}")
async def delete_portfolio_item(portfolio_id: str, item_id: str, db=Depends(get_database)):
    """Delete an item from a portfolio"""
    print(f"🗑️ DELETE endpoint called: portfolio_id={portfolio_id}, item_id={item_id}")
    
    # Get portfolio and item, validate they exist
    portfolio, item = await get_item_or_404(db, portfolio_id, item_id)
    print(f"✅ Found item to delete: {list(item.keys())}")
    
    # Create PortfolioItem object for cleanup
    try:
        print(f"🔧 Attempting to create PortfolioItem object...")
        portfolio_item = PortfolioItem(**item)
        print(f"✅ Successfully created PortfolioItem object")
    except Exception as e:
        print(f"❌ Error creating PortfolioItem: {str(e)}")
        print(f"📋 Item data: {item}")
        raise HTTPException(status_code=500, detail=f"Error creating PortfolioItem: {str(e)}")
    
    # Remove item from portfolio
    print(f"🔄 Removing item from portfolio...")
    removed = await remove_item_from_portfolio(db, portfolio_id, item_id)
    
    if not removed:
        print(f"❌ Item removal failed")
        raise HTTPException(status_code=500, detail="Item deletion failed")
    
    print(f"✅ Item removed from portfolio")
    
    # Delete physical files
    print(f"🗂️ Cleaning up physical files...")
    cleanup_item_files(portfolio_item)
    print(f"✅ Physical files cleaned up")
    
    return {"message": "Item deleted successfully"}

@router.delete("/portfolios/{portfolio_id}")
async def delete_portfolio(portfolio_id: str, db=Depends(get_database)):
    """Delete an entire portfolio and all its files"""
    # Get portfolio and validate it exists
    portfolio = await get_portfolio_or_404(db, portfolio_id)
    portfolio_obj_id = validate_portfolio_id(portfolio_id)
    
    # Create PortfolioItem objects for cleanup
    portfolio_items = [PortfolioItem(**item) for item in portfolio.get("items", [])]
    
    # Delete all physical files
    cleanup_portfolio_files(portfolio_items)
    
    # Delete portfolio from database
    result = await db.portfolios.delete_one({"_id": portfolio_obj_id})
    
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
            "sections.$.order": section.order
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