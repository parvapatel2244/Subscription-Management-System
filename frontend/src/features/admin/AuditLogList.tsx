import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { AuditLog } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ShieldCheck, History, Eye, Terminal, Clock, MapPin } from 'lucide-react';

export const AuditLogList: React.FC = () => {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs'],
    queryFn: () => api.get<AuditLog[]>('/api/v1/audit?limit=150'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail & Compliance</h1>
          <p className="text-sm text-gray-500">Immutable chronological record of administrative actions, billing changes, and security events</p>
        </div>
        <div className="inline-flex items-center text-xs text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-600 mr-1.5" />
          Tamper-evident system log
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-500">Loading audit log entries...</div>
      ) : (Array.isArray(logs) ? logs : []).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No audit events recorded</h3>
          <p className="text-sm text-gray-500 mt-1">Actions performed across the application will be automatically captured here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Timestamp</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Action</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Entity</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">User ID</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">IP Address</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-mono text-xs">
              {(Array.isArray(logs) ? logs : []).map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-sans">
                    <span className="font-medium text-gray-800">{log.entity_type}</span>
                    {log.entity_id && (
                      <span className="text-gray-400 ml-1">#{log.entity_id}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {log.user_id ? `User #${log.user_id}` : 'System Agent'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span>{log.ip_address || '127.0.0.1'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-sans">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Inspect Diff
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inspect Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Event Detail #${selectedLog?.id}`}
      >
        {selectedLog && (
          <div className="space-y-4 text-sm font-sans">
            <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div>
                <span className="text-gray-400">Action:</span>{' '}
                <span className="font-semibold text-gray-800">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-gray-400">Entity:</span>{' '}
                <span className="font-semibold text-gray-800">{selectedLog.entity_type} #{selectedLog.entity_id}</span>
              </div>
              <div>
                <span className="text-gray-400">User:</span>{' '}
                <span className="font-semibold text-gray-800">{selectedLog.user_id || 'System'}</span>
              </div>
              <div>
                <span className="text-gray-400">Time:</span>{' '}
                <span className="font-semibold text-gray-800">{new Date(selectedLog.created_at).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5" />
                Previous State (Old Values)
              </label>
              <pre className="p-3 bg-gray-900 text-gray-100 text-xs rounded-lg overflow-x-auto font-mono">
                {selectedLog.old_values ? (
                  typeof selectedLog.old_values === 'string' ? (
                    (() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedLog.old_values), null, 2);
                      } catch {
                        return selectedLog.old_values;
                      }
                    })()
                  ) : (
                    JSON.stringify(selectedLog.old_values, null, 2)
                  )
                ) : (
                  '<None>'
                )}
              </pre>
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-600 mb-1 flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5" />
                Applied Change (New Values)
              </label>
              <pre className="p-3 bg-gray-900 text-emerald-400 text-xs rounded-lg overflow-x-auto font-mono">
                {selectedLog.new_values ? (
                  typeof selectedLog.new_values === 'string' ? (
                    (() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedLog.new_values), null, 2);
                      } catch {
                        return selectedLog.new_values;
                      }
                    })()
                  ) : (
                    JSON.stringify(selectedLog.new_values, null, 2)
                  )
                ) : (
                  '<None>'
                )}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

