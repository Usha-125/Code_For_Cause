const db = require('../database/db');

class ApprovalService {
  async processExpenseApproval(expenseId) {
    try {
      // Get expense details
      const expenseResult = await db.query(
        `SELECT e.*, ar.rule_type, ar.percentage_threshold, ar.requires_manager_approval,
                u.manager_id, c.currency_code as company_currency
         FROM expenses e
         LEFT JOIN approval_rules ar ON e.approval_rule_id = ar.id
         LEFT JOIN users u ON e.employee_id = u.id
         LEFT JOIN companies c ON e.company_id = c.id
         WHERE e.id = $1`,
        [expenseId]
      );

      if (expenseResult.rows.length === 0) {
        throw new Error('Expense not found');
      }

      const expense = expenseResult.rows[0];

      // Get approval rule approvers
      const approversResult = await db.query(
        `SELECT ara.*, u.first_name, u.last_name, u.email
         FROM approval_rule_approvers ara
         JOIN users u ON ara.user_id = u.id
         WHERE ara.approval_rule_id = $1
         ORDER BY ara.sequence_order`,
        [expense.approval_rule_id]
      );

      const approvers = approversResult.rows;

      // Check if manager approval is required and add manager as first approver
      if (expense.requires_manager_approval && expense.manager_id) {
        const managerResult = await db.query(
          `SELECT id, first_name, last_name, email FROM users WHERE id = $1`,
          [expense.manager_id]
        );
        
        if (managerResult.rows.length > 0) {
          approvers.unshift({
            user_id: expense.manager_id,
            sequence_order: 0,
            is_auto_approve: false,
            ...managerResult.rows[0]
          });
        }
      }

      return {
        expense,
        approvers,
        nextApprover: approvers[expense.current_approval_step] || null
      };
    } catch (error) {
      console.error('Error processing approval:', error);
      throw error;
    }
  }

  async approveExpense(expenseId, approverId, comments) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get approval workflow info
      const workflowInfo = await this.processExpenseApproval(expenseId);
      const { expense, approvers } = workflowInfo;

      // Record approval
      await client.query(
        `INSERT INTO approval_history (expense_id, approver_id, action, comments, step_number)
         VALUES ($1, $2, 'approved', $3, $4)`,
        [expenseId, approverId, comments, expense.current_approval_step]
      );

      // Check if this approver has auto-approve privilege
      const currentApprover = approvers.find(
        (a, idx) => idx === expense.current_approval_step && a.user_id === approverId
      );

      if (currentApprover?.is_auto_approve) {
        // Auto-approve the entire expense
        await client.query(
          `UPDATE expenses SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [expenseId]
        );
        await client.query('COMMIT');
        return { status: 'approved', message: 'Expense auto-approved' };
      }

      // Check percentage rule
      if (expense.rule_type === 'percentage' || expense.rule_type === 'hybrid') {
        const approvalCount = await client.query(
          `SELECT COUNT(*) as count FROM approval_history 
           WHERE expense_id = $1 AND action = 'approved'`,
          [expenseId]
        );

        const approvedCount = parseInt(approvalCount.rows[0].count);
        const approvalPercentage = (approvedCount / approvers.length) * 100;

        if (approvalPercentage >= expense.percentage_threshold) {
          await client.query(
            `UPDATE expenses SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [expenseId]
          );
          await client.query('COMMIT');
          return { status: 'approved', message: 'Expense approved by percentage threshold' };
        }
      }

      // Move to next approver in sequence
      const nextStep = expense.current_approval_step + 1;
      
      if (nextStep >= approvers.length) {
        // All approvers have approved
        await client.query(
          `UPDATE expenses SET status = 'approved', current_approval_step = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [nextStep, expenseId]
        );
        await client.query('COMMIT');
        return { status: 'approved', message: 'Expense fully approved' };
      } else {
        // Move to next step
        await client.query(
          `UPDATE expenses SET current_approval_step = $1, status = 'in_review', updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [nextStep, expenseId]
        );
        await client.query('COMMIT');
        return { 
          status: 'in_review', 
          message: 'Approved, moved to next approver',
          nextApprover: approvers[nextStep]
        };
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async rejectExpense(expenseId, approverId, comments) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      const workflowInfo = await this.processExpenseApproval(expenseId);
      const { expense } = workflowInfo;

      // Record rejection
      await client.query(
        `INSERT INTO approval_history (expense_id, approver_id, action, comments, step_number)
         VALUES ($1, $2, 'rejected', $3, $4)`,
        [expenseId, approverId, comments, expense.current_approval_step]
      );

      // Update expense status to rejected
      await client.query(
        `UPDATE expenses SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [expenseId]
      );

      await client.query('COMMIT');
      return { status: 'rejected', message: 'Expense rejected' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getPendingApprovalsForUser(userId) {
    try {
      // Get expenses where user is the current approver
      const result = await db.query(
        `SELECT DISTINCT e.*, 
                u.first_name as employee_first_name, 
                u.last_name as employee_last_name,
                ec.name as category_name,
                c.currency_code as company_currency
         FROM expenses e
         JOIN users u ON e.employee_id = u.id
         LEFT JOIN expense_categories ec ON e.category_id = ec.id
         JOIN companies c ON e.company_id = c.id
         WHERE e.status IN ('pending', 'in_review')
         AND (
           -- User is manager and manager approval required
           (u.manager_id = $1 AND e.current_approval_step = 0)
           OR
           -- User is in the approval chain at current step
           EXISTS (
             SELECT 1 FROM approval_rule_approvers ara
             WHERE ara.approval_rule_id = e.approval_rule_id
             AND ara.user_id = $1
             AND ara.sequence_order = e.current_approval_step
           )
         )
         ORDER BY e.created_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      throw error;
    }
  }
}

module.exports = new ApprovalService();
