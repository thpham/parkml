import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  Trash2,
  Power,
  Globe,
  Users,
} from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface SecurityAuditLogProps {}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action:
    | 'login'
    | 'logout'
    | 'password_change'
    | '2fa_enabled'
    | '2fa_disabled'
    | 'passkey_added'
    | 'passkey_removed'
    | 'failed_login'
    | 'session_expired';
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  deviceName: string;
  ipAddress: string;
  location: string;
  userAgent: string;
  success: boolean;
  details?: string;
  sessionId?: string;
}

interface SessionInfo {
  id: string;
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  isActive: boolean;
  isCurrent: boolean;
  createdAt: string;
  lastAccessedAt: string;
  expiresAt: string;
  loginMethod?: string;
}

const SecurityAuditLog: React.FC<SecurityAuditLogProps> = () => {
  const { t } = useTranslation(['security', 'common']);
  const { logout } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterSession, setFilterSession] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showSessionManagement, setShowSessionManagement] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Session management state
  const [activeSessions, setActiveSessions] = useState<SessionInfo[]>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const [selectedSessionForTermination, setSelectedSessionForTermination] =
    useState<SessionInfo | null>(null);
  const [showLogoutOthersConfirm, setShowLogoutOthersConfirm] = useState(false);
  const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false);

  const loadActiveSessions = useCallback(async () => {
    try {
      setIsSessionsLoading(true);
      const response = await fetch('/api/sessions', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSessions(data.data?.sessions || []);
      } else {
        throw new Error('Failed to load sessions');
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load active sessions');
    } finally {
      setIsSessionsLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      setIsLoading(true);

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: entriesPerPage.toString(),
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      if (filterAction !== 'all') {
        params.append('action', filterAction);
      }

      if (filterSession !== 'all') {
        params.append('sessionId', filterSession);
      }

      const response = await fetch(`/api/security/audit-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[SecurityAuditLog] API Response:', data);
        setAuditLogs(data.data?.logs || []);
        setTotalEntries(data.data?.totalCount || 0);
        setTotalPages(Math.ceil((data.data?.totalCount || 0) / entriesPerPage));
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[SecurityAuditLog] API Error:', errorData);
        throw new Error(errorData.error || `Failed to load audit logs (${response.status})`);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Failed to load security audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, entriesPerPage, searchTerm, filterAction, filterSession]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  useEffect(() => {
    if (showSessionManagement) {
      loadActiveSessions();
    }
  }, [showSessionManagement, loadActiveSessions]);

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

  const exportAuditLog = async () => {
    try {
      const response = await fetch('/api/security/audit-logs/export?format=csv', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
        },
      });

      if (response.ok) {
        // Get the CSV content
        const csvContent = await response.text();

        // Create and download the file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `parkml-security-audit-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success(t('security:auditLog.exported'));
      } else {
        throw new Error('Failed to export audit log');
      }
    } catch (error) {
      console.error('Error exporting audit log:', error);
      toast.error('Failed to export audit log');
    }
  };

  // Reset to first page when search or filter changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setFilterAction(value);
    setCurrentPage(1);
  };

  const handleEntriesPerPageChange = (value: number) => {
    setEntriesPerPage(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Session management functions
  const terminateSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
        },
      });

      if (response.ok) {
        toast.success(t('security:sessionManagement.sessionTerminated'));
        setSelectedSessionForTermination(null);
        loadActiveSessions(); // Refresh sessions list
        loadAuditLogs(); // Refresh audit logs to show the termination event
      } else {
        throw new Error('Failed to terminate session');
      }
    } catch (error) {
      console.error('Error terminating session:', error);
      toast.error('Failed to terminate session');
    }
  };

  const logoutOtherSessions = async () => {
    try {
      const response = await fetch('/api/sessions/logout-all-others', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          t('security:sessionManagement.otherSessionsLoggedOut', {
            count: data.data.terminatedSessions,
          })
        );
        setShowLogoutOthersConfirm(false);
        loadActiveSessions();
        loadAuditLogs();
      } else {
        throw new Error('Failed to logout other sessions');
      }
    } catch (error) {
      console.error('Error logging out other sessions:', error);
      toast.error('Failed to logout other sessions');
    }
  };

  const logoutAllSessions = async () => {
    try {
      const response = await fetch('/api/sessions/logout-all', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
        },
      });

      if (response.ok) {
        toast.success(t('security:sessionManagement.allSessionsLoggedOut'));
        setShowLogoutAllConfirm(false);
        // Auto logout the current user since all sessions are terminated
        setTimeout(() => {
          logout();
        }, 1500);
      } else {
        throw new Error('Failed to logout all sessions');
      }
    } catch (error) {
      console.error('Error logging out all sessions:', error);
      toast.error('Failed to logout all sessions');
    }
  };

  const parseUserAgent = (userAgent?: string) => {
    if (!userAgent) return { browser: 'Unknown', os: 'Unknown' };

    // Simple user agent parsing
    let browser = 'Unknown';
    let os = 'Unknown';

    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return { browser, os };
  };

  const getDeviceType = (userAgent?: string): 'desktop' | 'mobile' | 'tablet' | 'unknown' => {
    if (!userAgent) return 'unknown';

    if (userAgent.includes('Mobile')) return 'mobile';
    if (userAgent.includes('Tablet')) return 'tablet';
    return 'desktop';
  };

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
      <div>
        <h3 className="text-lg font-semibold mb-1">{t('security:auditLog.title')}</h3>
        <div className="flex justify-end space-x-2 mb-3">
          <button
            onClick={() => setShowSessionManagement(!showSessionManagement)}
            className="btn btn-outline btn-sm"
          >
            <Users className="h-4 w-4 mr-1" />
            {t('security:sessionManagement.title')}
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className="btn btn-outline btn-sm">
            <Filter className="h-4 w-4 mr-1" />
            {t('common:filter')}
          </button>
          <button onClick={loadAuditLogs} className="btn btn-outline btn-sm" disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-1" />
            {t('common:refresh')}
          </button>
          <button onClick={exportAuditLog} className="btn btn-primary btn-sm">
            <Download className="h-4 w-4 mr-1" />
            {t('common:export')}
          </button>
        </div>
        <p className="text-sm text-base-content/60">{t('security:auditLog.description')}</p>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    onChange={e => handleSearchChange(e.target.value)}
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
                  onChange={e => handleFilterChange(e.target.value)}
                  className="select select-bordered"
                >
                  <option value="all">{t('common:all')}</option>
                  <option value="login">{t('security:auditLog.actions.login')}</option>
                  <option value="logout">{t('security:auditLog.actions.logout')}</option>
                  <option value="password_change">
                    {t('security:auditLog.actions.password_change')}
                  </option>
                  <option value="2fa_enabled">{t('security:auditLog.actions.2fa_enabled')}</option>
                  <option value="2fa_disabled">
                    {t('security:auditLog.actions.2fa_disabled')}
                  </option>
                  <option value="passkey_added">
                    {t('security:auditLog.actions.passkey_added')}
                  </option>
                  <option value="passkey_removed">
                    {t('security:auditLog.actions.passkey_removed')}
                  </option>
                  <option value="failed_login">
                    {t('security:auditLog.actions.failed_login')}
                  </option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">
                    {t('security:sessionManagement.filterBySessions')}
                  </span>
                </label>
                <select
                  value={filterSession}
                  onChange={e => setFilterSession(e.target.value)}
                  className="select select-bordered"
                >
                  <option value="all">{t('common:all')}</option>
                  {activeSessions.map(session => {
                    const { browser, os } = parseUserAgent(session.userAgent);
                    return (
                      <option key={session.id} value={session.id}>
                        {session.isCurrent
                          ? `${t('security:sessionManagement.currentSession')} - `
                          : ''}
                        {browser} on {os} ({session.location || 'Unknown'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t('common:pagination.entriesPerPage')}</span>
                </label>
                <select
                  value={entriesPerPage}
                  onChange={e => handleEntriesPerPageChange(parseInt(e.target.value))}
                  className="select select-bordered"
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Management */}
      {showSessionManagement && (
        <div className="card bg-base-200 border-l-4 border-l-blue-500">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('security:sessionManagement.title')}
                </h4>
                <p className="text-sm text-base-content/60 mt-1">
                  {t('security:sessionManagement.description')}
                </p>
              </div>
              <button
                onClick={loadActiveSessions}
                className="btn btn-outline btn-sm"
                disabled={isSessionsLoading}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {t('common:refresh')}
              </button>
            </div>

            {isSessionsLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="loading loading-spinner loading-sm"></div>
                <span className="ml-2 text-sm">{t('common:loading')}</span>
              </div>
            ) : (
              <>
                {/* Active Sessions List */}
                <div className="space-y-3 mb-4">
                  {activeSessions.map(session => {
                    const { browser, os } = parseUserAgent(session.userAgent);
                    const deviceType = getDeviceType(session.userAgent);
                    const DeviceIcon = getDeviceIcon(deviceType);

                    return (
                      <div key={session.id} className="card bg-base-100 border border-base-300">
                        <div className="card-body p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <DeviceIcon className="h-5 w-5 text-base-content/60" />
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-sm">
                                    {browser} on {os}
                                  </span>
                                  {session.isCurrent && (
                                    <div className="badge badge-primary badge-xs">
                                      {t('security:sessionManagement.currentSession')}
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-base-content/60 flex items-center space-x-3 mt-1">
                                  <span className="flex items-center">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {session.location || 'Unknown location'}
                                  </span>
                                  <span className="flex items-center">
                                    <Globe className="h-3 w-3 mr-1" />
                                    {session.ipAddress}
                                  </span>
                                  <span className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {t('security:sessionManagement.lastAccessed', {
                                      time: new Date(session.lastAccessedAt).toLocaleString(),
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {!session.isCurrent && (
                              <button
                                onClick={() => setSelectedSessionForTermination(session)}
                                className="btn btn-outline btn-error btn-xs"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                {t('security:sessionManagement.terminateSession')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {activeSessions.length === 0 && (
                    <div className="text-center py-4 text-base-content/60">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{t('security:sessionManagement.noActiveSessions')}</p>
                    </div>
                  )}
                </div>

                {/* Global Session Management */}
                {activeSessions.filter(s => !s.isCurrent).length > 0 && (
                  <div className="border-t border-base-300 pt-4">
                    <h5 className="font-medium mb-3 text-sm">
                      {t('security:sessionManagement.globalActions')}
                    </h5>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowLogoutOthersConfirm(true)}
                        className="btn btn-outline btn-warning btn-sm"
                      >
                        <Power className="h-4 w-4 mr-1" />
                        {t('security:sessionManagement.logoutOtherSessions')}
                      </button>
                      <button
                        onClick={() => setShowLogoutAllConfirm(true)}
                        className="btn btn-outline btn-error btn-sm"
                      >
                        <Power className="h-4 w-4 mr-1" />
                        {t('security:sessionManagement.logoutAllSessions')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Pagination Info */}
      {totalEntries > 0 && (
        <div className="flex justify-between items-center text-sm text-base-content/60">
          <span>
            {t('common:pagination.showingEntries', {
              start: (currentPage - 1) * entriesPerPage + 1,
              end: Math.min(currentPage * entriesPerPage, totalEntries),
              total: totalEntries,
            })}
          </span>
        </div>
      )}

      {/* Audit Log Entries */}
      {auditLogs.length === 0 ? (
        <div className="text-center py-8">
          <Eye className="h-12 w-12 text-base-content/30 mx-auto mb-3" />
          <h3 className="font-medium text-base-content/60 mb-1">
            {t('security:auditLog.noEntries')}
          </h3>
          <p className="text-sm text-base-content/50">
            {searchTerm || filterAction !== 'all'
              ? t('security:auditLog.noMatchingEntries')
              : t('security:auditLog.noEntriesDescription')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {auditLogs.map(log => {
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-base-content/60">
            {t('common:pagination.page')} {currentPage} {t('common:pagination.of')} {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="btn btn-outline btn-sm"
            >
              {t('common:pagination.first')}
            </button>

            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="btn btn-outline btn-sm"
            >
              {t('common:pagination.previous')}
            </button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`btn btn-sm ${
                      pageNumber === currentPage ? 'btn-primary' : 'btn-outline'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="btn btn-outline btn-sm"
            >
              {t('common:pagination.next')}
            </button>

            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="btn btn-outline btn-sm"
            >
              {t('common:pagination.last')}
            </button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat bg-base-200 rounded-lg p-3">
          <div className="stat-title text-xs">{t('security:auditLog.stats.totalEntries')}</div>
          <div className="stat-value text-lg">{totalEntries}</div>
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

      {/* Session Termination Confirmation Modal */}
      {selectedSessionForTermination && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {t('security:sessionManagement.confirmTerminate')}
            </h3>
            <div className="py-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm">{t('security:sessionManagement.terminateWarning')}</p>
                  <div className="text-xs text-base-content/60 mt-1">
                    {parseUserAgent(selectedSessionForTermination.userAgent).browser} on{' '}
                    {parseUserAgent(selectedSessionForTermination.userAgent).os} (
                    {selectedSessionForTermination.location})
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-outline"
                onClick={() => setSelectedSessionForTermination(null)}
              >
                {t('common:cancel')}
              </button>
              <button
                className="btn btn-error"
                onClick={() => terminateSession(selectedSessionForTermination.id)}
              >
                {t('security:sessionManagement.terminateSession')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Other Sessions Confirmation Modal */}
      {showLogoutOthersConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {t('security:sessionManagement.confirmLogoutOthers')}
            </h3>
            <div className="py-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
                  <Power className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm">{t('security:sessionManagement.logoutOthersWarning')}</p>
                  <p className="text-xs text-base-content/60 mt-1">
                    {t('security:sessionManagement.othersSessionsCount', {
                      count: activeSessions.filter(s => !s.isCurrent).length,
                    })}
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-outline" onClick={() => setShowLogoutOthersConfirm(false)}>
                {t('common:cancel')}
              </button>
              <button className="btn btn-warning" onClick={logoutOtherSessions}>
                {t('security:sessionManagement.logoutOtherSessions')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout All Sessions Confirmation Modal */}
      {showLogoutAllConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {t('security:sessionManagement.confirmLogoutAll')}
            </h3>
            <div className="py-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-error/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-error" />
                </div>
                <div>
                  <p className="text-sm font-medium text-error">
                    {t('security:sessionManagement.logoutAllWarning')}
                  </p>
                  <p className="text-xs text-base-content/60 mt-1">
                    {t('security:sessionManagement.allSessionsCount', {
                      count: activeSessions.length,
                    })}
                  </p>
                  <p className="text-xs text-warning mt-2">
                    {t('security:sessionManagement.autoLogoutNotice')}
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-outline" onClick={() => setShowLogoutAllConfirm(false)}>
                {t('common:cancel')}
              </button>
              <button className="btn btn-error" onClick={logoutAllSessions}>
                {t('security:sessionManagement.logoutAllSessions')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityAuditLog;
