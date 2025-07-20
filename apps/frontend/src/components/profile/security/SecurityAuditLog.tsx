import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  Monitor, 
  Smartphone, 
  Tablet,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Key,
  Shield,
  Eye,
  Download,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import toast from 'react-hot-toast';

interface SecurityAuditLogProps {}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'login' | 'logout' | 'password_change' | '2fa_enabled' | '2fa_disabled' | 'passkey_added' | 'passkey_removed' | 'failed_login' | 'session_expired';
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  deviceName: string;
  ipAddress: string;
  location: string;
  userAgent: string;
  success: boolean;
  details?: string;
}

const SecurityAuditLog: React.FC<SecurityAuditLogProps> = () => {
  const { t } = useTranslation(['security', 'common']);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/security/audit-logs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('parkml_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
      } else {
        throw new Error('Failed to load audit logs');
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Failed to load security audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
        return CheckCircle;
      case 'logout':
        return XCircle;
      case 'password_change':
        return Key;
      case '2fa_enabled':
      case '2fa_disabled':
        return Shield;
      case 'passkey_added':
      case 'passkey_removed':
        return Shield;
      case 'failed_login':
        return AlertTriangle;
      case 'session_expired':
        return Clock;
      default:
        return Eye;
    }
  };

  const getActionColor = (action: string, success: boolean) => {
    if (!success) return 'text-error';
    
    switch (action) {
      case 'login':
      case '2fa_enabled':
      case 'passkey_added':
        return 'text-success';
      case 'logout':
      case '2fa_disabled':
      case 'passkey_removed':
        return 'text-warning';
      case 'failed_login':
        return 'text-error';
      default:
        return 'text-info';
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return Smartphone;
      case 'tablet':
        return Tablet;
      case 'desktop':
        return Monitor;
      default:
        return Monitor;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const exportAuditLog = () => {
    const csvContent = [
      'Timestamp,Action,Device,IP Address,Location,Success,Details',
      ...filteredLogs.map(log => 
        `"${formatTimestamp(log.timestamp)}","${t(`security:auditLog.actions.${log.action}`)}","${log.deviceName}","${log.ipAddress}","${log.location}","${log.success ? 'Success' : 'Failed'}","${log.details || ''}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parkml-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('security:auditLog.exported'));
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress.includes(searchTerm) ||
      t(`security:auditLog.actions.${log.action}`).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterAction === 'all' || log.action === filterAction;
    
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="loading loading-spinner loading-md"></div>
          <p className="mt-2 text-sm text-base-content/60">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">{t('security:auditLog.title')}</h3>
          <p className="text-sm text-base-content/60">{t('security:auditLog.description')}</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-outline btn-sm"
          >
            <Filter className="h-4 w-4 mr-1" />
            {t('common:filter')}
          </button>
          <button
            onClick={loadAuditLogs}
            className="btn btn-outline btn-sm"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            {t('common:refresh')}
          </button>
          <button
            onClick={exportAuditLog}
            className="btn btn-primary btn-sm"
          >
            <Download className="h-4 w-4 mr-1" />
            {t('common:export')}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t('common:search')}</span>
                </label>
                <div className="input-group">
                  <span className="bg-base-300">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('security:auditLog.searchPlaceholder')}
                    className="input input-bordered flex-1"
                  />
                </div>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t('security:auditLog.filterByAction')}</span>
                </label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="select select-bordered"
                >
                  <option value="all">{t('common:all')}</option>
                  <option value="login">{t('security:auditLog.actions.login')}</option>
                  <option value="logout">{t('security:auditLog.actions.logout')}</option>
                  <option value="password_change">{t('security:auditLog.actions.password_change')}</option>
                  <option value="2fa_enabled">{t('security:auditLog.actions.2fa_enabled')}</option>
                  <option value="2fa_disabled">{t('security:auditLog.actions.2fa_disabled')}</option>
                  <option value="passkey_added">{t('security:auditLog.actions.passkey_added')}</option>
                  <option value="passkey_removed">{t('security:auditLog.actions.passkey_removed')}</option>
                  <option value="failed_login">{t('security:auditLog.actions.failed_login')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Entries */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-8">
          <Eye className="h-12 w-12 text-base-content/30 mx-auto mb-3" />
          <h3 className="font-medium text-base-content/60 mb-1">
            {t('security:auditLog.noEntries')}
          </h3>
          <p className="text-sm text-base-content/50">
            {searchTerm || filterAction !== 'all' 
              ? t('security:auditLog.noMatchingEntries')
              : t('security:auditLog.noEntriesDescription')
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const ActionIcon = getActionIcon(log.action);
            const DeviceIcon = getDeviceIcon(log.deviceType);
            
            return (
              <div key={log.id} className="card bg-base-200 border border-base-300">
                <div className="card-body p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <ActionIcon 
                        className={`h-5 w-5 ${getActionColor(log.action, log.success)}`} 
                      />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">
                          {t(`security:auditLog.actions.${log.action}`)}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-base-content/60">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimestamp(log.timestamp)}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-base-content/60">
                        <div className="flex items-center space-x-1">
                          <DeviceIcon className="h-3 w-3" />
                          <span>{log.deviceName}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{log.location}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <span className="font-mono">{log.ipAddress}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {log.success ? (
                            <div className="badge badge-success badge-xs">
                              {t('security:status.success')}
                            </div>
                          ) : (
                            <div className="badge badge-error badge-xs">
                              {t('security:status.failed')}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {log.details && (
                        <div className="mt-2 text-xs text-base-content/60">
                          <span className="font-medium">{t('common:details')}:</span> {log.details}
                        </div>
                      )}
                      
                      {!log.success && log.action === 'failed_login' && (
                        <div className="mt-2">
                          <div className="alert alert-warning alert-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-xs">
                              {t('security:auditLog.suspiciousActivity')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat bg-base-200 rounded-lg p-3">
          <div className="stat-title text-xs">{t('security:auditLog.stats.totalEntries')}</div>
          <div className="stat-value text-lg">{auditLogs.length}</div>
        </div>
        
        <div className="stat bg-base-200 rounded-lg p-3">
          <div className="stat-title text-xs">{t('security:auditLog.stats.successfulLogins')}</div>
          <div className="stat-value text-lg text-success">
            {auditLogs.filter(log => log.action === 'login' && log.success).length}
          </div>
        </div>
        
        <div className="stat bg-base-200 rounded-lg p-3">
          <div className="stat-title text-xs">{t('security:auditLog.stats.failedAttempts')}</div>
          <div className="stat-value text-lg text-error">
            {auditLogs.filter(log => log.action === 'failed_login').length}
          </div>
        </div>
        
        <div className="stat bg-base-200 rounded-lg p-3">
          <div className="stat-title text-xs">{t('security:auditLog.stats.uniqueDevices')}</div>
          <div className="stat-value text-lg">
            {new Set(auditLogs.map(log => log.deviceName)).size}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityAuditLog;