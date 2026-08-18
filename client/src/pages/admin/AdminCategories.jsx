import { useEffect, useState } from 'react';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../../services/productService';
import { getErrorMessage } from '../../services/api';
import Spinner from '../../components/common/Spinner';
import { EmptyState } from '../../components/common/States';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';

const emptyForm = { name: '', description: '', image: '' };

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchCategories();
      setCategories(res.data.categories);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (cat) => { setForm({ name: cat.name, description: cat.description, image: cat.image }); setEditingId(cat._id); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingId) await updateCategory(editingId, form);
      else await createCategory(form);
      setShowForm(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category? This will fail if products still reference it.')) return;
    setError('');
    try {
      await deleteCategory(id);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleToggleActive = async (cat) => {
    try {
      await updateCategory(cat._id, { isActive: !cat.isActive });
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-800">Manage Categories</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Add Category</button>
      </div>

      {error && <div className="bg-red-50 text-danger text-sm px-3 py-2 rounded mb-4">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 mb-5 space-y-3 max-w-md">
          <input required placeholder="Category Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          <input placeholder="Image URL" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="input-field" />
          <textarea placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <Spinner full size="lg" />
      ) : categories.length === 0 ? (
        <EmptyState icon={Tag} title="No categories yet" />
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat._id} className="card p-4 flex gap-3">
              <img src={cat.image} alt={cat.name} className="h-14 w-14 rounded-full object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800">{cat.name}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{cat.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <button onClick={() => handleToggleActive(cat)} className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.isActive ? 'bg-green-50 text-success' : 'bg-gray-100 text-gray-500'}`}>
                    {cat.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => openEdit(cat)} className="text-gray-400 hover:text-primary" aria-label="Edit"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(cat._id)} className="text-gray-400 hover:text-danger" aria-label="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
