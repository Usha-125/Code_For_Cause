const db = require('../database/db');
const currencyService = require('../services/currencyService');
const ocrService = require('../services/ocrService');
const approvalService = require('../services/approvalService');
const path = require('path');

exports.createExpense = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { amount, currencyCode, categoryId, description, expenseDate, merchantName, notes, approvalRuleId } = req.body;
    const employeeId = req.user.userId;
    const companyId = req.user.companyId;

    // Validation
    if (!amount || !currencyCode || !description || !expenseDate) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    await client.query('BEGIN');

    // Get company currency
    const companyResult = await client.query(
      'SELECT currency_code FROM companies WHERE id = $1',
      [companyId]
    );
    const companyCurrency = companyResult.rows[0].currency_code;

    // Convert amount to company currency
    let convertedAmount = amount;
    if (currencyCode !== companyCurrency) {
      convertedAmount = await currencyService.convertAmount(amount, currencyCode, companyCurrency);
    }

    // Create expense
    const receiptPath = req.file ? req.file.path : null;
    
    const expenseResult = await client.query(
      `INSERT INTO expenses (company_id, employee_id, category_id, amount, currency_code, 
                            converted_amount, description, expense_date, receipt_path, 
                            merchant_name, notes, approval_rule_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
       RETURNING *`,
      [companyId, employeeId, categoryId, amount, currencyCode, convertedAmount, 
       description, expenseDate, receiptPath, merchantName, notes, approvalRuleId]
    );

    const expense = expenseResult.rows[0];

    // Create initial approval history entry
    await client.query(
      `INSERT INTO approval_history (expense_id, approver_id, action, step_number)
       VALUES ($1, $2, 'pending', 0)`,
      [expense.id, employeeId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Expense created successfully',
      expense
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  } finally {
    client.release();
  }
};

exports.createExpenseFromOCR = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Receipt image is required' });
    }

    const employeeId = req.user.userId;
    const companyId = req.user.companyId;

    // Extract data from receipt using OCR
    const receiptData = await ocrService.extractReceiptData(req.file.path);

    await client.query('BEGIN');

    // Get company currency
    const companyResult = await client.query(
      'SELECT currency_code FROM companies WHERE id = $1',
      [companyId]
    );
    const companyCurrency = companyResult.rows[0].currency_code;

    // Assume receipt currency is company currency (can be enhanced)
    const currencyCode = req.body.currencyCode || companyCurrency;
    
    let convertedAmount = receiptData.amount;
    if (currencyCode !== companyCurrency) {
      convertedAmount = await currencyService.convertAmount(receiptData.amount, currencyCode, companyCurrency);
    }

    // Create expense
    const expenseResult = await client.query(
      `INSERT INTO expenses (company_id, employee_id, amount, currency_code, 
                            converted_amount, description, expense_date, receipt_path, 
                            merchant_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING *`,
      [companyId, employeeId, receiptData.amount, currencyCode, convertedAmount,
       receiptData.description, receiptData.expenseDate, req.file.path, receiptData.merchantName]
    );

    const expense = expenseResult.rows[0];

    // Insert line items if extracted
    if (receiptData.lineItems && receiptData.lineItems.length > 0) {
      for (const item of receiptData.lineItems) {
        await client.query(
          `INSERT INTO expense_line_items (expense_id, description, amount, quantity)
           VALUES ($1, $2, $3, $4)`,
          [expense.id, item.description, item.amount, item.quantity]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Expense created from receipt successfully',
      expense,
      ocrData: receiptData
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('OCR expense creation error:', error);
    res.status(500).json({ error: 'Failed to process receipt' });
  } finally {
    client.release();
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    const companyId = req.user.companyId;
    const { status, startDate, endDate } = req.query;

    let query = `
      SELECT e.*, 
             u.first_name as employee_first_name, 
             u.last_name as employee_last_name,
             ec.name as category_name,
             c.currency_code as company_currency
      FROM expenses e
      JOIN users u ON e.employee_id = u.id
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      JOIN companies c ON e.company_id = c.id
      WHERE e.company_id = $1
    `;

    const params = [companyId];
    let paramIndex = 2;

    // Role-based filtering
    if (role === 'employee') {
      query += ` AND e.employee_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    // Status filter
    if (status) {
      query += ` AND e.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Date range filter
    if (startDate) {
      query += ` AND e.expense_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND e.expense_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ' ORDER BY e.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

exports.getExpenseById = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const companyId = req.user.companyId;

    const result = await db.query(
      `SELECT e.*, 
              u.first_name as employee_first_name, 
              u.last_name as employee_last_name,
              u.email as employee_email,
              ec.name as category_name,
              c.currency_code as company_currency
       FROM expenses e
       JOIN users u ON e.employee_id = u.id
       LEFT JOIN expense_categories ec ON e.category_id = ec.id
       JOIN companies c ON e.company_id = c.id
       WHERE e.id = $1 AND e.company_id = $2`,
      [expenseId, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Get line items
    const lineItemsResult = await db.query(
      'SELECT * FROM expense_line_items WHERE expense_id = $1',
      [expenseId]
    );

    // Get approval history
    const historyResult = await db.query(
      `SELECT ah.*, u.first_name, u.last_name, u.email
       FROM approval_history ah
       JOIN users u ON ah.approver_id = u.id
       WHERE ah.expense_id = $1
       ORDER BY ah.created_at ASC`,
      [expenseId]
    );

    res.json({
      ...result.rows[0],
      lineItems: lineItemsResult.rows,
      approvalHistory: historyResult.rows
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { amount, currencyCode, categoryId, description, expenseDate, merchantName, notes } = req.body;
    const userId = req.user.userId;
    const companyId = req.user.companyId;

    // Check if expense belongs to user and is still pending
    const expenseCheck = await db.query(
      'SELECT * FROM expenses WHERE id = $1 AND employee_id = $2 AND company_id = $3 AND status = $4',
      [expenseId, userId, companyId, 'pending']
    );

    if (expenseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found or cannot be modified' });
    }

    // Get company currency and convert if needed
    const companyResult = await db.query(
      'SELECT currency_code FROM companies WHERE id = $1',
      [companyId]
    );
    const companyCurrency = companyResult.rows[0].currency_code;

    let convertedAmount = amount;
    if (currencyCode && amount && currencyCode !== companyCurrency) {
      convertedAmount = await currencyService.convertAmount(amount, currencyCode, companyCurrency);
    }

    const result = await db.query(
      `UPDATE expenses 
       SET amount = COALESCE($1, amount),
           currency_code = COALESCE($2, currency_code),
           converted_amount = COALESCE($3, converted_amount),
           category_id = COALESCE($4, category_id),
           description = COALESCE($5, description),
           expense_date = COALESCE($6, expense_date),
           merchant_name = COALESCE($7, merchant_name),
           notes = COALESCE($8, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [amount, currencyCode, convertedAmount, categoryId, description, expenseDate, merchantName, notes, expenseId]
    );

    res.json({
      message: 'Expense updated successfully',
      expense: result.rows[0]
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.user.userId;
    const companyId = req.user.companyId;

    // Check if expense belongs to user and is still pending
    const expenseCheck = await db.query(
      'SELECT * FROM expenses WHERE id = $1 AND employee_id = $2 AND company_id = $3 AND status = $4',
      [expenseId, userId, companyId, 'pending']
    );

    if (expenseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found or cannot be deleted' });
    }

    await db.query('DELETE FROM expenses WHERE id = $1', [expenseId]);

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};

exports.getPendingApprovals = async (req, res) => {
  try {
    const userId = req.user.userId;
    const expenses = await approvalService.getPendingApprovalsForUser(userId);
    res.json(expenses);
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
};

exports.approveExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { comments } = req.body;
    const approverId = req.user.userId;

    const result = await approvalService.approveExpense(expenseId, approverId, comments);
    res.json(result);
  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({ error: 'Failed to approve expense' });
  }
};

exports.rejectExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { comments } = req.body;
    const approverId = req.user.userId;

    if (!comments) {
      return res.status(400).json({ error: 'Comments are required for rejection' });
    }

    const result = await approvalService.rejectExpense(expenseId, approverId, comments);
    res.json(result);
  } catch (error) {
    console.error('Reject expense error:', error);
    res.status(500).json({ error: 'Failed to reject expense' });
  }
};
