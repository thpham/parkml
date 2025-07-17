# ParkML Documentation

This directory contains comprehensive documentation for the ParkML project, a secure platform for Parkinson's disease symptom tracking.

## 📚 Documentation Overview

### Core Documentation
- **[PROGRESS.md](./PROGRESS.md)** - Current development status, completed features, and technical stack overview
- **[TODO.md](./TODO.md)** - Detailed task tracking with priorities and completion status
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture, database design, and system overview

### Project Documentation
- **[../README.md](../README.md)** - Project overview and introduction
- **[../DEVELOPMENT.md](../DEVELOPMENT.md)** - Development setup and workflow guide

## 🎯 Quick Links

### Current Status
- **Phase**: Phase 1 (Core Platform) - 87.5% Complete
- **Completed**: 8/12 tasks including full authentication, database layer, and UI components
- **Next Priority**: Security enhancement and form validation

### Key Features Implemented
- ✅ React/TypeScript frontend with Tailwind CSS
- ✅ Express/TypeScript backend with JWT authentication
- ✅ SQLite (dev) / PostgreSQL (prod) database abstraction
- ✅ Comprehensive symptom tracking forms
- ✅ Role-based access control (patient/caregiver/healthcare_provider)
- ✅ Responsive UI with mobile support

### Technical Stack
- **Frontend**: React 18.3.1, Vite 6.3.5, Tailwind CSS 3.4.17
- **Backend**: Express 4.21.2, Node.js 24.4.0, TypeScript 5.7.3
- **Database**: SQLite (dev) / PostgreSQL (prod) with custom abstraction layer
- **Authentication**: JWT tokens with bcrypt password hashing

## 📋 Task Breakdown

### High Priority (7/8 completed)
- ✅ Frontend & Backend Architecture
- ✅ Database Schema Design
- ✅ API Endpoints Implementation
- ✅ React Components Development
- ✅ Authentication System
- ✅ SQLite Development Setup
- ✅ Bug Fixes (Login page, concurrent dev)
- ⏳ **Data Encryption & Security** (Next)

### Medium Priority (1/3 completed)
- ✅ Responsive UI Design
- ⏳ Form Validation & Error Handling
- ⏳ Multilingual Support (French)

### Low Priority (0/1 completed)
- ⏳ Data Visualization Dashboard

## 🔍 Architecture Highlights

### Database Layer
- **Dual Database Support**: Seamless switching between SQLite (development) and PostgreSQL (production)
- **Auto-initialization**: SQLite schema created automatically on first run
- **JSON Compatibility**: Automatic conversion between SQLite TEXT and PostgreSQL JSONB

### Security Features
- **JWT Authentication**: 24-hour token expiration with secure secret management
- **Password Security**: bcrypt with 12 salt rounds
- **Role-Based Access**: Granular permissions for different user types
- **Input Validation**: Comprehensive sanitization and validation

### Development Experience
- **Zero Setup**: SQLite eliminates PostgreSQL requirement for local development
- **Hot Reload**: Automatic reloading for both frontend and backend
- **Type Safety**: Full TypeScript coverage across the entire monorepo
- **Concurrent Development**: Frontend (3000) and backend (5000) run simultaneously

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development**
   ```bash
   npm run dev
   ```

3. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

For detailed setup instructions, see [DEVELOPMENT.md](../DEVELOPMENT.md).

## 📊 Progress Tracking

The documentation in this folder is automatically maintained to reflect the current state of the project:

- **PROGRESS.md**: Updated with each major milestone
- **TODO.md**: Real-time task status tracking
- **ARCHITECTURE.md**: Technical documentation updates

## 📞 Support

For questions about the documentation or project:
- Review the relevant documentation files
- Check the [troubleshooting section](../DEVELOPMENT.md#troubleshooting) in DEVELOPMENT.md
- Refer to the [project README](../README.md) for general information

---

*Documentation maintained by: Development Team*  
*Last Updated: July 17, 2025*