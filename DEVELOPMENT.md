# Development Guide

## Quick Start

1. **Clone and Install**
   ```bash
   git clone https://github.com/thpham/parkml.git
   cd parkml
   npm install
   ```

2. **Start Development**
   ```bash
   npm run dev
   ```
   This will start both:
   - Backend server on http://localhost:5000
   - Frontend dev server on http://localhost:3000

3. **Access the Application**
   - Open http://localhost:3000 in your browser
   - API endpoints are available at http://localhost:3000/api/* (proxied to backend)

## Development Setup

### Prerequisites
- Node.js ≥18.0.0
- PostgreSQL (for database)
- npm or yarn

### Environment Configuration

1. **Backend Environment**
   Copy `.env.example` to `.env` in `apps/backend/`:
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   ```

2. **Database Setup**
   ```bash
   # Create database
   createdb parkml_dev
   
   # Run schema (when available)
   psql -d parkml_dev -f apps/backend/src/database/schema.sql
   ```

### Available Scripts

- `npm run dev` - Start both backend and frontend in development mode
- `npm run build` - Build all packages for production
- `npm run start` - Start production server
- `npm run test` - Run tests across all packages
- `npm run lint` - Run linter across all packages
- `npm run typecheck` - Run TypeScript type checking

### Project Structure

```
parkml/
├── apps/
│   ├── backend/          # Node.js Express API
│   │   ├── src/
│   │   │   ├── routes/   # API routes
│   │   │   ├── middleware/ # Authentication, etc.
│   │   │   ├── config/   # Database config
│   │   │   └── database/ # SQL schemas
│   │   └── .env          # Environment variables
│   └── frontend/         # React application
│       ├── src/
│       │   ├── components/ # React components
│       │   ├── contexts/   # React contexts
│       │   └── pages/      # Page components
│       └── tailwind.config.js
├── packages/
│   └── shared/           # Common types and utilities
└── README.md
```

### Development Workflow

1. **Backend Development**
   - API routes in `apps/backend/src/routes/`
   - Database models in `apps/backend/src/database/`
   - Authentication in `apps/backend/src/middleware/`
   - Server restarts automatically on file changes

2. **Frontend Development**
   - React components in `apps/frontend/src/components/`
   - Styling with Tailwind CSS
   - Hot reload enabled for fast development
   - API calls automatically proxied to backend

3. **Shared Types**
   - Common interfaces in `packages/shared/src/`
   - Shared between frontend and backend
   - Build with `npm run build --workspace=packages/shared`

### API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/patients` - Get patients
- `POST /api/patients` - Create patient
- `GET /api/symptom-entries` - Get symptom entries
- `POST /api/symptom-entries` - Create symptom entry

### Database Schema

The database uses PostgreSQL with the following main tables:
- `users` - User accounts (patients, caregivers, healthcare providers)
- `patients` - Patient information
- `symptom_entries` - Daily symptom tracking data (stored as JSONB)
- `weekly_summaries` - Weekly symptom summaries

### Security

- JWT tokens for authentication
- Password hashing with bcrypt
- Role-based access control
- CORS protection
- Input validation

### Testing

Run tests with:
```bash
npm test
```

### Linting

Run linter with:
```bash
npm run lint
```

### Production Build

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```

## Troubleshooting

### Port Already in Use
If port 5000 or 3000 is already in use:
- Backend: Change `PORT` in `apps/backend/.env`
- Frontend: Change `port` in `apps/frontend/vite.config.ts`

### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists: `psql -l | grep parkml`

### TypeScript Errors
- Run type checking: `npm run typecheck`
- Rebuild shared package: `npm run build --workspace=packages/shared`

### Dependencies Issues
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear build cache: `rm -rf apps/*/dist packages/*/dist`