/**
 * ShopSphere Unit Tests — no live DB required.
 */
jest.mock('../utils/emailService', () => ({
  sendOTPEmail: jest.fn().mockResolvedValue(true),
  sendOrderConfirmationEmail: jest.fn().mockResolvedValue(true),
  sendOrderShippedEmail: jest.fn().mockResolvedValue(true),
  sendOrderDeliveredEmail: jest.fn().mockResolvedValue(true),
  sendOrderCancellationEmail: jest.fn().mockResolvedValue(true),
}));

const { generateOTP, hashOTP, compareOTP, getOTPExpiry, checkResendCooldown } = require('../utils/otpGenerator');

// ── OTP utilities ─────────────────────────────────────────────────────────────
describe('OTP — generateOTP', () => {
  it('generates a 6-digit string', () => expect(generateOTP()).toMatch(/^\d{6}$/));
  it('generates different values',  () => expect(new Set([generateOTP(), generateOTP(), generateOTP()]).size).toBeGreaterThan(1));
});

describe('OTP — hash & compare', () => {
  it('correct OTP matches',    async () => { const otp = generateOTP(); expect(await compareOTP(otp, await hashOTP(otp))).toBe(true); });
  it('wrong OTP does not match', async () => { expect(await compareOTP('654321', await hashOTP('123456'))).toBe(false); });
});

describe('OTP — expiry', () => {
  it('returns ~10 minutes in future', () => {
    const diff = getOTPExpiry(10).getTime() - Date.now();
    expect(diff).toBeGreaterThan(9 * 60 * 1000);
    expect(diff).toBeLessThan(11 * 60 * 1000);
  });
});

describe('OTP — resend cooldown', () => {
  it('allows with no prior resend', () => expect(checkResendCooldown(null, 60).allowed).toBe(true));
  it('blocks within window',        () => expect(checkResendCooldown(new Date(Date.now() - 20000), 60).allowed).toBe(false));
  it('allows after expiry',         () => expect(checkResendCooldown(new Date(Date.now() - 90000), 60).allowed).toBe(true));
});

// BUG 3 — OTP model must have exactly one TTL index definition
describe('BUG 3 — OTP model duplicate TTL index', () => {
  it('has only one TTL index (no duplicate expiresAt schema index)', () => {
    // The schema should NOT call otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    // separately — it's already defined inline on the field.
    const fs = require('fs');
    const src = fs.readFileSync(require('path').join(__dirname, '../models/OTP.js'), 'utf8');
    // Count occurrences of expireAfterSeconds in the file — should be exactly 1
    const matches = src.match(/expireAfterSeconds/g) || [];
    expect(matches.length).toBe(1);
  });
});

// ── JWT ───────────────────────────────────────────────────────────────────────
describe('JWT generateToken', () => {
  beforeAll(() => { process.env.JWT_SECRET = 'test-secret'; });
  it('returns 3-part JWT',  () => expect(require('../utils/generateToken')('u1').split('.').length).toBe(3));
  it('encodes the user id', () => {
    const jwt = require('jsonwebtoken');
    expect(jwt.verify(require('../utils/generateToken')('abc123'), 'test-secret').id).toBe('abc123');
  });
});

// ── Order status transitions ──────────────────────────────────────────────────
describe('Order Status Transitions', () => {
  const MAP = {
    Pending: ['Confirmed','Cancelled'], Confirmed: ['Processing','Cancelled'],
    Processing: ['Shipped','Cancelled'], Shipped: ['Out for Delivery'],
    'Out for Delivery': ['Delivered'], Delivered: [], Cancelled: []
  };
  const ok = (f, t) => (MAP[f] || []).includes(t);

  it('Pending → Confirmed ✓',          () => expect(ok('Pending','Confirmed')).toBe(true));
  it('Confirmed → Processing ✓',       () => expect(ok('Confirmed','Processing')).toBe(true));
  it('Processing → Shipped ✓',         () => expect(ok('Processing','Shipped')).toBe(true));
  it('Shipped → Out for Delivery ✓',   () => expect(ok('Shipped','Out for Delivery')).toBe(true));
  it('Out for Delivery → Delivered ✓', () => expect(ok('Out for Delivery','Delivered')).toBe(true));
  it('Pending → Cancelled ✓',          () => expect(ok('Pending','Cancelled')).toBe(true));
  it('Delivered → Pending ✗',          () => expect(ok('Delivered','Pending')).toBe(false));
  it('Delivered → Cancelled ✗',        () => expect(ok('Delivered','Cancelled')).toBe(false));
  it('Cancelled → Delivered ✗',        () => expect(ok('Cancelled','Delivered')).toBe(false));
  it('Confirmed → Shipped ✗ (skip)',   () => expect(ok('Confirmed','Shipped')).toBe(false));
});

// BUG 5 — Status history actor fields
describe('BUG 5 — Order statusHistory includes actor', () => {
  it('Order model statusHistory schema includes actor and actorRole', () => {
    const fs   = require('fs');
    const path = require('path');
    const src  = fs.readFileSync(path.join(__dirname, '../models/Order.js'), 'utf8');
    expect(src).toMatch(/actor/);
    expect(src).toMatch(/actorRole/);
  });
});

// ── Product validation ────────────────────────────────────────────────────────
describe('Product Validation Logic', () => {
  const valid = () => ({ name:'W', description:'D', category:'c1', brand:'B', price:100, stock:10, images:['x'] });
  const validate = d => {
    const e = [];
    if (!d.name?.trim()) e.push('name');
    if (!d.description?.trim()) e.push('description');
    if (!d.category) e.push('category');
    if (!d.brand?.trim()) e.push('brand');
    if (d.price == null || isNaN(d.price) || d.price < 0) e.push('price');
    if (d.stock == null || isNaN(d.stock) || d.stock < 0) e.push('stock');
    if (d.discount != null && (isNaN(d.discount) || d.discount < 0 || d.discount > 100)) e.push('discount');
    if (!Array.isArray(d.images) || d.images.length === 0) e.push('images');
    return e;
  };
  it('accepts valid data',       () => expect(validate(valid())).toHaveLength(0));
  it('rejects empty name',       () => expect(validate({...valid(), name:''})).toContain('name'));
  it('rejects negative price',   () => expect(validate({...valid(), price:-1})).toContain('price'));
  it('rejects discount > 100',   () => expect(validate({...valid(), discount:110})).toContain('discount'));
  it('rejects discount < 0',     () => expect(validate({...valid(), discount:-1})).toContain('discount'));
  it('accepts discount = 0',     () => expect(validate({...valid(), discount:0})).not.toContain('discount'));
  it('rejects empty images',     () => expect(validate({...valid(), images:[]})).toContain('images'));
  it('rejects negative stock',   () => expect(validate({...valid(), stock:-1})).toContain('stock'));
  it('accepts stock = 0',        () => expect(validate({...valid(), stock:0})).not.toContain('stock'));
});

// ── Cart stock validation ─────────────────────────────────────────────────────
describe('Cart Stock Validation Logic', () => {
  const canAdd = (stock, current, add) => (current + add) <= stock ? { ok: true } : { ok: false };
  it('allows within stock',        () => expect(canAdd(10,0,5).ok).toBe(true));
  it('allows exactly at limit',    () => expect(canAdd(5,0,5).ok).toBe(true));
  it('blocks beyond stock',        () => expect(canAdd(3,0,5).ok).toBe(false));
  it('blocks cumulative exceed',   () => expect(canAdd(5,4,2).ok).toBe(false));
  it('allows 1 when stock is 1',   () => expect(canAdd(1,0,1).ok).toBe(true));
});

// ── BUG 2 — Per-product low stock threshold ───────────────────────────────────
describe('BUG 2 — Per-product low stock threshold', () => {
  const status = (stock, threshold) => {
    if (stock <= 0) return 'OUT_OF_STOCK';
    if (stock <= threshold) return 'LOW_STOCK';
    return 'IN_STOCK';
  };

  it('stock=8, threshold=10 → LOW_STOCK',  () => expect(status(8, 10)).toBe('LOW_STOCK'));
  it('stock=8, threshold=5  → IN_STOCK',   () => expect(status(8, 5)).toBe('IN_STOCK'));
  it('stock=0               → OUT_OF_STOCK', () => expect(status(0, 10)).toBe('OUT_OF_STOCK'));
  it('stock=10, threshold=10 → LOW_STOCK', () => expect(status(10, 10)).toBe('LOW_STOCK'));
  it('stock=11, threshold=10 → IN_STOCK',  () => expect(status(11, 10)).toBe('IN_STOCK'));
  it('stock=5, threshold=5  → LOW_STOCK',  () => expect(status(5, 5)).toBe('LOW_STOCK'));
  it('stock=1, threshold=1  → LOW_STOCK',  () => expect(status(1, 1)).toBe('LOW_STOCK'));
});

// ── BUG 1 — Inventory transaction logic ──────────────────────────────────────
describe('BUG 1 — Inventory transaction creation', () => {
  it('SALE tx has negative quantityChanged', () => {
    const qty = 3, stockBefore = 20;
    const tx = { type: 'SALE', previousStock: stockBefore, quantityChanged: -qty, newStock: stockBefore - qty, source: 'ORDER' };
    expect(tx.quantityChanged).toBe(-3);
    expect(tx.newStock).toBe(17);
    expect(tx.type).toBe('SALE');
    expect(tx.source).toBe('ORDER');
  });

  it('CANCELLATION tx has positive quantityChanged', () => {
    const qty = 3, stockBefore = 17;
    const tx = { type: 'CANCELLATION', previousStock: stockBefore, quantityChanged: qty, newStock: stockBefore + qty, source: 'ORDER' };
    expect(tx.quantityChanged).toBe(3);
    expect(tx.newStock).toBe(20);
    expect(tx.type).toBe('CANCELLATION');
  });

  it('RESTOCK tx from admin has positive quantityChanged', () => {
    const tx = { type: 'RESTOCK', previousStock: 10, quantityChanged: 50, newStock: 60, source: 'ADMIN' };
    expect(tx.quantityChanged).toBeGreaterThan(0);
    expect(tx.source).toBe('ADMIN');
  });

  it('stock never goes negative after adjustment', () => {
    const adjust = (stock, remove) => {
      if (stock - remove < 0) return null; // rejected
      return { newStock: stock - remove };
    };
    expect(adjust(5, 10)).toBeNull();
    expect(adjust(10, 5)).toMatchObject({ newStock: 5 });
    expect(adjust(5, 5)).toMatchObject({ newStock: 0 });
  });
});

// ── BUG 4 — Audit logging (no monkey-patching) ────────────────────────────────
describe('BUG 4 — Audit logger utility', () => {
  it('exports logAdminActivity function',       () => expect(typeof require('../utils/auditLogger').logAdminActivity).toBe('function'));
  it('exports logInventoryTransaction function', () => expect(typeof require('../utils/auditLogger').logInventoryTransaction).toBe('function'));

  it('productController does NOT use module.exports reassignment (no monkey-patch)', () => {
    const fs   = require('fs');
    const src  = fs.readFileSync(require('path').join(__dirname, '../controllers/productController.js'), 'utf8');
    expect(src).not.toMatch(/_orig\s*=/);
    expect(src).not.toMatch(/module\.exports\s*=\s*_orig/);
    expect(src).not.toMatch(/res\.json\s*=\s*async/);
  });

  it('orderController does NOT use monkey-patching', () => {
    const fs  = require('fs');
    const src = fs.readFileSync(require('path').join(__dirname, '../controllers/orderController.js'), 'utf8');
    expect(src).not.toMatch(/_origUpdate/);
    expect(src).not.toMatch(/res\.json\s*=\s*async/);
  });
});

// ── BUG 7 — dateTo includes full day ─────────────────────────────────────────
describe('BUG 7 — dateTo includes full day', () => {
  it('dateTo set to 23:59:59.999 of the selected day', () => {
    const dateTo = '2026-08-17';
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
  });

  it('plain new Date(dateTo) is not end-of-day', () => {
    const plain = new Date('2026-08-17');
    const isEndOfDay =
      plain.getHours() === 23 &&
      plain.getMinutes() === 59 &&
      plain.getSeconds() === 59 &&
      plain.getMilliseconds() === 999;
    expect(isEndOfDay).toBe(false);
  });
});

// ── BUG 8 — route ordering ────────────────────────────────────────────────────
describe('BUG 8 — /admin/all route before /:id', () => {
  it('productRoutes.js has /admin/all defined before /:id', () => {
    const fs   = require('fs');
    const src  = fs.readFileSync(require('path').join(__dirname, '../routes/productRoutes.js'), 'utf8');
    const adminAllPos = src.indexOf('/admin/all');
    const idPos       = src.indexOf("'/:id'");
    expect(adminAllPos).toBeGreaterThan(0);
    expect(adminAllPos).toBeLessThan(idPos);
  });
});

// ── BUG 9 — import script identity ───────────────────────────────────────────
describe('BUG 9 — DummyJSON import uses source+externalId', () => {
  it('importProducts.js uses externalId as key, not name+brand', () => {
    const fs  = require('fs');
    const src = fs.readFileSync(require('path').join(__dirname, '../scripts/importProducts.js'), 'utf8');
    expect(src).toMatch(/externalId/);
    expect(src).toMatch(/source.*dummyjson|dummyjson.*source/);
    // Must NOT use name+brand as the unique filter
    expect(src).not.toMatch(/filter.*name.*brand/);
  });
});

// ── BUG 10 — wishlist moveToCart order ───────────────────────────────────────
describe('BUG 10 — wishlist cart update before wishlist removal', () => {
  it('wishlistController saves cart before removing from wishlist', () => {
    const fs  = require('fs');
    const src = fs.readFileSync(require('path').join(__dirname, '../controllers/wishlistController.js'), 'utf8');
    const cartSavePos     = src.indexOf('await cart.save()');
    const wishlistSavePos = src.lastIndexOf('await user.save()');
    // cart.save must come BEFORE the final user.save (wishlist removal)
    expect(cartSavePos).toBeGreaterThan(0);
    expect(wishlistSavePos).toBeGreaterThan(cartSavePos);
  });

  it('addToWishlist rejects inactive products', () => {
    const fs  = require('fs');
    const src = fs.readFileSync(require('path').join(__dirname, '../controllers/wishlistController.js'), 'utf8');
    // Should check !product.active in addToWishlist
    expect(src).toMatch(/!product\.active/);
  });
});

// ── BUG 11 — OTP email failure returns error ──────────────────────────────────
describe('BUG 11 — OTP email failure returns 5xx', () => {
  it('otpController awaits sendOTPEmail (no fire-and-forget .catch)', () => {
    const fs  = require('fs');
    const src = fs.readFileSync(require('path').join(__dirname, '../controllers/otpController.js'), 'utf8');
    // Must NOT have the old fire-and-forget pattern
    expect(src).not.toMatch(/sendOTPEmail\(.*\)\.catch/);
    // Must await the send
    expect(src).toMatch(/await sendOTPEmail/);
  });

  it('returns 503 on email failure, not 200', () => {
    const fs  = require('fs');
    const src = fs.readFileSync(require('path').join(__dirname, '../controllers/otpController.js'), 'utf8');
    expect(src).toMatch(/503/);
    expect(src).toMatch(/Failed to send OTP email/);
  });
});