const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', categoryController.getCategories);
router.post('/', authorize('admin'), categoryController.createCategory);
router.put('/:categoryId', authorize('admin'), categoryController.updateCategory);
router.delete('/:categoryId', authorize('admin'), categoryController.deleteCategory);

module.exports = router;
