const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true' || false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const from = process.env.SMTP_FROM || process.env.SMTP_USER;

/**
 * Send OTP via email
 */
const sendOTPEmail = async (email, otp, type = 'login') => {
  const subject = type === 'login' ? 'ShopSphere Login OTP' : 'ShopSphere Password Reset OTP';
  const typeLabel = type === 'login' ? 'login' : 'password reset';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">ShopSphere ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}</h2>
      <p style="font-size: 16px; color: #555;">Your one-time password (OTP) for ${typeLabel} is:</p>
      <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <h1 style="color: #007bff; letter-spacing: 5px; margin: 0;">${otp}</h1>
      </div>
      <p style="font-size: 14px; color: #888;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
      <p style="font-size: 12px; color: #aaa;">If you didn't request this, please ignore this email.</p>
    </div>
  `;

  return transporter.sendMail({
    from,
    to: email,
    subject,
    html
  });
};

/**
 * Send order confirmation email
 */
const sendOrderConfirmationEmail = async (email, order, userName) => {
  const itemsHTML = order.items
    .map((item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">x${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `)
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Order Confirmation</h2>
      <p style="font-size: 16px; color: #555;">Hi ${userName},</p>
      <p>Thank you for your order! Here are the details:</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        <p><strong>Status:</strong> ${order.orderStatus}</p>
      </div>

      <h3 style="color: #333; margin-top: 20px;">Order Items</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f0f0f0;">
            <th style="padding: 10px; text-align: left;">Product</th>
            <th style="padding: 10px; text-align: center;">Quantity</th>
            <th style="padding: 10px; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>${itemsHTML}</tbody>
      </table>

      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: right;">
        <p><strong>Subtotal:</strong> ₹${order.subtotal.toFixed(2)}</p>
        <p><strong>Discount:</strong> -₹${order.discount.toFixed(2)}</p>
        <p><strong>Shipping:</strong> ₹${order.shippingFee.toFixed(2)}</p>
        <p style="font-size: 18px; color: #007bff;"><strong>Total: ₹${order.totalAmount.toFixed(2)}</strong></p>
      </div>

      <p style="font-size: 14px; color: #888;">We'll notify you when your order ships!</p>
    </div>
  `;

  return transporter.sendMail({
    from,
    to: email,
    subject: `Order Confirmation - ${order.orderNumber}`,
    html
  });
};

/**
 * Send order shipped email
 */
const sendOrderShippedEmail = async (email, order, userName) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Order Shipped</h2>
      <p style="font-size: 16px; color: #555;">Hi ${userName},</p>
      <p>Great news! Your order has been shipped.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Status:</strong> ${order.orderStatus}</p>
        <p><strong>Shipped Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <p style="font-size: 14px; color: #555;">You can track your order status in your ShopSphere account.</p>
    </div>
  `;

  return transporter.sendMail({
    from,
    to: email,
    subject: `Order Shipped - ${order.orderNumber}`,
    html
  });
};

/**
 * Send order delivered email
 */
const sendOrderDeliveredEmail = async (email, order, userName) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Order Delivered</h2>
      <p style="font-size: 16px; color: #555;">Hi ${userName},</p>
      <p>Your order has been delivered! We hope you love your purchase.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Delivered Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <p style="font-size: 14px; color: #555;">Please review your products and share your feedback!</p>
    </div>
  `;

  return transporter.sendMail({
    from,
    to: email,
    subject: `Order Delivered - ${order.orderNumber}`,
    html
  });
};

/**
 * Send order cancellation email
 */
const sendOrderCancellationEmail = async (email, order, userName) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Order Cancelled</h2>
      <p style="font-size: 16px; color: #555;">Hi ${userName},</p>
      <p>Your order has been cancelled.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Status:</strong> Cancelled</p>
        <p><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <p style="font-size: 14px; color: #555;">If you have any questions, please contact our support team.</p>
    </div>
  `;

  return transporter.sendMail({
    from,
    to: email,
    subject: `Order Cancelled - ${order.orderNumber}`,
    html
  });
};

/**
 * Send generic email (fallback)
 */
const sendEmail = async (to, subject, html) => {
  return transporter.sendMail({
    from,
    to,
    subject,
    html
  });
};

module.exports = {
  sendOTPEmail,
  sendOrderConfirmationEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCancellationEmail,
  sendEmail
};
