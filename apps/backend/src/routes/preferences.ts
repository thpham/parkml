import { Router } from 'express';
import { authenticateToken, logUserActivity } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../database/prisma-client';
import { ApiResponse } from '@parkml/shared';

const router = Router();

// =====================================
// User Profile Routes
// =====================================

// Get user profile (comprehensive user info)
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      } as ApiResponse);
    }

    // Get user with all profile information
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        dateOfBirth: true,
        addressStreet: true,
        addressCity: true,
        addressPostalCode: true,
        addressCountry: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactRelationship: true,
        medicalAllergies: true,
        medicalMedications: true,
        medicalEmergencyNotes: true,
        securityScore: true,
        lastLoginAt: true,
        passwordChangedAt: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
    }

    // Get user preferences
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: req.user.userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await prisma.userPreferences.create({
        data: {
          userId: req.user.userId,
          theme: 'system',
          language: 'en',
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          accessibilityHighContrast: false,
          accessibilityLargeText: false,
          accessibilityScreenReader: false,
          accessibilityKeyboardNav: false,
          privacyAnalytics: true,
          privacyMarketing: false,
          privacyDataSharing: false,
        },
      });
    }

    // Get notification settings
    let notificationSettings = await prisma.notificationSettings.findUnique({
      where: { userId: req.user.userId },
    });

    if (!notificationSettings) {
      // Create default notification settings
      notificationSettings = await prisma.notificationSettings.create({
        data: {
          userId: req.user.userId,
          emailSecurityAlerts: true,
          emailLoginNotifications: true,
          emailPasswordChanges: true,
          emailAccountChanges: true,
          emailWeeklySummary: true,
          emailSystemUpdates: false,
          smsSecurityAlerts: false,
          smsLoginNotifications: false,
          smsEmergencyAlerts: false,
          pushSecurityAlerts: true,
          pushLoginNotifications: false,
          pushSymptomReminders: true,
          pushMedicationReminders: true,
          inAppSecurityAlerts: true,
          inAppSystemNotifications: true,
          frequencyDailyDigest: false,
          frequencyWeeklySummary: true,
          frequencyMonthlyReport: false,
        },
      });
    }

    // Transform the flat user structure to match frontend expectations
    const transformedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      address: {
        street: user.addressStreet,
        city: user.addressCity,
        postalCode: user.addressPostalCode,
        country: user.addressCountry,
      },
      emergencyContact: {
        name: user.emergencyContactName,
        phone: user.emergencyContactPhone,
        relationship: user.emergencyContactRelationship,
      },
      medicalInfo: {
        allergies: user.medicalAllergies,
        medications: user.medicalMedications,
        emergencyNotes: user.medicalEmergencyNotes,
      },
      securityScore: user.securityScore,
      lastLoginAt: user.lastLoginAt,
      passwordChangedAt: user.passwordChangedAt,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      organization: user.organization,
    };

    res.json({
      success: true,
      data: {
        user: transformedUser,
        preferences,
        notificationSettings,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

// =====================================
// User Preferences Routes
// =====================================

// Get user preferences
router.get('/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      } as ApiResponse);
    }

    // Get or create user preferences
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: req.user.userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await prisma.userPreferences.create({
        data: {
          userId: req.user.userId,
          theme: 'system',
          language: 'en',
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          accessibilityHighContrast: false,
          accessibilityLargeText: false,
          accessibilityScreenReader: false,
          accessibilityKeyboardNav: false,
          privacyAnalytics: true,
          privacyMarketing: false,
          privacyDataSharing: false,
        },
      });
    }

    res.json({
      success: true,
      data: { preferences },
    } as ApiResponse);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

// Update user preferences
router.put(
  '/preferences',
  authenticateToken,
  logUserActivity('UPDATE', 'user_preferences'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        } as ApiResponse);
      }

      const {
        theme,
        language,
        timezone,
        dateFormat,
        timeFormat,
        accessibilityHighContrast,
        accessibilityLargeText,
        accessibilityScreenReader,
        accessibilityKeyboardNav,
        privacyAnalytics,
        privacyMarketing,
        privacyDataSharing,
      } = req.body;

      // Validate theme
      if (theme && !['light', 'dark', 'system'].includes(theme)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid theme. Must be light, dark, or system',
        } as ApiResponse);
      }

      // Validate language
      if (language && !['en', 'fr', 'de', 'es', 'it'].includes(language)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid language. Supported languages: en, fr, de, es, it',
        } as ApiResponse);
      }

      // Validate time format
      if (timeFormat && !['12h', '24h'].includes(timeFormat)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid time format. Must be 12h or 24h',
        } as ApiResponse);
      }

      // Update or create preferences
      const updatedPreferences = await prisma.userPreferences.upsert({
        where: { userId: req.user.userId },
        update: {
          ...(theme !== undefined && { theme }),
          ...(language !== undefined && { language }),
          ...(timezone !== undefined && { timezone }),
          ...(dateFormat !== undefined && { dateFormat }),
          ...(timeFormat !== undefined && { timeFormat }),
          ...(accessibilityHighContrast !== undefined && { accessibilityHighContrast }),
          ...(accessibilityLargeText !== undefined && { accessibilityLargeText }),
          ...(accessibilityScreenReader !== undefined && { accessibilityScreenReader }),
          ...(accessibilityKeyboardNav !== undefined && { accessibilityKeyboardNav }),
          ...(privacyAnalytics !== undefined && { privacyAnalytics }),
          ...(privacyMarketing !== undefined && { privacyMarketing }),
          ...(privacyDataSharing !== undefined && { privacyDataSharing }),
        },
        create: {
          userId: req.user.userId,
          theme: theme || 'system',
          language: language || 'en',
          timezone: timezone || 'UTC',
          dateFormat: dateFormat || 'MM/DD/YYYY',
          timeFormat: timeFormat || '12h',
          accessibilityHighContrast: accessibilityHighContrast || false,
          accessibilityLargeText: accessibilityLargeText || false,
          accessibilityScreenReader: accessibilityScreenReader || false,
          accessibilityKeyboardNav: accessibilityKeyboardNav || false,
          privacyAnalytics: privacyAnalytics !== undefined ? privacyAnalytics : true,
          privacyMarketing: privacyMarketing || false,
          privacyDataSharing: privacyDataSharing || false,
        },
      });

      res.json({
        success: true,
        data: { preferences: updatedPreferences },
      } as ApiResponse);
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }
);

// =====================================
// Notification Settings Routes
// =====================================

// Get notification settings
router.get('/notification-settings', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      } as ApiResponse);
    }

    // Get or create notification settings
    let notificationSettings = await prisma.notificationSettings.findUnique({
      where: { userId: req.user.userId },
    });

    if (!notificationSettings) {
      // Create default notification settings
      notificationSettings = await prisma.notificationSettings.create({
        data: {
          userId: req.user.userId,
          emailSecurityAlerts: true,
          emailLoginNotifications: true,
          emailPasswordChanges: true,
          emailAccountChanges: true,
          emailWeeklySummary: true,
          emailSystemUpdates: false,
          smsSecurityAlerts: false,
          smsLoginNotifications: false,
          smsEmergencyAlerts: false,
          pushSecurityAlerts: true,
          pushLoginNotifications: false,
          pushSymptomReminders: true,
          pushMedicationReminders: true,
          inAppSecurityAlerts: true,
          inAppSystemNotifications: true,
          frequencyDailyDigest: false,
          frequencyWeeklySummary: true,
          frequencyMonthlyReport: false,
        },
      });
    }

    res.json({
      success: true,
      data: { notificationSettings },
    } as ApiResponse);
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

// Update notification settings
router.put(
  '/notification-settings',
  authenticateToken,
  logUserActivity('UPDATE', 'notification_settings'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        } as ApiResponse);
      }

      const {
        emailSecurityAlerts,
        emailLoginNotifications,
        emailPasswordChanges,
        emailAccountChanges,
        emailWeeklySummary,
        emailSystemUpdates,
        smsSecurityAlerts,
        smsLoginNotifications,
        smsEmergencyAlerts,
        pushSecurityAlerts,
        pushLoginNotifications,
        pushSymptomReminders,
        pushMedicationReminders,
        inAppSecurityAlerts,
        inAppSystemNotifications,
        frequencyDailyDigest,
        frequencyWeeklySummary,
        frequencyMonthlyReport,
      } = req.body;

      // Update or create notification settings
      const updatedSettings = await prisma.notificationSettings.upsert({
        where: { userId: req.user.userId },
        update: {
          ...(emailSecurityAlerts !== undefined && { emailSecurityAlerts }),
          ...(emailLoginNotifications !== undefined && { emailLoginNotifications }),
          ...(emailPasswordChanges !== undefined && { emailPasswordChanges }),
          ...(emailAccountChanges !== undefined && { emailAccountChanges }),
          ...(emailWeeklySummary !== undefined && { emailWeeklySummary }),
          ...(emailSystemUpdates !== undefined && { emailSystemUpdates }),
          ...(smsSecurityAlerts !== undefined && { smsSecurityAlerts }),
          ...(smsLoginNotifications !== undefined && { smsLoginNotifications }),
          ...(smsEmergencyAlerts !== undefined && { smsEmergencyAlerts }),
          ...(pushSecurityAlerts !== undefined && { pushSecurityAlerts }),
          ...(pushLoginNotifications !== undefined && { pushLoginNotifications }),
          ...(pushSymptomReminders !== undefined && { pushSymptomReminders }),
          ...(pushMedicationReminders !== undefined && { pushMedicationReminders }),
          ...(inAppSecurityAlerts !== undefined && { inAppSecurityAlerts }),
          ...(inAppSystemNotifications !== undefined && { inAppSystemNotifications }),
          ...(frequencyDailyDigest !== undefined && { frequencyDailyDigest }),
          ...(frequencyWeeklySummary !== undefined && { frequencyWeeklySummary }),
          ...(frequencyMonthlyReport !== undefined && { frequencyMonthlyReport }),
        },
        create: {
          userId: req.user.userId,
          emailSecurityAlerts: emailSecurityAlerts !== undefined ? emailSecurityAlerts : true,
          emailLoginNotifications:
            emailLoginNotifications !== undefined ? emailLoginNotifications : true,
          emailPasswordChanges: emailPasswordChanges !== undefined ? emailPasswordChanges : true,
          emailAccountChanges: emailAccountChanges !== undefined ? emailAccountChanges : true,
          emailWeeklySummary: emailWeeklySummary !== undefined ? emailWeeklySummary : true,
          emailSystemUpdates: emailSystemUpdates || false,
          smsSecurityAlerts: smsSecurityAlerts || false,
          smsLoginNotifications: smsLoginNotifications || false,
          smsEmergencyAlerts: smsEmergencyAlerts || false,
          pushSecurityAlerts: pushSecurityAlerts !== undefined ? pushSecurityAlerts : true,
          pushLoginNotifications: pushLoginNotifications || false,
          pushSymptomReminders: pushSymptomReminders !== undefined ? pushSymptomReminders : true,
          pushMedicationReminders:
            pushMedicationReminders !== undefined ? pushMedicationReminders : true,
          inAppSecurityAlerts: inAppSecurityAlerts !== undefined ? inAppSecurityAlerts : true,
          inAppSystemNotifications:
            inAppSystemNotifications !== undefined ? inAppSystemNotifications : true,
          frequencyDailyDigest: frequencyDailyDigest || false,
          frequencyWeeklySummary:
            frequencyWeeklySummary !== undefined ? frequencyWeeklySummary : true,
          frequencyMonthlyReport: frequencyMonthlyReport || false,
        },
      });

      res.json({
        success: true,
        data: { notificationSettings: updatedSettings },
      } as ApiResponse);
    } catch (error) {
      console.error('Update notification settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }
);

// =====================================
// Security Settings Routes
// =====================================

// Get security status
router.get('/security-status', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      } as ApiResponse);
    }

    // Get user with security information
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        securityScore: true,
        passwordChangedAt: true,
        twoFactorAuth: {
          select: {
            isEnabled: true,
            setupCompletedAt: true,
            lastUsedAt: true,
          },
        },
        passkeys: {
          where: { isActive: true },
          select: {
            id: true,
            deviceName: true,
            createdAt: true,
            lastUsedAt: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
    }

    // Get recent login attempts
    const recentLoginAttempts = await prisma.securityAuditLog.count({
      where: {
        userId: req.user.userId,
        action: { in: ['login', 'failed_login'] },
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    // Calculate password strength based on age
    let passwordStrength: 'weak' | 'medium' | 'strong' = 'medium';
    if (user.passwordChangedAt) {
      const daysSinceChange = Math.floor(
        (Date.now() - user.passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceChange > 90) {
        passwordStrength = 'weak';
      } else if (daysSinceChange < 30) {
        passwordStrength = 'strong';
      }
    }

    const securityStatus = {
      passwordStrength,
      twoFactorEnabled: user.twoFactorAuth?.isEnabled || false,
      passkeyCount: user.passkeys?.length || 0,
      lastPasswordChange: user.passwordChangedAt,
      recentLoginAttempts,
      securityScore: user.securityScore || 65,
    };

    res.json({
      success: true,
      data: { securityStatus },
    } as ApiResponse);
  } catch (error) {
    console.error('Get security status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

// Get notification history
router.get('/notification-history', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      } as ApiResponse);
    }

    // Get recent security audit logs for this user as notification history
    const notifications = await prisma.securityAuditLog.findMany({
      where: { userId: req.user.userId },
      orderBy: { timestamp: 'desc' },
      take: 50, // Last 50 notifications
      select: {
        id: true,
        action: true,
        resourceType: true,
        status: true,
        riskLevel: true,
        details: true,
        timestamp: true,
        ipAddress: true,
        userAgent: true,
      },
    });

    // Transform audit logs into notification format
    const notificationHistory = notifications.map(log => ({
      id: log.id,
      type: log.action,
      title: `${log.action.replace('_', ' ')} ${log.resourceType || ''}`.trim(),
      message: log.details ? JSON.parse(log.details).message || log.action : log.action,
      timestamp: log.timestamp,
      read: true, // For now, assume all are read
      severity: log.riskLevel,
      metadata: {
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        status: log.status,
      },
    }));

    res.json({
      success: true,
      data: { notifications: notificationHistory },
    } as ApiResponse);
  } catch (error) {
    console.error('Get notification history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

export default router;
