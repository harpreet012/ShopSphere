require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');

const fixCategoryImages = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    const categories = await Category.find();

    let updated = 0;
    let skipped = 0;

    for (const category of categories) {
      if (category.image) {
        skipped++;
        continue;
      }

      const product = await Product.findOne({
        category: category._id,
        active: true,
        'images.0': { $exists: true }
      }).sort({ createdAt: 1 });

      if (!product?.images?.[0]) {
        console.log(`⚠️ No image found for: ${category.name}`);
        skipped++;
        continue;
      }

      category.image = product.images[0];
      await category.save();

      updated++;
      console.log(`✅ ${category.name} → image assigned`);
    }

    console.log('\n================================');
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log('================================');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    process.exit(1);
  }
};

fixCategoryImages();