const AdminActivityLog = require('../models/AdminActivityLog');
const InventoryTransaction = require('../models/InventoryTransaction');

/**
 * Create an admin activity audit log entry.
 * Fails silently so it never breaks the main request flow.
 */
const logAdminActivity = async ({ adminUser, adminName, action, entityType, entityId, entityName = '', details = '', metadata = {} }) => {
  try {
    await AdminActivityLog.create({ adminUser, adminName, action, entityType, entityId, entityName, details, metadata });
  } catch (err) {
    console.error('[AuditLog] Failed to create log:', err.message);
  }
};

/**
 * Create an inventory transaction record.
 * Fails silently so it never breaks the main request flow.
 */
const logInventoryTransaction = async ({
  product,
  productName,
  previousStock,
  quantityChanged,
  newStock,
  type,
  reason = '',
  source = 'SYSTEM',
  performedBy = null,
  performedByName = 'System',
  orderId = null
}) => {
  try {
    await InventoryTransaction.create({
      product, productName, previousStock, quantityChanged, newStock,
      type, reason, source, performedBy, performedByName, orderId
    });
  } catch (err) {
    console.error('[InventoryLog] Failed to create transaction:', err.message);
  }
};

module.exports = { logAdminActivity, logInventoryTransaction };
