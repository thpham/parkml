import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { API_ENDPOINTS, HTTP_STATUS, ApiResponse } from '@parkml/shared';

// Import routes
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import symptomEntryRoutes from './routes/symptom-entries';
import assignmentRoutes from './routes/assignments';
import consentRoutes from './routes/consent';
import organizationRoutes from './routes/organizations';
import userRoutes from './routes/users';
import analyticsRoutes from './routes/analytics';
import emergencyAccessRoutes from './routes/emergency-access';
import emergencyAccessCryptoRoutes from './routes/emergency-access-crypto';
import proxyReEncryptionRoutes from './routes/proxy-re-encryption';
import homomorphicAnalyticsRoutes from './routes/homomorphic-analytics';
import accessControlDemoRoutes from './routes/access-control-demo';
import dataMigrationRoutes from './routes/data-migration';
import performanceAuditRoutes from './routes/performance-audit';
import securityRoutes from './routes/security';
import preferencesRoutes from './routes/preferences';
import sessionRoutes from './routes/sessions';
import { initializeEmergencyAccessCleanup } from './services/emergency-access-cleanup';
import { cleanup2FASetups } from './routes/security';
import { initializeCrypto, createCryptoMiddleware } from './crypto/crypto-service';
import { SessionManagerService } from './services/SessionManagerService';

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

// Initialize crypto middleware
app.use(createCryptoMiddleware());

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
app.use('/api/assignments', assignmentRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/emergency-access', emergencyAccessRoutes);
app.use('/api/emergency-access-crypto', emergencyAccessCryptoRoutes);
app.use('/api/proxy-re-encryption', proxyReEncryptionRoutes);
app.use('/api/homomorphic-analytics', homomorphicAnalyticsRoutes);
app.use('/api/access-control-demo', accessControlDemoRoutes);
app.use('/api/data-migration', dataMigrationRoutes);
app.use('/api/performance-audit', performanceAuditRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/user', preferencesRoutes);
app.use('/api/sessions', sessionRoutes);

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

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    // Initialize crypto service
    console.log('🔐 Initializing encryption system...');
    await initializeCrypto();
    console.log('✅ Encryption system ready');

    // Initialize emergency access cleanup service
    initializeEmergencyAccessCleanup();

    // Initialize 2FA setup cleanup service (every 5 minutes)
    setInterval(
      async () => {
        try {
          await cleanup2FASetups();
        } catch (error) {
          console.error('2FA cleanup service error:', error);
        }
      },
      5 * 60 * 1000
    ); // 5 minutes
    console.log('🔐 2FA cleanup service initialized (runs every 5 minutes)');

    // Initialize session cleanup service (every 30 minutes)
    setInterval(
      async () => {
        try {
          const cleanedCount = await SessionManagerService.cleanupExpiredSessions();
          if (cleanedCount > 0) {
            console.log(`🧹 Session cleanup: removed ${cleanedCount} expired sessions`);
          }
        } catch (error) {
          console.error('Session cleanup service error:', error);
        }
      },
      30 * 60 * 1000
    ); // 30 minutes
    console.log('🧹 Session cleanup service initialized (runs every 30 minutes)');

    console.log('🚀 ParkML server fully initialized');
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    process.exit(1);
  }
});
