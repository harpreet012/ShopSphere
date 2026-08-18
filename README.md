# ShopSphere

A full-stack e-commerce application built with the MERN stack (MongoDB, Express, React, Node.js).

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [SMTP / Email Setup](#smtp--email-setup)
- [Product Import](#product-import)
- [API Reference](#api-reference)
- [Running Tests](#running-tests)

---

## Features

- **Authentication** — password login, email OTP login, forgot password via OTP
- **Products** — listing, search, filters, admin CRUD, soft delete, reactivation
- **Categories** — admin-managed, slugged
- **Cart** — per-user cart with stock validation
- **Wishlist** — move to cart with stock check
- **Checkout** — address selection, COD / CARD / UPI payment simulation
- **Orders** — enforced status transitions, customer cancellation, admin management
- **Reviews** — purchase-verified reviews, edit/delete own review
- **Email notifications** — OTP, password reset, order confirmation, shipped, delivered, cancelled
- **Admin dashboard** — overview stats, revenue chart, category sales, top products

---

## Tech Stack

| Layer    | Technology                           |
|----------|--------------------------------------|
| Frontend | React 18, Vite, Tailwind CSS         |
| Backend  | Node.js, Express 4                   |
| Database | MongoDB + Mongoose 8                 |
| Auth     | JWT (30-day), bcryptjs               |
| Email    | Nodemailer (Gmail SMTP)              |
| Testing  | Jest 29, Supertest                   |

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Gmail account with App Password for email features

### Install & Run

```bash
# Clone and install
git clone <repo-url>
cd ShopSphere

# Backend
cd server
cp .env.example .env        # fill in your values
npm install
npm run dev                 # starts on :5000

# Frontend (new terminal)
cd client
npm install
npm run dev                 # starts on :5173

# Seed demo data (optional)
cd server
npm run seed

# Import products from DummyJSON (optional)
npm run import:products
```

---

## Environment Variables

Copy `server/.env.example` to `server/.env` and fill in each value.

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/shopsphere

# JWT
JWT_SECRET=replace_with_a_long_random_secret

# Frontend URL (CORS)
CLIENT_URL=http://localhost:5173

# SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM="ShopSphere <your-gmail@gmail.com>"

# OTP settings
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
```

---

## SMTP / Email Setup

ShopSphere uses **Gmail SMTP via Nodemailer** for all outgoing email.

### How to get a Gmail App Password

1. Enable **2-Step Verification** on your Google account.
2. Go to **[Google App Passwords](https://myaccount.google.com/apppasswords)**.
3. Choose **Mail** → **Other (custom name)** → name it "ShopSphere".
4. Copy the generated 16-character password.
5. Paste it as `SMTP_PASS` in your `.env` file.

> ⚠️ Never use your regular Gmail password — App Passwords are separate and can be revoked individually.

### Emails sent automatically

| Trigger             | Recipient |
|---------------------|-----------|
| OTP login request   | User      |
| Forgot password OTP | User      |
| Order placed        | Customer  |
| Order shipped       | Customer  |
| Order delivered     | Customer  |
| Order cancelled     | Customer  |

---

## Product Import

Import all products from [DummyJSON](https://dummyjson.com/products) into your local MongoDB.

```bash
cd server
npm run import:products
```

### What it does

- Fetches all available products from `https://dummyjson.com/products?limit=0`
- Converts prices from USD to INR (×83)
- Maps categories (auto-creates if they don't exist)
- Upserts by `name + brand` — **safe to run repeatedly**
- **Never touches** users, carts, orders, reviews, or wishlist data

### Field mapping

| DummyJSON field       | ShopSphere field  |
|-----------------------|-------------------|
| `title`               | `name`            |
| `description`         | `description`     |
| `category`            | `category` (slug) |
| `brand`               | `brand`           |
| `price × 83`          | `price` (INR)     |
| `discountPercentage`  | `discount`        |
| `images`              | `images`          |
| `stock`               | `stock`           |
| `rating`              | `rating`          |
| `availabilityStatus`  | `active`          |

---

## API Reference

### Auth

| Method | Endpoint                             | Auth     | Description                      |
|--------|--------------------------------------|----------|----------------------------------|
| POST   | `/api/auth/register`                 | Public   | Register new user                |
| POST   | `/api/auth/login`                    | Public   | Login with email + password      |
| GET    | `/api/auth/me`                       | Customer | Get current user                 |
| POST   | `/api/auth/send-otp`                 | Public   | Send 6-digit login OTP to email  |
| POST   | `/api/auth/verify-otp`               | Public   | Verify OTP → receive JWT         |
| POST   | `/api/auth/forgot-password/send-otp` | Public   | Send password reset OTP          |
| POST   | `/api/auth/forgot-password/verify`   | Public   | Verify OTP + set new password    |

#### OTP rules
- **6 digits**, hashed with bcrypt before storage
- **Expires** in 10 minutes (configurable via `OTP_EXPIRY_MINUTES`)
- **Max 5 attempts** before OTP is invalidated
- **60-second resend cooldown** (configurable via `OTP_RESEND_COOLDOWN_SECONDS`)
- OTP record is **deleted** after successful verification

### Products

| Method | Endpoint                  | Auth     | Description                               |
|--------|---------------------------|----------|-------------------------------------------|
| GET    | `/api/products`           | Public   | List active products (search/filter/sort) |
| GET    | `/api/products/:id`       | Public   | Get single product + related              |
| GET    | `/api/products/admin/all` | Admin    | List all products including inactive      |
| POST   | `/api/products`           | Admin    | Create product                            |
| PUT    | `/api/products/:id`       | Admin    | Update product (whitelisted fields only)  |
| DELETE | `/api/products/:id`       | Admin    | Soft delete (sets `active: false`)        |

#### Soft Delete
Products are **never permanently deleted**. `DELETE /api/products/:id` sets `active: false`.  
Admins can reactivate via `PUT /api/products/:id` with `{ "active": true }`.  
Historical orders remain valid because product refs are preserved.

### Orders

| Method | Endpoint                   | Auth     | Description                 |
|--------|----------------------------|----------|-----------------------------|
| POST   | `/api/orders`              | Customer | Create order from cart      |
| GET    | `/api/orders/my-orders`    | Customer | Get own orders              |
| GET    | `/api/orders/:id`          | Owner/Admin | Get single order         |
| GET    | `/api/orders/admin/all`    | Admin    | Get all orders              |
| PUT    | `/api/orders/:id/status`   | Admin    | Update order status         |
| PUT    | `/api/orders/:id/cancel`   | Customer | Cancel own order            |

#### Valid Status Transitions

```
Pending → Confirmed → Processing → Shipped → Out for Delivery → Delivered
   ↓           ↓           ↓
Cancelled  Cancelled   Cancelled
```

Invalid transitions (e.g. `Delivered → Pending`, `Cancelled → Delivered`) are rejected with HTTP 400.

### Reviews

| Method | Endpoint                              | Auth     | Description                       |
|--------|---------------------------------------|----------|-----------------------------------|
| GET    | `/api/products/:id/reviews`           | Public   | Get reviews for a product         |
| POST   | `/api/products/:id/reviews`           | Customer | Submit review (purchase required) |
| PUT    | `/api/products/:id/reviews/:reviewId` | Owner    | Edit own review                   |
| DELETE | `/api/products/:id/reviews/:reviewId` | Owner/Admin | Delete review                 |

> Customers can only review products they have **purchased and received** (order status = Delivered).

---

## Running Tests

```bash
cd server
npm test
```

38 unit tests covering:

- OTP generation, hashing, comparison
- OTP expiry and resend cooldown logic
- JWT generation and payload
- All valid and invalid order status transitions
- Product field validation (name, price, discount, stock, images)
- Cart stock validation (single add and cumulative)
- asyncHandler error propagation
- ApiError structure

---

## Demo Accounts (after seeding)

| Role     | Email                    | Password   |
|----------|--------------------------|------------|
| Admin    | admin@shopsphere.com     | Admin@123  |
| Customer | user@shopsphere.com      | User@123   |
