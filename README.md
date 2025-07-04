# Portfolio Management Application

A responsive, dynamic, single-page application built with **Next.js** and **FastAPI** for creating and managing multimedia portfolios. This implementation demonstrates modern full-stack development practices with advanced file handling, state management, and UI/UX design.

## 🎥 Demo Video

**[Watch the Live Demo](https://youtu.be/mZol5hNN06I)** - See the portfolio management application in action, showcasing file uploads, section organization, and responsive design.

## 🚀 Implementation Status

### ✅ **Completed Features**

#### Frontend (Next.js + React + TypeScript)
- **📁 Advanced File Upload**: Drag & drop interface with real-time preview, progress tracking, and comprehensive validation
- **🎨 Portfolio Management**: Complete CRUD operations with live preview and responsive design
- **📱 Modern UI/UX**: Mobile-first design with animations, modal system, and toast notifications
- **🗂️ Section Organization**: Expandable/collapsible sections with drag-and-drop item management
- **⚡ State Management**: Zustand store with local storage persistence and optimistic updates
- **🔄 API Integration**: Full REST API client with error handling and data transformation

#### Backend (FastAPI + MongoDB)
- **🛡️ Robust File Handling**: Multi-format support (images/videos) with FFmpeg video processing
- **📊 Rich Data Models**: Comprehensive Pydantic models with validation and metadata extraction
- **🗄️ Database Integration**: MongoDB with Motor for async operations and proper error handling
- **🎬 Media Processing**: Automatic thumbnail generation, metadata extraction, and file optimization
- **🧹 File Management**: Automatic cleanup, UUID-based naming, and safe file operations

### Features I wish I could implement
- **User Authentication & Multi-Tenancy**
- **Video Upload**: Divide the video into chunks and have parallel upload to reduce load on the server
- **Schema**: Better schema for the database
- **Code Cleanup**: I wish I have more time to clean up the code because it is quite messy

This represents the primary unfinished portion of the project.

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ 
- Python 3.8+
- MongoDB (local or cloud)
- FFmpeg (for video processing)

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:3000`

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
The API will be available at `http://localhost:8000`

### Environment Configuration
Create `.env` files in both directories:

**Frontend (.env.local):**
```
# Local development API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Backend (.env):**
```
# MongoDB connection string from Atlas
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/portfolio_db?retryWrites=true&w=majority

# API configuration
API_HOST=0.0.0.0
API_PORT=8000
```

## 📸 Features Walkthrough

### 🎯 **Core Functionality**
- **Drag & Drop Upload**: Intuitive file upload with real-time progress
- **Media Preview**: Instant thumbnails and metadata display
- **Section Management**: Organize items into collapsible categories
- **Live Portfolio View**: Real-time preview as you build
- **Responsive Design**: Works seamlessly on desktop and mobile


## 📋 **Technical Requirements Status**

### ✅ **Fully Implemented**
- File upload with preview ✅
- State management (Zustand) ✅
- Dynamic UI and metadata fields ✅
- Expandable/collapsible sections ✅
- Backend persistence with MongoDB ✅
- Pydantic data validation ✅
- Creative UI with live preview ✅
- Clean code organization ✅

### ❌ **Not Implemented**
- Multi-tenancy (user authentication) ❌
- User-specific portfolio access ❌


