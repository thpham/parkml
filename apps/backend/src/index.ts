import express from 'express';
import cors from 'cors';
import path from 'path';
import { API_ENDPOINTS, HTTP_STATUS, ApiResponse } from '@parkml/shared';

const app = express();
const PORT = process.env.PORT || 5000;

// Resolve paths relative to the project root
const projectRoot = path.resolve(__dirname, '../../..');
const frontendDist = path.join(projectRoot, 'apps/frontend/dist');

app.use(cors());
app.use(express.json());

// Serve static files only in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(frontendDist));
}

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

app.get(API_ENDPOINTS.USERS, (_req, res) => {
  const response: ApiResponse = {
    success: true,
    data: [],
  };
  res.status(HTTP_STATUS.OK).json(response);
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