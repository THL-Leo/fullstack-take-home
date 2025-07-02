import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

class MongoDB:
    client: AsyncIOMotorClient = None
    database = None

mongodb = MongoDB()

async def connect_to_mongo():
    """Create database connection"""
    mongodb.client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
    mongodb.database = mongodb.client.portfolio_db
    print("Connected to MongoDB")

async def close_mongo_connection():
    """Close database connection"""
    mongodb.client.close()
    print("Disconnected from MongoDB")

def get_database():
    """Get database instance"""
    return mongodb.database