from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import connect_to_mongo, close_mongo_connection

app = FastAPI(title="Portfolio API", version="1.0.0")

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
os.makedirs("uploads", exist_ok=True)

# Serve static files for uploaded media
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
from app.api import portfolios, upload
app.include_router(portfolios.router, prefix="/api", tags=["portfolios"])
app.include_router(upload.router, prefix="/api", tags=["upload"])

@app.get("/")
async def root():
    return {"message": "Portfolio API is running"}