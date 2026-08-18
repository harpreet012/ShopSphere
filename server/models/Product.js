const mongoose = require('mongoose');

const specSchema = new mongoose.Schema(
  { key: { type: String, required: true }, value: { type: String, required: true } },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    images: [{ type: String, required: true }],
    stock: { type: Number, required: true, min: 0, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },
    specifications: [specSchema],
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    soldCount: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    lastStockUpdate: { type: Date, default: null },
    lastStockUpdatedBy: { type: String, default: null },
    source: { type: String, enum: ['manual', 'dummyjson'], default: 'manual' },
    externalId: { type: String, default: null }
  },
  { timestamps: true }
);

productSchema.virtual('finalPrice').get(function () {
  return Math.round(this.price - (this.price * this.discount) / 100);
});
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

productSchema.index({ name: 'text', description: 'text', brand: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ featured: 1, active: 1 });
// Sparse unique index: only enforced when source+externalId are both set (dummyjson products)
productSchema.index({ source: 1, externalId: 1 }, { unique: true, sparse: true, partialFilterExpression: { externalId: { $ne: null } } });

module.exports = mongoose.model('Product', productSchema);
