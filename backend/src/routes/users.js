const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', authorize('admin', 'manager'), userController.getUsers);
router.post('/', authorize('admin'), userController.createUser);
router.get('/managers', userController.getManagers);
router.put('/:userId', authorize('admin'), userController.updateUser);
router.delete('/:userId', authorize('admin'), userController.deleteUser);

module.exports = router;
