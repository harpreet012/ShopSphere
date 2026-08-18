const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const getAddresses = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { addresses: req.user.addresses } });
});

const addAddress = asyncHandler(async (req, res) => {
  const { label, fullName, phone, line1, line2, city, state, postalCode, country, isDefault } = req.body;
  if (!fullName || !phone || !line1 || !city || !state || !postalCode || !country) {
    throw new ApiError(400, 'Missing required address fields');
  }
  const user = await User.findById(req.user._id);
  if (isDefault || user.addresses.length === 0) {
    user.addresses.forEach((a) => (a.isDefault = false));
  }
  user.addresses.push({
    label,
    fullName,
    phone,
    line1,
    line2,
    city,
    state,
    postalCode,
    country,
    isDefault: isDefault || user.addresses.length === 0
  });
  await user.save();
  res.status(201).json({ success: true, message: 'Address added', data: { addresses: user.addresses } });
});

const updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw new ApiError(404, 'Address not found');

  const fields = ['label', 'fullName', 'phone', 'line1', 'line2', 'city', 'state', 'postalCode', 'country'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) address[f] = req.body[f];
  });
  if (req.body.isDefault) {
    user.addresses.forEach((a) => (a.isDefault = false));
    address.isDefault = true;
  }
  await user.save();
  res.json({ success: true, message: 'Address updated', data: { addresses: user.addresses } });
});

const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw new ApiError(404, 'Address not found');
  const wasDefault = address.isDefault;
  address.deleteOne();
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }
  await user.save();
  res.json({ success: true, message: 'Address deleted', data: { addresses: user.addresses } });
});

const setDefaultAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw new ApiError(404, 'Address not found');
  user.addresses.forEach((a) => (a.isDefault = false));
  address.isDefault = true;
  await user.save();
  res.json({ success: true, message: 'Default address updated', data: { addresses: user.addresses } });
});

module.exports = { getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress };
