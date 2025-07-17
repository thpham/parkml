# ParkML Architecture Documentation

## System Overview

ParkML is a secure, HIPAA-compliant digital platform for Parkinson's disease symptom tracking, built as a TypeScript monorepo with React frontend and Express backend.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React)       │───▶│   (Express)     │───▶│ SQLite/PostgreSQL│
│   Port 3000     │    │   Port 5000     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Technology Stack

### Frontend (React Application)
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 6.3.5 for fast development and optimized builds
- **Styling**: Tailwind CSS 3.4.17 for responsive design
- **Routing**: React Router DOM 6.30.1 for SPA navigation
- **Forms**: React Hook Form 7.55.3 for efficient form management
- **State Management**: React Context API for authentication state
- **UI Components**: Lucide React icons, React Hot Toast notifications

### Backend (Express API)
- **Runtime**: Node.js 24.4.0
- **Framework**: Express 4.21.2 with TypeScript
- **Authentication**: JWT tokens with bcrypt password hashing
- **Database**: Custom abstraction layer supporting dual databases
- **Security**: CORS protection, input validation, rate limiting
- **Development**: tsx watch mode for hot reloading

### Database Layer
- **Development**: SQLite 3 with better-sqlite3 driver
- **Production**: PostgreSQL 14+ with pg driver
- **Schema**: Automatic SQLite initialization, manual PostgreSQL setup
- **Data Types**: JSON fields stored as TEXT (SQLite) or JSONB (PostgreSQL)

## Project Structure

```
parkml/
├── apps/
│   ├── backend/                 # Express API server
│   │   ├── src/
│   │   │   ├── database/        # Database abstraction layer
│   │   │   │   ├── connection.ts    # Database factory & abstraction
│   │   │   │   ├── schema.sql       # PostgreSQL schema
│   │   │   │   ├── sqlite-schema.sql # SQLite schema
│   │   │   │   └── test-connection.ts # Database testing utility
│   │   │   ├── routes/          # API route handlers
│   │   │   │   ├── auth.ts          # Authentication endpoints
│   │   │   │   ├── patients.ts      # Patient management
│   │   │   │   └── symptom-entries.ts # Symptom tracking
│   │   │   ├── middleware/      # Express middleware
│   │   │   │   └── auth.ts          # JWT authentication & authorization
│   │   │   ├── config/          # Configuration files
│   │   │   │   └── database.ts      # Database configuration
│   │   │   └── index.ts         # Server entry point
│   │   ├── .env                 # Environment variables
│   │   └── package.json         # Backend dependencies
│   └── frontend/                # React application
│       ├── src/
│       │   ├── components/      # React components
│       │   │   ├── auth/           # Authentication components
│       │   │   ├── dashboard/      # Dashboard components
│       │   │   ├── layout/         # Layout components
│       │   │   └── symptoms/       # Symptom tracking components
│       │   ├── contexts/        # React contexts
│       │   │   └── AuthContext.tsx # Authentication context
│       │   ├── App.tsx          # Main application component
│       │   ├── main.tsx         # React entry point
│       │   └── index.css        # Global styles
│       ├── index.html           # HTML template
│       ├── tailwind.config.js   # Tailwind configuration
│       ├── vite.config.ts       # Vite configuration
│       └── package.json         # Frontend dependencies
├── packages/
│   └── shared/                  # Shared utilities
│       ├── src/
│       │   └── index.ts         # Shared TypeScript types
│       └── package.json         # Shared dependencies
├── docs/                        # Documentation
├── .nvmrc                       # Node.js version specification
├── package.json                 # Root workspace configuration
└── README.md                    # Project overview
```

## Database Architecture

### Schema Design

```sql
-- Core Tables
users                    # User accounts (patients, caregivers, healthcare providers)
├── id (UUID/TEXT)
├── email (VARCHAR/TEXT)
├── password_hash (VARCHAR/TEXT)
├── name (VARCHAR/TEXT)
├── role (VARCHAR/TEXT) # 'patient', 'caregiver', 'healthcare_provider'
└── timestamps

patients                 # Patient information
├── id (UUID/TEXT)
├── user_id (UUID/TEXT) # Foreign key to users
├── name (VARCHAR/TEXT)
├── date_of_birth (DATE)
├── diagnosis_date (DATE)
└── timestamps

symptom_entries         # Daily symptom tracking
├── id (UUID/TEXT)
├── patient_id (UUID/TEXT) # Foreign key to patients
├── entry_date (DATE)
├── completed_by (UUID/TEXT) # Foreign key to users
├── motor_symptoms (JSONB/TEXT)
├── non_motor_symptoms (JSONB/TEXT)
├── autonomic_symptoms (JSONB/TEXT)
├── daily_activities (JSONB/TEXT)
├── environmental_factors (JSONB/TEXT)
├── safety_incidents (JSONB/TEXT)
├── notes (TEXT)
└── timestamps

-- Junction Tables
patient_caregivers      # Many-to-many: patients ↔ caregivers
patient_healthcare_providers # Many-to-many: patients ↔ healthcare providers
```

### Database Abstraction Layer

```typescript
interface DatabaseConnection {
  query(text: string, params?: any[]): Promise<DatabaseResult>;
  close(): Promise<void>;
}

class SQLiteConnection implements DatabaseConnection {
  // SQLite-specific implementation
  // Handles JSON field conversion
  // Emulates PostgreSQL RETURNING clause
}

class PostgreSQLConnection implements DatabaseConnection {
  // PostgreSQL-specific implementation
  // Uses pg driver with connection pooling
}
```

## API Architecture

### Authentication Flow

```
1. User Registration/Login
   ├── POST /api/auth/register
   ├── POST /api/auth/login
   └── JWT token generation

2. Protected Routes
   ├── Authentication middleware validates JWT
   ├── Authorization middleware checks user roles
   └── Route handler executes business logic
```

### API Endpoints

```
Authentication:
├── POST /api/auth/register    # User registration
└── POST /api/auth/login       # User login

Patient Management:
├── GET /api/patients          # List patients (role-based)
├── POST /api/patients         # Create patient
└── GET /api/patients/:id      # Get patient details

Symptom Tracking:
├── GET /api/symptom-entries   # List symptom entries
├── POST /api/symptom-entries  # Create symptom entry
└── GET /api/symptom-entries/:id # Get specific entry
```

## Security Architecture

### Authentication & Authorization
- **JWT Tokens**: 24-hour expiration with secure secret
- **Password Hashing**: bcrypt with 12 salt rounds
- **Role-Based Access**: Patient, caregiver, healthcare provider roles
- **Route Protection**: Middleware-based authentication & authorization

### Data Protection
- **Database Encryption**: At-rest encryption for production
- **Transport Security**: HTTPS in production
- **Input Validation**: Sanitization and validation for all inputs
- **CORS Protection**: Configured for secure cross-origin requests

## Development Architecture

### Development Workflow
```
1. Code Changes
   ├── TypeScript compilation
   ├── Hot reload (tsx watch)
   └── Browser refresh (Vite HMR)

2. Database Operations
   ├── SQLite auto-initialization
   ├── Schema migrations
   └── Data seeding (if needed)

3. Testing
   ├── Database connection tests
   ├── API endpoint tests
   └── Frontend component tests
```

### Build & Deployment
```
Development:
├── npm run dev              # Start both frontend & backend
├── npm run test-db          # Test database connection
└── npm run typecheck        # TypeScript validation

Production:
├── npm run build            # Build all packages
├── npm run start            # Start production server
└── Database migration       # PostgreSQL schema setup
```

## Performance Considerations

### Database Optimization
- **Indexes**: Strategic indexing on frequently queried fields
- **Connection Pooling**: PostgreSQL connection pooling for production
- **Query Optimization**: Efficient queries with proper JOIN strategies

### Frontend Optimization
- **Code Splitting**: Vite-based code splitting for smaller bundles
- **Lazy Loading**: Route-based lazy loading for better performance
- **Caching**: Browser caching for static assets

### Backend Optimization
- **Middleware Ordering**: Efficient middleware stack
- **Error Handling**: Comprehensive error handling and logging
- **Rate Limiting**: Protection against abuse and DoS attacks

## Deployment Architecture

### Development Environment
- **Database**: SQLite file-based database
- **Services**: Concurrent frontend (3000) and backend (5000)
- **Hot Reload**: Automatic reloading for development efficiency

### Production Environment
- **Database**: PostgreSQL with proper indexes and constraints
- **Services**: Reverse proxy with load balancing
- **Security**: HTTPS, security headers, input validation
- **Monitoring**: Logging, error tracking, performance monitoring

---

*Last Updated: July 17, 2025*  
*Architecture Version: 1.0*