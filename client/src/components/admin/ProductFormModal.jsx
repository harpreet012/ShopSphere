import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { createProduct, updateProduct } from '../../services/productService';
import { getErrorMessage } from '../../services/api';

const emptyForm = {
  name: '', description: '', category: '', brand: '', price: '', discount: 0,
  stock: '', images: [''], specifications: [{ key: '', value: '' }], featured: false, active: true
};

const ProductFormModal = ({ categories, product, onClose, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: product.description,
        category: product.category?._id || product.category,
        brand: product.brand,
        price: product.price,
        discount: product.discount,
        stock: product.stock,
        images: product.images?.length ? product.images : [''],
        specifications: product.specifications?.length ? product.specifications : [{ key: '', value: '' }],
        featured: product.featured,
        active: product.active
      });
    } else {
      setForm(emptyForm);
    }
  }, [product]);

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const updateImage = (idx, value) => {
    const images = [...form.images];
    images[idx] = value;
    setForm((f) => ({ ...f, images }));
  };
  const addImageField = () => setForm((f) => ({ ...f, images: [...f.images, ''] }));
  const removeImageField = (idx) => setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

  const updateSpec = (idx, key, value) => {
    const specs = [...form.specifications];
    specs[idx] = { ...specs[idx], [key]: value };
    setForm((f) => ({ ...f, specifications: specs }));
  };
  const addSpecField = () => setForm((f) => ({ ...f, specifications: [...f.specifications, { key: '', value: '' }] }));
  const removeSpecField = (idx) => setForm((f) => ({ ...f, specifications: f.specifications.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      ...form,
      price: Number(form.price),
      discount: Number(form.discount),
      stock: Number(form.stock),
      images: form.images.filter((i) => i.trim()),
      specifications: form.specifications.filter((s) => s.key.trim() && s.value.trim())
    };
    try {
      if (product) {
        await updateProduct(product._id, payload);
      } else {
        await createProduct(payload);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-800">{product ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-50 text-danger text-sm px-3 py-2 rounded">{error}</div>}

          <div>
            <label className="label-text">Product Name</label>
            <input required value={form.name} onChange={(e) => updateField('name', e.target.value)} className="input-field" />
          </div>

          <div>
            <label className="label-text">Description</label>
            <textarea required rows={3} value={form.description} onChange={(e) => updateField('description', e.target.value)} className="input-field" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Category</label>
              <select required value={form.category} onChange={(e) => updateField('category', e.target.value)} className="input-field">
                <option value="">Select category</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label-text">Brand</label>
              <input required value={form.brand} onChange={(e) => updateField('brand', e.target.value)} className="input-field" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-text">Price (₹)</label>
              <input required type="number" min="0" value={form.price} onChange={(e) => updateField('price', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-text">Discount (%)</label>
              <input type="number" min="0" max="100" value={form.discount} onChange={(e) => updateField('discount', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-text">Stock</label>
              <input required type="number" min="0" value={form.stock} onChange={(e) => updateField('stock', e.target.value)} className="input-field" />
            </div>
          </div>

          <div>
            <label className="label-text">Image URLs</label>
            {form.images.map((img, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input value={img} onChange={(e) => updateImage(idx, e.target.value)} placeholder="https://..." className="input-field" />
                {form.images.length > 1 && (
                  <button type="button" onClick={() => removeImageField(idx)} className="text-gray-400 hover:text-danger px-2"><Trash2 size={16} /></button>
                )}
              </div>
            ))}
            <button type="button" onClick={addImageField} className="text-primary text-xs font-medium flex items-center gap-1"><Plus size={13} /> Add Image URL</button>
          </div>

          <div>
            <label className="label-text">Specifications</label>
            {form.specifications.map((spec, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input value={spec.key} onChange={(e) => updateSpec(idx, 'key', e.target.value)} placeholder="Key (e.g. Warranty)" className="input-field" />
                <input value={spec.value} onChange={(e) => updateSpec(idx, 'value', e.target.value)} placeholder="Value" className="input-field" />
                <button type="button" onClick={() => removeSpecField(idx)} className="text-gray-400 hover:text-danger px-2"><Trash2 size={16} /></button>
              </div>
            ))}
            <button type="button" onClick={addSpecField} className="text-primary text-xs font-medium flex items-center gap-1"><Plus size={13} /> Add Specification</button>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.featured} onChange={(e) => updateField('featured', e.target.checked)} /> Featured
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.active} onChange={(e) => updateField('active', e.target.checked)} /> Active
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : product ? 'Update Product' : 'Create Product'}</button>
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
