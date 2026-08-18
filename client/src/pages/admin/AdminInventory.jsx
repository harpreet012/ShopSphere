import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchInventory, fetchLowStock, fetchOutOfStock, adjustStock,
  fetchInventoryValue, fetchInventoryHistory, downloadInventoryCSV
} from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import { formatPrice } from '../../utils/format';
import Spinner from '../../components/common/Spinner';
import { ErrorState, EmptyState } from '../../components/common/States';
import { Package, AlertTriangle, XCircle, Download, RefreshCw, TrendingUp } from 'lucide-react';

const STATUS_BADGE = {
  IN_STOCK:     'bg-green-50 text-green-700',
  LOW_STOCK:    'bg-orange-50 text-orange-700',
  OUT_OF_STOCK: 'bg-red-50 text-red-700'
};

// Stock Adjust Modal
const AdjustModal = ({ product, onClose, onSaved }) => {
  const [type, setType] = useState('ADD');
  const [qty, setQty]   = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!qty || !reason.trim()) { setError('All fields are required'); return; }
    setError(''); setLoading(true);
    try {
      await adjustStock(product._id, { adjustmentType: type, quantity: Number(qty), reason });
      onSaved();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-bold text-gray-800 mb-4">Adjust Stock — {product.name}</h2>
        <p className="text-sm text-gray-500 mb-4">Current stock: <span className="font-bold text-gray-800">{product.stock}</span></p>
        {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded mb-3">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-2">
            {['ADD','REMOVE'].map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  type === t ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:bg-muted'}`}>
                {t === 'ADD' ? '+ Add Stock' : '− Remove Stock'}
              </button>
            ))}
          </div>
          <div>
            <label className="label-text">Quantity</label>
            <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
              className="input-field" placeholder="Enter quantity" required />
          </div>
          <div>
            <label className="label-text">Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)} className="input-field" required>
              <option value="">Select reason…</option>
              {type === 'ADD'
                ? ['New Supplier Shipment','Inventory Correction','Return from Customer','Other'].map(r => <option key={r}>{r}</option>)
                : ['Damaged Items','Expired Products','Inventory Correction','Lost/Stolen','Other'].map(r => <option key={r}>{r}</option>)
              }
            </select>
          </div>
          {qty && reason && (
            <div className="bg-muted rounded-lg p-3 text-sm">
              <span className="text-gray-500">New Stock: </span>
              <span className="font-bold text-gray-800">
                {Math.max(0, product.stock + (type === 'ADD' ? Number(qty) : -Number(qty)))}
              </span>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// History Modal
const HistoryModal = ({ product, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventoryHistory(product._id).then(r => setHistory(r.data.transactions || [])).finally(() => setLoading(false));
  }, [product._id]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-800">Stock History — {product.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        {loading ? <Spinner /> : history.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No history yet.</p>
        ) : (
          <div className="overflow-y-auto space-y-2">
            {history.map(tx => (
              <div key={tx._id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${tx.quantityChanged > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {tx.quantityChanged > 0 ? '+' : ''}{tx.quantityChanged} units
                  </span>
                  <span className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1.5">{tx.previousStock} → <strong>{tx.newStock}</strong> · {tx.type}</p>
                {tx.reason && <p className="text-xs text-gray-400 mt-0.5">{tx.reason}</p>}
                <p className="text-xs text-gray-400">By: {tx.performedByName}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AdminInventory = () => {
  const [products, setProducts]     = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [lowStock, setLowStock]     = useState([]);
  const [outOfStock, setOutOfStock] = useState([]);
  const [invValue, setInvValue]     = useState(null);
  const [tab, setTab]               = useState('all');
  const [search, setSearch]         = useState('');
  const [sort, setSort]             = useState('name');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [adjustProduct, setAdjust]  = useState(null);
  const [historyProduct, setHistory]= useState(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true); setError('');
    try {
      const statusMap = { low: 'LOW_STOCK', out: 'OUT_OF_STOCK', in: 'IN_STOCK' };
      const [inv, ls, oos, val] = await Promise.all([
        fetchInventory({ status: statusMap[tab] || '', search: search || undefined, sort, page, limit: 20 }),
        fetchLowStock(),
        fetchOutOfStock(),
        fetchInventoryValue()
      ]);
      setProducts(inv.data.products || []);
      setPagination(inv.data.pagination || { page: 1, totalPages: 1, total: 0 });
      setLowStock(ls.data.products || []);
      setOutOfStock(oos.data.products || []);
      setInvValue(val.data || null);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [tab, search, sort]);

  useEffect(() => { load(1); }, [load]);

  const handleExport = async () => {
    try {
      const res = await downloadInventoryCSV();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'inventory.csv'; a.click();
    } catch { /* ignore */ }
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Inventory Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">Monitor stock levels and adjust inventory</p>
        </div>
        <button onClick={handleExport} className="btn-outline text-xs flex items-center gap-1.5 py-1.5 px-3">
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Summary cards */}
      {invValue && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card p-3">
            <p className="text-xs text-gray-500">Total Value</p>
            <p className="text-lg font-bold text-gray-800">{formatPrice(invValue.totalValue)}</p>
          </div>
          <div className="card p-3">
            <p className="text-xs text-gray-500">Total Units</p>
            <p className="text-lg font-bold text-gray-800">{invValue.totalUnits?.toLocaleString()}</p>
          </div>
          <div className="card p-3 cursor-pointer" onClick={() => setTab('low')}>
            <p className="text-xs text-orange-500">Low Stock</p>
            <p className="text-lg font-bold text-orange-600">{lowStock.length}</p>
          </div>
          <div className="card p-3 cursor-pointer" onClick={() => setTab('out')}>
            <p className="text-xs text-red-500">Out of Stock</p>
            <p className="text-lg font-bold text-red-600">{outOfStock.length}</p>
          </div>
        </div>
      )}

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="card p-4 border border-orange-200 bg-orange-50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-orange-600" />
            <h3 className="text-sm font-semibold text-orange-800">Low Stock Alerts</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {lowStock.slice(0, 6).map(p => (
              <div key={p._id} className="bg-white rounded-lg p-2.5 flex items-center gap-2.5">
                <img src={p.images?.[0]} alt={p.name} className="h-8 w-8 object-contain bg-gray-50 rounded flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 line-clamp-1">{p.name}</p>
                  <p className="text-[11px] text-orange-600">Only {p.stock} left · Threshold: {p.lowStockThreshold}</p>
                </div>
                <button onClick={() => setAdjust(p)} className="text-xs text-primary hover:underline flex-shrink-0">Restock</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[['all','All'],['in','In Stock'],['low','Low Stock'],['out','Out of Stock']].map(([v,l]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
          className="input-field max-w-xs text-sm py-1.5" />
        <select value={sort} onChange={e => setSort(e.target.value)} className="input-field max-w-[160px] text-sm py-1.5">
          <option value="name">Name A-Z</option>
          <option value="stock_asc">Stock ↑</option>
          <option value="stock_desc">Stock ↓</option>
          <option value="updated">Last Updated</option>
        </select>
        <button onClick={() => load(1)} className="text-gray-500 hover:text-gray-700">
          <RefreshCw size={15} />
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={() => load(1)} />}

      {loading ? <Spinner full size="lg" /> : products.length === 0 ? (
        <EmptyState icon={Package} title="No products found" />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Product</th>
                  <th className="text-left px-4 py-3">SKU</th>
                  <th className="text-left px-4 py-3">Category</th>
                  <th className="text-left px-4 py-3">Price</th>
                  <th className="text-left px-4 py-3">Stock</th>
                  <th className="text-left px-4 py-3">Threshold</th>
                  <th className="text-left px-4 py-3">Value</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Updated By</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id} className="border-t border-gray-100 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img src={p.images?.[0]} alt={p.name} className="h-9 w-9 object-contain bg-gray-50 rounded" />
                        <span className="font-medium text-gray-800 line-clamp-1 max-w-[180px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-3 text-gray-600">{p.category || '—'}</td>
                    <td className="px-4 py-3">{formatPrice(p.price)}</td>
                    <td className="px-4 py-3 font-bold text-gray-800">{p.stock}</td>
                    <td className="px-4 py-3 text-gray-500">{p.lowStockThreshold}</td>
                    <td className="px-4 py-3 text-gray-600">{formatPrice(p.inventoryValue)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[p.status]}`}>
                        {p.status.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{p.lastStockUpdatedBy || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setAdjust(p)} className="text-xs text-primary hover:underline">Adjust</button>
                        <button onClick={() => setHistory(p)} className="text-xs text-gray-500 hover:underline">History</button>
                      </div>
                    </td>
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

      {adjustProduct  && <AdjustModal product={adjustProduct}  onClose={() => setAdjust(null)}  onSaved={() => { setAdjust(null);  load(pagination.page); }} />}
      {historyProduct && <HistoryModal product={historyProduct} onClose={() => setHistory(null)} />}
    </div>
  );
};

export default AdminInventory;
