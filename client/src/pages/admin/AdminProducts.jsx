import { useEffect, useState } from 'react';
import { fetchAdminProducts, deleteProduct, fetchCategories } from '../../services/productService';
import { getErrorMessage } from '../../services/api';
import { formatPrice } from '../../utils/format';
import Spinner from '../../components/common/Spinner';
import { ErrorState, EmptyState } from '../../components/common/States';
import ProductFormModal from '../../components/admin/ProductFormModal';
import { Plus, Pencil, Trash2, Package, RotateCcw } from 'lucide-react';
import api from '../../services/api';

const AdminProducts = () => {
  const [products, setProducts]       = useState([]);
  const [categories, setCategories]   = useState([]);
  const [pagination, setPagination]   = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingId, setDeletingId]   = useState(null);
  const [search, setSearch]           = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'active' | 'inactive'

  const load = async (page = 1) => {
    setLoading(true); setError('');
    try {
      const [prodRes, catRes] = await Promise.all([
        fetchAdminProducts({
          search: search || undefined,
          page,
          limit: 20,
          active: activeFilter === 'all' ? undefined : activeFilter === 'active' ? 'true' : 'false'
        }),
        fetchCategories()
      ]);
      setProducts(prodRes.data.products);
      setPagination(prodRes.data.pagination);
      setCategories(catRes.data.categories);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, [search, activeFilter]);

  const handleDelete = async (product) => {
    const msg = product.active
      ? `Deactivate "${product.name}"? It will be hidden from customers but can be reactivated.`
      : `"${product.name}" is already inactive.`;
    if (product.active && !window.confirm(msg)) return;
    if (!product.active) { alert(msg); return; }

    setDeletingId(product._id);
    try {
      await deleteProduct(product._id);
      load(pagination.page);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const handleReactivate = async (product) => {
    if (!window.confirm(`Reactivate "${product.name}"? It will become visible to customers.`)) return;
    try {
      await api.put(`/products/${product._id}`, { active: true });
      load(pagination.page);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const openAdd  = () => { setEditingProduct(null); setShowModal(true); };
  const openEdit = (p) => { setEditingProduct(p); setShowModal(true); };
  const handleSaved = () => { setShowModal(false); load(pagination.page); };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800">Manage Products</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="input-field max-w-xs"
        />
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['all', 'active', 'inactive'].map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors
                ${activeFilter === f ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 text-danger text-sm px-3 py-2 rounded mb-4">{error}</div>}

      {loading ? <Spinner full size="lg" /> : products.length === 0 ? (
        <EmptyState icon={Package} title="No products found" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">Stock</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id} className={`border-t border-gray-100 ${!p.active ? 'opacity-60 bg-gray-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.images?.[0]} alt={p.name} className="h-10 w-10 object-contain bg-gray-50 rounded" />
                      <span className="line-clamp-1 max-w-xs font-medium text-gray-800">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.category?.name}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3">
                    <span className={p.stock <= 5 ? 'text-danger font-medium' : 'text-gray-600'}>{p.stock}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${p.active ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'}`}>
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                    {p.featured && <span className="ml-1 text-xs px-2 py-1 rounded-full bg-amber-50 text-accent">Featured</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-primary" title="Edit">
                        <Pencil size={15} />
                      </button>
                      {p.active ? (
                        <button onClick={() => handleDelete(p)} disabled={deletingId === p._id}
                          className="text-gray-400 hover:text-danger" title="Deactivate">
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        <button onClick={() => handleReactivate(p)}
                          className="text-gray-400 hover:text-success" title="Reactivate">
                          <RotateCcw size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button onClick={() => load(pagination.page - 1)} disabled={pagination.page <= 1}
            className="btn-outline text-sm py-1.5 px-3 disabled:opacity-40">Prev</button>
          <span className="text-sm text-gray-600">Page {pagination.page} of {pagination.totalPages}</span>
          <button onClick={() => load(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
            className="btn-outline text-sm py-1.5 px-3 disabled:opacity-40">Next</button>
        </div>
      )}

      {showModal && (
        <ProductFormModal categories={categories} product={editingProduct}
          onClose={() => setShowModal(false)} onSaved={handleSaved} />
      )}
    </div>
  );
};

export default AdminProducts;
