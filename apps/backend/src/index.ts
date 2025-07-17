import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { API_ENDPOINTS, HTTP_STATUS, ApiResponse } from '@parkml/shared';

// Import routes
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import symptomEntryRoutes from './routes/symptom-entries';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Resolve paths relative to the project root
const projectRoot = path.resolve(__dirname, '../../..');
const frontendDist = path.join(projectRoot, 'apps/frontend/dist');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files only in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(frontendDist));
}

// Health check endpoint
app.get(API_ENDPOINTS.HEALTH, (_req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
  };
  res.status(HTTP_STATUS.OK).json(response);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/symptom-entries', symptomEntryRoutes);

// Legacy users endpoint (for backward compatibility)
app.get(API_ENDPOINTS.USERS, (_req, res) => {
  const response: ApiResponse = {
    success: true,
    data: [],
  };
  res.status(HTTP_STATUS.OK).json(response);
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  const response: ApiResponse = {
    success: false,
    error: 'Internal server error',
  };
  res.status(500).json(response);
});

// Serve frontend only in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile('index.html', { root: frontendDist });
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});