const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Review = require('../models/Review');

const slugify = (str) =>
  str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const categoryData = [
  { name: 'Electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600' },
  { name: 'Fashion', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600' },
  { name: 'Home & Kitchen', image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=600' },
  { name: 'Footwear', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600' },
  { name: 'Beauty & Personal Care', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600' },
  { name: 'Sports & Fitness', image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600' }
];

const productPool = {
  Electronics: [
    { name: 'Wireless Bluetooth Headphones', brand: 'SoundCore', price: 2999, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600' },
    { name: '4K Smart LED TV 43-inch', brand: 'VisionMax', price: 24999, img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600' },
    { name: 'Mechanical Gaming Keyboard', brand: 'KeyForge', price: 3499, img: 'https://images.unsplash.com/photo-1595225476474-63038da0ca67?w=600' },
    { name: 'Portable Power Bank 20000mAh', brand: 'ChargeUp', price: 1499, img: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600' },
    { name: 'Smartwatch Series 5', brand: 'PulseFit', price: 5999, img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600' },
    { name: 'Noise Cancelling Earbuds', brand: 'SoundCore', price: 3999, img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600' },
    { name: 'Laptop Backpack 15.6-inch', brand: 'UrbanGear', price: 1299, img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600' },
    { name: 'Wireless Mouse', brand: 'KeyForge', price: 699, img: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600' }
  ],
  Fashion: [
    { name: "Men's Slim Fit Casual Shirt", brand: 'UrbanThreads', price: 899, img: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600' },
    { name: "Women's Floral Summer Dress", brand: 'BloomWear', price: 1599, img: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600' },
    { name: "Men's Denim Jacket", brand: 'UrbanThreads', price: 2199, img: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600' },
    { name: 'Unisex Graphic T-Shirt', brand: 'StreetLine', price: 499, img: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600' },
    { name: "Women's High-Waist Jeans", brand: 'BloomWear', price: 1799, img: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600' },
    { name: 'Leather Wallet', brand: 'CraftLeather', price: 799, img: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600' }
  ],
  'Home & Kitchen': [
    { name: 'Non-Stick Cookware Set (5pc)', brand: 'HomeChef', price: 2499, img: 'https://images.unsplash.com/photo-1584990347449-a2d4c1f5c2e1?w=600' },
    { name: 'Electric Kettle 1.5L', brand: 'HomeChef', price: 999, img: 'https://images.unsplash.com/photo-1594213505619-01a5f4d7f10c?w=600' },
    { name: 'Memory Foam Pillow Set', brand: 'CloudRest', price: 1299, img: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600' },
    { name: 'LED Table Lamp', brand: 'GlowHome', price: 899, img: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600' },
    { name: 'Ceramic Dinner Set (16pc)', brand: 'HomeChef', price: 1999, img: 'https://images.unsplash.com/photo-1603199506016-b9a594b593c0?w=600' }
  ],
  Footwear: [
    { name: "Men's Running Shoes", brand: 'SprintX', price: 2799, img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600' },
    { name: "Women's Casual Sneakers", brand: 'StepEasy', price: 1999, img: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600' },
    { name: "Men's Formal Leather Shoes", brand: 'ClassicStep', price: 3299, img: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600' },
    { name: 'Unisex Flip Flops', brand: 'StepEasy', price: 349, img: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600' }
  ],
  'Beauty & Personal Care': [
    { name: 'Vitamin C Face Serum', brand: 'GlowLab', price: 599, img: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600' },
    { name: 'Herbal Shampoo 400ml', brand: 'NatureCare', price: 349, img: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600' },
    { name: 'Electric Trimmer', brand: 'GroomPro', price: 1199, img: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=600' }
  ],
  'Sports & Fitness': [
    { name: 'Yoga Mat 6mm', brand: 'FlexFit', price: 699, img: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600' },
    { name: 'Adjustable Dumbbell Set', brand: 'IronCore', price: 3499, img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600' },
    { name: 'Resistance Bands Set', brand: 'FlexFit', price: 599, img: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=600' }
  ]
};

const seed = async () => {
  await connectDB();
  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    Cart.deleteMany({}),
    Review.deleteMany({})
  ]);

  console.log('Creating categories...');
  const categories = await Category.insertMany(
    categoryData.map((c) => ({ name: c.name, slug: slugify(c.name), image: c.image, description: `Shop the best ${c.name} products.` }))
  );
  const categoryMap = {};
  categories.forEach((c) => (categoryMap[c.name] = c._id));

  console.log('Creating products...');
  const products = [];
  Object.entries(productPool).forEach(([catName, items]) => {
    items.forEach((item, idx) => {
      products.push({
        name: item.name,
        description: `${item.name} by ${item.brand}. Premium quality, built to last, and designed for everyday use. Enjoy reliable performance and great value.`,
        category: categoryMap[catName],
        brand: item.brand,
        price: item.price,
        discount: [0, 10, 15, 20, 25][idx % 5],
        images: [item.img, item.img],
        stock: [0, 3, 8, 15, 25, 50][idx % 6],
        rating: 0,
        numReviews: 0,
        specifications: [
          { key: 'Brand', value: item.brand },
          { key: 'Warranty', value: '1 Year' }
        ],
        featured: idx % 3 === 0,
        active: true,
        soldCount: Math.floor(Math.random() * 100)
      });
    });
  });
  const createdProducts = await Product.insertMany(products);
  console.log(`Created ${createdProducts.length} products across ${categories.length} categories`);

  console.log('Creating users...');
  const admin = await User.create({
    name: 'ShopSphere Admin',
    email: 'admin@shopsphere.com',
    password: 'Admin@123',
    role: 'admin',
    phone: '9999999999'
  });

  const demoUser = await User.create({
    name: 'Demo Customer',
    email: 'user@shopsphere.com',
    password: 'User@123',
    role: 'customer',
    phone: '8888888888',
    addresses: [
      {
        label: 'Home',
        fullName: 'Demo Customer',
        phone: '8888888888',
        line1: '221B Baker Street',
        line2: 'Near City Mall',
        city: 'Gurgaon',
        state: 'Haryana',
        postalCode: '122001',
        country: 'India',
        isDefault: true
      }
    ]
  });

  console.log('Adding sample reviews...');
  const reviewableProducts = createdProducts.filter((p) => p.stock > 0).slice(0, 10);
  for (const product of reviewableProducts) {
    const review = await Review.create({
      product: product._id,
      user: demoUser._id,
      userName: demoUser.name,
      rating: Math.floor(Math.random() * 2) + 4,
      comment: 'Great quality product, exactly as described. Fast delivery and good packaging.'
    });
    product.rating = review.rating;
    product.numReviews = 1;
    await product.save();
  }

  console.log('\n✅ Seed complete!');
  console.log('----------------------------------------');
  console.log('Admin login: admin@shopsphere.com / Admin@123');
  console.log('Customer login: user@shopsphere.com / User@123');
  console.log(`Categories: ${categories.length}`);
  console.log(`Products: ${createdProducts.length}`);
  console.log('----------------------------------------');

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
