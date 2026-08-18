import { useEffect, useState, useCallback } from 'react';
import { fetchActivity } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import Spinner from '../../components/common/Spinner';
import { EmptyState } from '../../components/common/States';
import { Activity, Search } from 'lucide-react';

const ACTION_COLORS = {
  PRODUCT_CREATED: 'bg-green-50 text-green-700', PRODUCT_UPDATED: 'bg-blue-50 text-blue-700',
  PRODUCT_DEACTIVATED: 'bg-red-50 text-red-700', PRODUCT_REACTIVATED: 'bg-green-50 text-green-700',
  STOCK_INCREASED: 'bg-green-50 text-green-700', STOCK_DECREASED: 'bg-orange-50 text-orange-700',
  ORDER_STATUS_UPDATED: 'bg-blue-50 text-blue-700', ORDER_CANCELLED: 'bg-red-50 text-red-700',
  USER_ROLE_CHANGED: 'bg-purple-50 text-purple-700', USER_DISABLED: 'bg-red-50 text-red-700',
  USER_ENABLED: 'bg-green-50 text-green-700',
};

const AdminActivity = () => {
  const [logs, setLogs]             = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch]         = useState('');
  const [action, setAction]         = useState('');
  const [entityType, setEntityType] = useState('');
  const [loading, setLoading]       = useState(true);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetchActivity({ search: search || undefined, action: action || undefined, entityType: entityType || undefined, page, limit: 25 });
      setLogs(res.data.logs || []);
      setPagination(res.data.pagination || { page: 1, totalPages: 1 });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, action, entityType]);

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Admin Activity Log</h1>
        <p className="text-xs text-gray-500 mt-0.5">Full audit trail of admin actions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="input-field pl-8 text-sm py-1.5 max-w-xs" />
        </div>
        <select value={action} onChange={e => setAction(e.target.value)} className="input-field text-sm py-1.5 max-w-[200px]">
          <option value="">All Actions</option>
          {['PRODUCT_CREATED','PRODUCT_UPDATED','PRODUCT_DEACTIVATED','STOCK_INCREASED','STOCK_DECREASED',
            'ORDER_STATUS_UPDATED','ORDER_CANCELLED','USER_ROLE_CHANGED','USER_DISABLED','USER_ENABLED',
            'CATEGORY_CREATED','CATEGORY_UPDATED'].map(a => <option key={a} value={a}>{a.replace(/_/g,' ')}</option>)}
        </select>
        <select value={entityType} onChange={e => setEntityType(e.target.value)} className="input-field text-sm py-1.5 max-w-[150px]">
          <option value="">All Entities</option>
          {['Product','Order','User','Category'].map(t => <option key={t}>{t}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{pagination.total} total entries</span>
      </div>

      {loading ? <Spinner full size="lg" /> : logs.length === 0 ? (
        <EmptyState icon={Activity} title="No activity recorded yet" />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Date/Time</th>
                  <th className="text-left px-4 py-3">Admin</th>
                  <th className="text-left px-4 py-3">Action</th>
                  <th className="text-left px-4 py-3">Entity</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log._id} className="border-t border-gray-100 hover:bg-muted/40">
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{log.adminName}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                        {log.action.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{log.entityType}</td>
                    <td className="px-4 py-3 text-gray-700">{log.entityName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => load(pagination.page - 1)} disabled={pagination.page <= 1}
                className="btn-outline text-sm py-1.5 px-3 disabled:opacity-40">Prev</button>
              <span className="text-sm text-gray-600">Page {pagination.page} of {pagination.totalPages}</span>
              <button onClick={() => load(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                className="btn-outline text-sm py-1.5 px-3 disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminActivity;
