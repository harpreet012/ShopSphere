const express = require('express');
const router = express.Router();
const {
  updateProfile,
  changePassword,
  getAllUsers,
  getUserById,
  updateUserRole,
  toggleUserStatus
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.use(protect);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);

router.get('/', adminOnly, getAllUsers);
router.get('/:id', adminOnly, validateObjectId('id'), getUserById);
router.put('/:id/role', adminOnly, validateObjectId('id'), updateUserRole);
router.put('/:id/toggle-status', adminOnly, validateObjectId('id'), toggleUserStatus);

module.exports = router;
