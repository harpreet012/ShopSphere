const mongoose = require('mongoose');

const adminActivityLogSchema = new mongoose.Schema(
  {
    adminUser:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    adminName:   { type: String, required: true },
    action: {
      type: String,
      enum: [
        'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DEACTIVATED', 'PRODUCT_REACTIVATED',
        'PRODUCT_DELETED_ATTEMPT', 'STOCK_INCREASED', 'STOCK_DECREASED',
        'ORDER_STATUS_UPDATED', 'ORDER_CANCELLED',
        'USER_CREATED', 'USER_UPDATED', 'USER_ROLE_CHANGED', 'USER_DISABLED', 'USER_ENABLED',
        'CATEGORY_CREATED', 'CATEGORY_UPDATED', 'CATEGORY_DELETED',
        'REVIEW_MODERATED'
      ],
      required: true
    },
    entityType:  { type: String, enum: ['Product', 'Order', 'User', 'Category', 'Review'], required: true },
    entityId:    { type: mongoose.Schema.Types.ObjectId, required: true },
    entityName:  { type: String, default: '' },
    details:     { type: String, default: '' }, // human-readable description of what changed
    metadata:    { type: mongoose.Schema.Types.Mixed, default: {} } // structured data (before/after)
  },
  { timestamps: true }
);

adminActivityLogSchema.index({ adminUser: 1, createdAt: -1 });
adminActivityLogSchema.index({ entityType: 1, entityId: 1 });
adminActivityLogSchema.index({ action: 1 });
adminActivityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminActivityLog', adminActivityLogSchema);
