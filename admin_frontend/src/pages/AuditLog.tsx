import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle, XCircle, Search, Filter } from 'lucide-react';
import { auditService } from '../api/services/audit.service';
import { useApi } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { Table } from '../components/Table';
import type { Column } from '../components/Table';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import type { AuditLog as AuditLogType } from '../types/audit.types';

const AuditLog: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSuccess, setFilterSuccess] = useState<boolean | null>(null);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogType[]>([]);
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const { data: logs, loading, error, execute: fetchLogs } = useApi(
    auditService.getAuditLogs
  );

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (logs) {
      let filtered = [...logs];

      // Apply search filter
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase().trim();
        filtered = filtered.filter((log) => {
          const searchableFields = [
            log.email?.toLowerCase() || '',
            log.eventType?.toLowerCase() || '',
            log.ipAddress?.toLowerCase() || '',
            log.cognitoSub?.toLowerCase() || '',
            log.userId?.toString() || '',
            log.failureReason?.toLowerCase() || '',
            log.userAgent?.toLowerCase() || '',
          ];
          
          return searchableFields.some(field => field.includes(query));
        });
      }

      // Apply success/failure filter
      if (filterSuccess !== null) {
        filtered = filtered.filter((log) => log.success === filterSuccess);
      }

      setFilteredLogs(filtered);
    } else {
      setFilteredLogs([]);
    }
  }, [logs, debouncedSearch, filterSuccess]);

  const columns: Column<AuditLogType>[] = [
    {
      key: 'id',
      header: 'ID',
      className: 'font-mono text-xs text-gray-600',
    },
    {
      key: 'email',
      header: 'User',
      render: (log) => (
        <div>
          <div className="font-medium text-gray-900">{log.email}</div>
          <div className="text-xs text-gray-500 font-mono">
            ID: {log.userId}
          </div>
        </div>
      ),
    },
    {
      key: 'eventType',
      header: 'Event',
      render: (log) => (
        <Badge variant="info" size="sm">
          {log.eventType}
        </Badge>
      ),
    },
    {
      key: 'success',
      header: 'Status',
      render: (log) => (
        <div className="flex items-center gap-2">
          {log.success ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <Badge variant="success" size="sm">
                Success
              </Badge>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-red-600" />
              <Badge variant="danger" size="sm">
                Failed
              </Badge>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      className: 'font-mono text-sm text-gray-700',
    },
    {
      key: 'failureReason',
      header: 'Details',
      render: (log) => (
        <span className="text-sm text-red-600">
          {log.failureReason || '-'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (log) => (
        <div className="text-sm text-gray-600">
          <div>{new Date(log.createdAt).toLocaleDateString()}</div>
          <div className="text-xs text-gray-500">
            {new Date(log.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
  ];

  if (loading) {
    return <LoadingSpinner size="lg" message="Loading audit logs..." />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <ErrorAlert message={error} onRetry={() => fetchLogs()} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Track all system activities and security events"
      />

      <Card padding="none">
        {/* Filters */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by email, event type, IP address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-5 h-5" />}
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setFilterSuccess(filterSuccess === true ? null : true)
                }
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterSuccess === true
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Success
              </button>
              <button
                onClick={() =>
                  setFilterSuccess(filterSuccess === false ? null : false)
                }
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterSuccess === false
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <XCircle className="w-4 h-4 inline mr-1" />
                Failed
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Showing {filteredLogs.length} of {logs?.length || 0} events
            </span>
            {(searchQuery || filterSuccess !== null) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterSuccess(null);
                }}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Table or Empty State */}
        {filteredLogs.length > 0 ? (
          <Table
            data={filteredLogs}
            columns={columns}
            keyExtractor={(log) => log.id}
            compact
          />
        ) : searchQuery || filterSuccess !== null ? (
          <div className="p-12">
            <EmptyState
              icon={<Filter className="w-12 h-12" />}
              title="No events found"
              description="Try adjusting your filters to see more results."
            />
          </div>
        ) : (
          <div className="p-12">
            <EmptyState
              icon={<FileText className="w-12 h-12" />}
              title="No audit logs yet"
              description="System events and user activities will appear here."
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLog;