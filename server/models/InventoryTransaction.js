const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema(
  {
    product:         { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName:     { type: String, required: true },
    previousStock:   { type: Number, required: true },
    quantityChanged: { type: Number, required: true }, // positive = increase, negative = decrease
    newStock:        { type: Number, required: true },
    type: {
      type: String,
      enum: ['SALE', 'RESTOCK', 'MANUAL_ADJUSTMENT', 'RETURN', 'CANCELLATION', 'DAMAGE', 'CORRECTION'],
      required: true
    },
    reason:          { type: String, default: '' },
    source:          { type: String, enum: ['ADMIN', 'ORDER', 'SYSTEM'], default: 'SYSTEM' },
    performedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    performedByName: { type: String, default: 'System' },
    orderId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null }
  },
  { timestamps: true }
);

inventoryTransactionSchema.index({ product: 1, createdAt: -1 });
inventoryTransactionSchema.index({ performedBy: 1 });
inventoryTransactionSchema.index({ type: 1 });
inventoryTransactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
