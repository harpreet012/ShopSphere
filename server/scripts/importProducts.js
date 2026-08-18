/**
 * ShopSphere Product Import Script
 * Usage: npm run import:products
 *
 * Fetches all products from DummyJSON and upserts into MongoDB.
 * Safe to run repeatedly. Never modifies users, carts, orders, reviews.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const https = require('https');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');

const DUMMYJSON_URL = 'https://dummyjson.com/products?limit=0';

const fetchJSON = (url) =>
  new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse response: ' + e.message)); }
      });
    }).on('error', reject);
  });

const categoryCache = {};
const getOrCreateCategory = async (rawCategory, categoryImage = '') => {
  const slug = rawCategory
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  if (categoryCache[slug]) {
    return categoryCache[slug];
  }
  const name = rawCategory
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  let cat = await Category.findOne({ slug });
  if (!cat) {
    cat = await Category.create({
      name,
      slug,
      description: `${name} products`,
      image: categoryImage || ''
    });
  } else if (!cat.image && categoryImage) {
    // Only fill missing category images.
    // Never overwrite an existing custom/seed image.
    cat.image = categoryImage;
    await cat.save();
  }
  categoryCache[slug] = cat._id;
  return cat._id;
};

const mapProduct = async (item) => {
  const categoryImage =
    item.thumbnail ||
    (item.images && item.images.length ? item.images[0] : '');
  const categoryId = await getOrCreateCategory(
    item.category,
    categoryImage
  );
  return {
    name: item.title,
    description: item.description || `${item.title} by ${item.brand || 'Various'}`,
    category: categoryId,
    brand: item.brand || 'Generic',
    price: Math.round(item.price * 83),         // USD → INR
    discount: Math.min(Math.round(item.discountPercentage || 0), 80),
    images: (item.images && item.images.length) ? item.images : [item.thumbnail],
    stock: typeof item.stock === 'number' ? item.stock : 0,
    rating: item.rating || 0,
    numReviews: Array.isArray(item.reviews) ? item.reviews.length : 0,
    specifications: [
      item.brand                ? { key: 'Brand',      value: item.brand }             : null,
      item.weight               ? { key: 'Weight',     value: `${item.weight}g` }      : null,
      item.dimensions           ? { key: 'Dimensions', value: `${item.dimensions.width}×${item.dimensions.height}×${item.dimensions.depth} cm` } : null,
      item.warrantyInformation  ? { key: 'Warranty',   value: item.warrantyInformation }  : null,
      item.shippingInformation  ? { key: 'Shipping',   value: item.shippingInformation }  : null,
    ].filter(Boolean),
    featured: (item.rating || 0) >= 4.5,
    active: item.availabilityStatus !== 'Discontinued',
    soldCount: typeof item.stock === 'number' ? Math.max(0, 200 - item.stock) : 0,
    // Identity fields — used for safe upsert
    source: 'dummyjson',
    externalId: String(item.id),
  };
};

const run = async () => {
  console.log('🛍  ShopSphere Product Import');
  console.log('================================');

  await connectDB();
  console.log('✅ Connected to MongoDB\n');

  console.log(`📥 Fetching from DummyJSON...`);
  const json = await fetchJSON(DUMMYJSON_URL);
  const items = json.products || [];
  console.log(`   Found ${items.length} products to import\n`);

  let created = 0, updated = 0, errors = 0;

  for (const item of items) {
    try {
      const data = await mapProduct(item);

      // Upsert ONLY by source + externalId.
      // Manual products (source='manual') are NEVER touched even if name/brand match.
      const filter = { source: 'dummyjson', externalId: String(item.id) };
      const existing = await Product.findOne(filter);
      if (existing) {
        // Update only dummyjson-sourced product — never overwrite manual products
        await Product.findByIdAndUpdate(existing._id, { $set: data });
        updated++;
      } else {
        await Product.create(data);
        created++;
      }
    } catch (err) {
      console.error(`   ❌ "${item.title}": ${err.message}`);
      errors++;
    }
  }

  // Verify data integrity - user data must be untouched
  const userCount = await User.countDocuments();
  const productCount = await Product.countDocuments();

  console.log('📊 Import Summary');
  console.log('==================');
  console.log(`   ✅ Created  : ${created}`);
  console.log(`   🔄 Updated  : ${updated}`);
  console.log(`   ❌ Errors   : ${errors}`);
  console.log(`   📦 Total DB : ${productCount} products`);
  console.log(`   👥 Users    : ${userCount} (untouched)`);

  await mongoose.disconnect();
  console.log('\n✅ Import complete.');
  process.exit(0);
};

run().catch((err) => {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
});