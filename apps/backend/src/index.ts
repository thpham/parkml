import express from 'express';
import cors from 'cors';
import { API_ENDPOINTS, HTTP_STATUS, ApiResponse } from '@parkml/shared';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('apps/frontend/dist'));

app.get(API_ENDPOINTS.HEALTH, (req, res) => {
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

app.get(API_ENDPOINTS.USERS, (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: [],
  };
  res.status(HTTP_STATUS.OK).json(response);
});

app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'apps/frontend/dist' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});