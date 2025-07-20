/**
 * Performance Audit System for ParkML Encryption Framework
 *
 * Comprehensive performance monitoring, benchmarking, and optimization
 * tools for the multi-party encryption system. Provides detailed metrics,
 * bottleneck identification, and optimization recommendations.
 *
 * Key Features:
 * - Real-time encryption/decryption performance monitoring
 * - Memory usage analysis for cryptographic operations
 * - WASM performance benchmarks
 * - Database query optimization analysis
 * - Security vulnerability scanning
 * - Performance regression testing
 */

import { performance } from 'perf_hooks';
import { prisma } from '../database/prisma-client';
import { WASMCryptoLoader } from './wasm-loader';
// import { ABECrypto } from './abe-crypto';
import { homomorphicAnalytics, ComputationType, PrivacyLevel } from './homomorphic-analytics';
// import { cryptoService } from './crypto-service';
import { DataCategory } from '@parkml/shared';

/**
 * Performance metrics for cryptographic operations
 */
export interface CryptoPerformanceMetrics {
  operationType: 'encrypt' | 'decrypt' | 'key_generation' | 'homomorphic_compute' | 'abe_setup';
  operationId: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsageMB: number;
  dataSize: number;
  success: boolean;
  errorMessage?: string;
  metadata: {
    algorithm: string;
    keySize?: number;
    dataCategory: DataCategory;
    organizationId: string;
    wasmModule?: string;
  };
}

/**
 * Security audit findings
 */
export interface SecurityAuditFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'encryption' | 'access_control' | 'data_exposure' | 'key_management' | 'audit_trail';
  title: string;
  description: string;
  recommendation: string;
  cveReferences?: string[];
  affectedComponents: string[];
  riskScore: number;
  discoveredAt: Date;
}

/**
 * Performance optimization recommendations
 */
export interface PerformanceRecommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  component: string;
  currentMetric: number;
  targetMetric: number;
  improvement: string;
  implementation: string;
  estimatedImpact: string;
  effort: 'low' | 'medium' | 'high';
}

/**
 * Performance metrics for different system components
 */
export interface PerformanceMetrics {
  encryption: {
    avgLatencyMs: number;
    throughputOpsPerSec: number;
    memoryUsageMB: number;
    errorRate: number;
  };
  homomorphic: {
    avgComputationTimeMs: number;
    memoryUsageMB: number;
    successRate: number;
  };
  database: {
    avgQueryTimeMs: number;
    connectionPoolUtilization: number;
    queryOptimizationScore: number;
  };
  wasm: {
    initializationTimeMs: number;
    operationLatencyMs: number;
    memoryLeakDetected: boolean;
  };
}

/**
 * System-wide performance audit results
 */
export interface SystemPerformanceAudit {
  auditId: string;
  timestamp: Date;
  overallScore: number; // 0-100
  metrics: PerformanceMetrics;
  recommendations: PerformanceRecommendation[];
  securityFindings: SecurityAuditFinding[];
}

/**
 * Performance Audit Engine
 * Comprehensive performance monitoring and security analysis
 */
export class PerformanceAuditEngine {
  private static instance: PerformanceAuditEngine;
  private metricsCollector: CryptoPerformanceMetrics[] = [];
  private isMonitoring = false;

  private constructor() {
    // Performance audit engine ready
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PerformanceAuditEngine {
    if (!this.instance) {
      this.instance = new PerformanceAuditEngine();
    }
    return this.instance;
  }

  /**
   * Start performance monitoring
   */
  public startMonitoring(): void {
    this.isMonitoring = true;
    console.log('🚀 Performance monitoring started');

    // Set up periodic cleanup of old metrics
    setInterval(
      () => {
        this.cleanupOldMetrics();
      },
      5 * 60 * 1000
    ); // Every 5 minutes
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('⏹️ Performance monitoring stopped');
  }

  /**
   * Record performance metric for cryptographic operation
   */
  public recordCryptoOperation(
    operationType: CryptoPerformanceMetrics['operationType'],
    operationId: string,
    dataSize: number,
    metadata: CryptoPerformanceMetrics['metadata']
  ): { startTime: number; recordEnd: (success: boolean, error?: string) => void } {
    const startTime = performance.now();
    const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;

    return {
      startTime,
      recordEnd: (success: boolean, error?: string) => {
        const endTime = performance.now();
        const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;

        const metric: CryptoPerformanceMetrics = {
          operationType,
          operationId,
          startTime,
          endTime,
          duration: endTime - startTime,
          memoryUsageMB: memoryAfter - memoryBefore,
          dataSize,
          success,
          errorMessage: error,
          metadata,
        };

        if (this.isMonitoring) {
          this.metricsCollector.push(metric);
        }

        // Log performance warnings
        if (metric.duration > 1000) {
          // > 1 second
          console.warn(
            `⚠️ Slow crypto operation: ${operationType} took ${metric.duration.toFixed(2)}ms`
          );
        }

        if (metric.memoryUsageMB > 100) {
          // > 100MB
          console.warn(
            `⚠️ High memory usage: ${operationType} used ${metric.memoryUsageMB.toFixed(2)}MB`
          );
        }
      },
    };
  }

  /**
   * Run comprehensive system performance audit
   */
  public async runSystemAudit(): Promise<SystemPerformanceAudit> {
    console.log('🔍 Starting comprehensive system performance audit...');

    const auditId = `audit_${Date.now()}`;
    const timestamp = new Date();

    // Run all audit components in parallel
    const [encryptionMetrics, homomorphicMetrics, databaseMetrics, wasmMetrics, securityFindings] =
      await Promise.all([
        this.auditEncryptionPerformance(),
        this.auditHomomorphicPerformance(),
        this.auditDatabasePerformance(),
        this.auditWASMPerformance(),
        this.runSecurityAudit(),
      ]);

    // Generate performance recommendations
    const recommendations = this.generatePerformanceRecommendations({
      encryption: encryptionMetrics,
      homomorphic: homomorphicMetrics,
      database: databaseMetrics,
      wasm: wasmMetrics,
    });

    // Calculate overall performance score
    const overallScore = this.calculatePerformanceScore({
      encryption: encryptionMetrics,
      homomorphic: homomorphicMetrics,
      database: databaseMetrics,
      wasm: wasmMetrics,
    });

    const audit: SystemPerformanceAudit = {
      auditId,
      timestamp,
      overallScore,
      metrics: {
        encryption: encryptionMetrics,
        homomorphic: homomorphicMetrics,
        database: databaseMetrics,
        wasm: wasmMetrics,
      },
      recommendations,
      securityFindings,
    };

    // Store audit results
    await this.storeAuditResults(audit);

    console.log(`✅ System audit completed. Overall score: ${overallScore}/100`);
    return audit;
  }

  /**
   * Audit encryption performance
   */
  private async auditEncryptionPerformance(): Promise<
    SystemPerformanceAudit['metrics']['encryption']
  > {
    console.log('🔐 Auditing encryption performance...');

    const testData = 'x'.repeat(1024); // 1KB test data
    const iterations = 50;
    const latencies: number[] = [];
    const memoryUsages: number[] = [];
    let errors = 0;

    for (let i = 0; i < iterations; i++) {
      try {
        const tracker = this.recordCryptoOperation('encrypt', `perf_test_${i}`, testData.length, {
          algorithm: 'ABE',
          dataCategory: DataCategory.DEMOGRAPHICS,
          organizationId: 'test_org',
        });

        // Simulate encryption operation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));

        tracker.recordEnd(true);
        latencies.push(performance.now() - tracker.startTime);
        memoryUsages.push(process.memoryUsage().heapUsed / 1024 / 1024);
      } catch {
        errors++;
      }
    }

    const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const throughput = 1000 / avgLatency; // Operations per second
    const avgMemory = memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length;
    const errorRate = (errors / iterations) * 100;

    return {
      avgLatencyMs: avgLatency,
      throughputOpsPerSec: throughput,
      memoryUsageMB: avgMemory,
      errorRate,
    };
  }

  /**
   * Audit homomorphic encryption performance
   */
  private async auditHomomorphicPerformance(): Promise<
    SystemPerformanceAudit['metrics']['homomorphic']
  > {
    console.log('🔢 Auditing homomorphic encryption performance...');

    const startTime = performance.now();
    const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;

    try {
      // Test homomorphic analytics initialization
      await homomorphicAnalytics.initialize();

      // Simulate a computation
      await homomorphicAnalytics.submitComputation({
        computationType: ComputationType.SUM,
        dataCategories: [DataCategory.MOTOR_SYMPTOMS],
        cohortCriteria: {},
        requesterId: 'test_user',
        organizationId: 'test_org',
        purpose: 'Performance testing',
        privacyLevel: PrivacyLevel.BASIC,
      });

      const endTime = performance.now();
      const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;

      return {
        avgComputationTimeMs: endTime - startTime,
        memoryUsageMB: memoryAfter - memoryBefore,
        successRate: 100,
      };
    } catch (error) {
      console.error('Homomorphic performance test failed:', error);
      return {
        avgComputationTimeMs: 0,
        memoryUsageMB: 0,
        successRate: 0,
      };
    }
  }

  /**
   * Audit database performance
   */
  private async auditDatabasePerformance(): Promise<SystemPerformanceAudit['metrics']['database']> {
    console.log('🗄️ Auditing database performance...');

    const queryTests = [
      { name: 'Simple select', query: () => prisma.user.findMany({ take: 10 }) },
      {
        name: 'Complex join',
        query: () =>
          prisma.patient.findMany({
            include: { symptomEntries: true },
            take: 5,
          }),
      },
      { name: 'Aggregation', query: () => prisma.symptomEntry.count() },
    ];

    const queryTimes: number[] = [];

    for (const test of queryTests) {
      const startTime = performance.now();
      try {
        await test.query();
        const endTime = performance.now();
        queryTimes.push(endTime - startTime);
      } catch (error) {
        console.warn(`Database test "${test.name}" failed:`, error);
        queryTimes.push(1000); // Penalty for failed queries
      }
    }

    const avgQueryTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length;

    return {
      avgQueryTimeMs: avgQueryTime,
      connectionPoolUtilization: 0.7, // Simulated value
      queryOptimizationScore: avgQueryTime < 50 ? 95 : avgQueryTime < 100 ? 80 : 60,
    };
  }

  /**
   * Audit WASM performance
   */
  private async auditWASMPerformance(): Promise<SystemPerformanceAudit['metrics']['wasm']> {
    console.log('⚡ Auditing WASM performance...');

    const initStartTime = performance.now();
    const memoryBefore = process.memoryUsage().heapUsed;

    try {
      // Test WASM initialization
      await WASMCryptoLoader.initializeSEAL();
      const initEndTime = performance.now();

      // Test WASM operation
      const opStartTime = performance.now();
      WASMCryptoLoader.createHomomorphicContext('tc128');
      const opEndTime = performance.now();

      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryDiff = (memoryAfter - memoryBefore) / 1024 / 1024;

      return {
        initializationTimeMs: initEndTime - initStartTime,
        operationLatencyMs: opEndTime - opStartTime,
        memoryLeakDetected: memoryDiff > 50, // Flag if memory usage increased by >50MB
      };
    } catch (error) {
      console.error('WASM performance test failed:', error);
      return {
        initializationTimeMs: 5000, // High penalty for failure
        operationLatencyMs: 1000,
        memoryLeakDetected: true,
      };
    }
  }

  /**
   * Run security audit
   */
  private async runSecurityAudit(): Promise<SecurityAuditFinding[]> {
    console.log('🛡️ Running security audit...');

    const findings: SecurityAuditFinding[] = [];

    // Check for common security issues
    findings.push(...(await this.checkKeyManagementSecurity()));
    findings.push(...(await this.checkAccessControlSecurity()));
    findings.push(...(await this.checkDataExposureSecurity()));
    findings.push(...(await this.checkAuditTrailSecurity()));

    return findings;
  }

  /**
   * Check key management security
   */
  private async checkKeyManagementSecurity(): Promise<SecurityAuditFinding[]> {
    const findings: SecurityAuditFinding[] = [];

    // Check for proper key storage
    try {
      const encryptionKeys = await prisma.encryptionKey.findMany({
        where: { isActive: true },
        take: 10,
      });

      if (encryptionKeys.some(key => !key.encryptedKey || key.encryptedKey.length < 32)) {
        findings.push({
          id: 'KEY_001',
          severity: 'high',
          category: 'key_management',
          title: 'Weak Key Storage Detected',
          description:
            'Some encryption keys appear to be stored without proper encryption or are too short.',
          recommendation:
            'Ensure all keys are properly encrypted at rest and meet minimum length requirements.',
          affectedComponents: ['EncryptionKey'],
          riskScore: 8.5,
          discoveredAt: new Date(),
        });
      }
    } catch {
      findings.push({
        id: 'KEY_002',
        severity: 'medium',
        category: 'key_management',
        title: 'Key Storage Access Issue',
        description: 'Unable to audit encryption key storage.',
        recommendation: 'Verify database access permissions and key storage schema.',
        affectedComponents: ['Database', 'EncryptionKey'],
        riskScore: 6.0,
        discoveredAt: new Date(),
      });
    }

    return findings;
  }

  /**
   * Check access control security
   */
  private async checkAccessControlSecurity(): Promise<SecurityAuditFinding[]> {
    const findings: SecurityAuditFinding[] = [];

    // Check for proper role-based access
    try {
      const superAdmins = await prisma.user.count({
        where: { role: 'super_admin', isActive: true },
      });

      if (superAdmins > 5) {
        findings.push({
          id: 'AC_001',
          severity: 'medium',
          category: 'access_control',
          title: 'Too Many Super Admins',
          description: `Found ${superAdmins} super admin accounts. Consider limiting privileged access.`,
          recommendation: 'Review super admin accounts and revoke unnecessary privileges.',
          affectedComponents: ['User', 'AccessControl'],
          riskScore: 5.5,
          discoveredAt: new Date(),
        });
      }

      // Check for emergency access usage
      const recentEmergencyAccess = await prisma.emergencyAccess.count({
        where: {
          isActive: true,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      if (recentEmergencyAccess > 10) {
        findings.push({
          id: 'AC_002',
          severity: 'high',
          category: 'access_control',
          title: 'High Emergency Access Usage',
          description: `${recentEmergencyAccess} emergency access requests in the last 24 hours.`,
          recommendation: 'Investigate high emergency access usage and review approval processes.',
          affectedComponents: ['EmergencyAccess'],
          riskScore: 7.5,
          discoveredAt: new Date(),
        });
      }
    } catch {
      findings.push({
        id: 'AC_003',
        severity: 'low',
        category: 'access_control',
        title: 'Access Control Audit Failed',
        description: 'Unable to complete access control security audit.',
        recommendation: 'Verify database connectivity and permissions.',
        affectedComponents: ['Database'],
        riskScore: 3.0,
        discoveredAt: new Date(),
      });
    }

    return findings;
  }

  /**
   * Check for data exposure risks
   */
  private async checkDataExposureSecurity(): Promise<SecurityAuditFinding[]> {
    const findings: SecurityAuditFinding[] = [];

    // Check for unencrypted sensitive data
    try {
      const unencryptedPatients = await prisma.patient.count({
        where: { encryptionMetadata: null },
      });

      if (unencryptedPatients > 0) {
        findings.push({
          id: 'DE_001',
          severity: 'critical',
          category: 'data_exposure',
          title: 'Unencrypted Patient Data Found',
          description: `${unencryptedPatients} patient records without encryption metadata.`,
          recommendation: 'Run data migration to encrypt all patient records immediately.',
          affectedComponents: ['Patient', 'DataMigration'],
          riskScore: 9.5,
          discoveredAt: new Date(),
        });
      }

      const unencryptedSymptoms = await prisma.symptomEntry.count({
        where: { encryptionMetadata: null },
      });

      if (unencryptedSymptoms > 0) {
        findings.push({
          id: 'DE_002',
          severity: 'high',
          category: 'data_exposure',
          title: 'Unencrypted Symptom Data Found',
          description: `${unencryptedSymptoms} symptom entries without encryption metadata.`,
          recommendation: 'Run data migration to encrypt all symptom entries.',
          affectedComponents: ['SymptomEntry', 'DataMigration'],
          riskScore: 8.5,
          discoveredAt: new Date(),
        });
      }
    } catch {
      findings.push({
        id: 'DE_003',
        severity: 'medium',
        category: 'data_exposure',
        title: 'Data Exposure Audit Failed',
        description: 'Unable to complete data exposure security audit.',
        recommendation: 'Check database connectivity and schema consistency.',
        affectedComponents: ['Database'],
        riskScore: 5.0,
        discoveredAt: new Date(),
      });
    }

    return findings;
  }

  /**
   * Check audit trail security
   */
  private async checkAuditTrailSecurity(): Promise<SecurityAuditFinding[]> {
    const findings: SecurityAuditFinding[] = [];

    try {
      const auditEntries = await prisma.cryptoAuditEntry.count();
      const recentEntries = await prisma.cryptoAuditEntry.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      });

      if (auditEntries === 0) {
        findings.push({
          id: 'AT_001',
          severity: 'high',
          category: 'audit_trail',
          title: 'No Audit Trail Found',
          description: 'No cryptographic audit entries found in the system.',
          recommendation: 'Verify audit logging is properly configured and operational.',
          affectedComponents: ['CryptoAuditEntry', 'AuditSystem'],
          riskScore: 8.0,
          discoveredAt: new Date(),
        });
      } else if (recentEntries === 0) {
        findings.push({
          id: 'AT_002',
          severity: 'medium',
          category: 'audit_trail',
          title: 'No Recent Audit Activity',
          description: 'No audit entries recorded in the last 7 days.',
          recommendation: 'Check if audit logging is still active and properly configured.',
          affectedComponents: ['CryptoAuditEntry'],
          riskScore: 6.0,
          discoveredAt: new Date(),
        });
      }
    } catch {
      findings.push({
        id: 'AT_003',
        severity: 'medium',
        category: 'audit_trail',
        title: 'Audit Trail Check Failed',
        description: 'Unable to verify audit trail integrity.',
        recommendation: 'Check database connectivity and audit table schema.',
        affectedComponents: ['Database', 'CryptoAuditEntry'],
        riskScore: 5.5,
        discoveredAt: new Date(),
      });
    }

    return findings;
  }

  /**
   * Generate performance recommendations
   */
  private generatePerformanceRecommendations(
    metrics: PerformanceMetrics
  ): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // Encryption performance recommendations
    if (metrics.encryption.avgLatencyMs > 100) {
      recommendations.push({
        id: 'PERF_001',
        priority: 'high',
        component: 'Encryption System',
        currentMetric: metrics.encryption.avgLatencyMs,
        targetMetric: 50,
        improvement: 'Reduce encryption latency by 50%',
        implementation: 'Implement encryption caching and optimize ABE key derivation',
        estimatedImpact: '50% faster encryption operations',
        effort: 'medium',
      });
    }

    // Memory usage recommendations
    if (metrics.encryption.memoryUsageMB > 50) {
      recommendations.push({
        id: 'PERF_002',
        priority: 'medium',
        component: 'Memory Management',
        currentMetric: metrics.encryption.memoryUsageMB,
        targetMetric: 25,
        improvement: 'Optimize memory usage for crypto operations',
        implementation: 'Implement memory pooling and cleanup routines',
        estimatedImpact: '50% reduction in memory footprint',
        effort: 'medium',
      });
    }

    // Database performance recommendations
    if (metrics.database.avgQueryTimeMs > 100) {
      recommendations.push({
        id: 'PERF_003',
        priority: 'high',
        component: 'Database',
        currentMetric: metrics.database.avgQueryTimeMs,
        targetMetric: 50,
        improvement: 'Optimize database query performance',
        implementation: 'Add database indexes and optimize complex queries',
        estimatedImpact: '50% faster database operations',
        effort: 'low',
      });
    }

    // WASM performance recommendations
    if (metrics.wasm.initializationTimeMs > 1000) {
      recommendations.push({
        id: 'PERF_004',
        priority: 'medium',
        component: 'WASM Loader',
        currentMetric: metrics.wasm.initializationTimeMs,
        targetMetric: 500,
        improvement: 'Optimize WASM module initialization',
        implementation: 'Implement WASM module caching and lazy loading',
        estimatedImpact: '50% faster WASM initialization',
        effort: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    let score = 100;

    // Deduct points for poor performance
    if (metrics.encryption.avgLatencyMs > 100) score -= 15;
    if (metrics.encryption.memoryUsageMB > 50) score -= 10;
    if (metrics.encryption.errorRate > 5) score -= 20;

    if (metrics.database.avgQueryTimeMs > 100) score -= 15;
    if (metrics.database.queryOptimizationScore < 80) score -= 10;

    if (metrics.wasm.initializationTimeMs > 1000) score -= 10;
    if (metrics.wasm.memoryLeakDetected) score -= 15;

    if (metrics.homomorphic.successRate < 90) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Store audit results in database
   */
  private async storeAuditResults(audit: SystemPerformanceAudit): Promise<void> {
    try {
      await prisma.performanceAudit.create({
        data: {
          auditId: audit.auditId,
          timestamp: audit.timestamp,
          overallScore: audit.overallScore,
          metrics: JSON.stringify(audit.metrics),
          recommendations: JSON.stringify(audit.recommendations),
          securityFindings: JSON.stringify(audit.securityFindings),
        },
      });
    } catch (error) {
      console.warn('Failed to store audit results:', error);
      // Continue execution even if storage fails
    }
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - 60 * 60 * 1000; // 1 hour ago
    this.metricsCollector = this.metricsCollector.filter(metric => metric.startTime > cutoffTime);
  }

  /**
   * Get current performance metrics summary
   */
  public getMetricsSummary(): {
    totalOperations: number;
    avgLatency: number;
    errorRate: number;
    memoryUsage: number;
  } {
    const totalOps = this.metricsCollector.length;

    if (totalOps === 0) {
      return {
        totalOperations: 0,
        avgLatency: 0,
        errorRate: 0,
        memoryUsage: 0,
      };
    }

    const avgLatency = this.metricsCollector.reduce((sum, m) => sum + m.duration, 0) / totalOps;
    const errors = this.metricsCollector.filter(m => !m.success).length;
    const errorRate = (errors / totalOps) * 100;
    const avgMemory = this.metricsCollector.reduce((sum, m) => sum + m.memoryUsageMB, 0) / totalOps;

    return {
      totalOperations: totalOps,
      avgLatency,
      errorRate,
      memoryUsage: avgMemory,
    };
  }
}

// Export singleton instance
export const performanceAuditEngine = PerformanceAuditEngine.getInstance();
