const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticate);

router.get('/', expenseController.getExpenses);
router.post('/', upload.single('receipt'), expenseController.createExpense);
router.post('/ocr', upload.single('receipt'), expenseController.createExpenseFromOCR);
router.get('/pending-approvals', authorize('admin', 'manager'), expenseController.getPendingApprovals);
router.get('/:expenseId', expenseController.getExpenseById);
router.put('/:expenseId', expenseController.updateExpense);
router.delete('/:expenseId', expenseController.deleteExpense);
router.post('/:expenseId/approve', authorize('admin', 'manager'), expenseController.approveExpense);
router.post('/:expenseId/reject', authorize('admin', 'manager'), expenseController.rejectExpense);

module.exports = router;
