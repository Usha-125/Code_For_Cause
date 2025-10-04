const express = require('express');
const router = express.Router();
const approvalRuleController = require('../controllers/approvalRuleController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', approvalRuleController.getApprovalRules);
router.post('/', approvalRuleController.createApprovalRule);
router.get('/:ruleId', approvalRuleController.getApprovalRuleById);
router.put('/:ruleId', approvalRuleController.updateApprovalRule);
router.delete('/:ruleId', approvalRuleController.deleteApprovalRule);

module.exports = router;
