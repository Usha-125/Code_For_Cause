const db = require('../database/db');

exports.createApprovalRule = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { name, ruleType, percentageThreshold, requiresManagerApproval, approvers } = req.body;
    const companyId = req.user.companyId;

    // Validation
    if (!name || !ruleType) {
      return res.status(400).json({ error: 'Name and rule type are required' });
    }

    if (!['percentage', 'specific', 'hybrid'].includes(ruleType)) {
      return res.status(400).json({ error: 'Invalid rule type' });
    }

    if ((ruleType === 'percentage' || ruleType === 'hybrid') && !percentageThreshold) {
      return res.status(400).json({ error: 'Percentage threshold is required for this rule type' });
    }

    await client.query('BEGIN');

    // Create approval rule
    const ruleResult = await client.query(
      `INSERT INTO approval_rules (company_id, name, rule_type, percentage_threshold, requires_manager_approval)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [companyId, name, ruleType, percentageThreshold, requiresManagerApproval !== false]
    );

    const rule = ruleResult.rows[0];

    // Add approvers if provided
    if (approvers && Array.isArray(approvers) && approvers.length > 0) {
      for (const approver of approvers) {
        await client.query(
          `INSERT INTO approval_rule_approvers (approval_rule_id, user_id, sequence_order, is_auto_approve)
           VALUES ($1, $2, $3, $4)`,
          [rule.id, approver.userId, approver.sequenceOrder, approver.isAutoApprove || false]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Approval rule created successfully',
      rule
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create approval rule error:', error);
    res.status(500).json({ error: 'Failed to create approval rule' });
  } finally {
    client.release();
  }
};

exports.getApprovalRules = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const result = await db.query(
      `SELECT ar.*, 
              json_agg(
                json_build_object(
                  'id', ara.id,
                  'userId', ara.user_id,
                  'sequenceOrder', ara.sequence_order,
                  'isAutoApprove', ara.is_auto_approve,
                  'firstName', u.first_name,
                  'lastName', u.last_name,
                  'email', u.email
                ) ORDER BY ara.sequence_order
              ) FILTER (WHERE ara.id IS NOT NULL) as approvers
       FROM approval_rules ar
       LEFT JOIN approval_rule_approvers ara ON ar.id = ara.approval_rule_id
       LEFT JOIN users u ON ara.user_id = u.id
       WHERE ar.company_id = $1 AND ar.is_active = true
       GROUP BY ar.id
       ORDER BY ar.created_at DESC`,
      [companyId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get approval rules error:', error);
    res.status(500).json({ error: 'Failed to fetch approval rules' });
  }
};

exports.getApprovalRuleById = async (req, res) => {
  try {
    const { ruleId } = req.params;
    const companyId = req.user.companyId;

    const result = await db.query(
      `SELECT ar.*, 
              json_agg(
                json_build_object(
                  'id', ara.id,
                  'userId', ara.user_id,
                  'sequenceOrder', ara.sequence_order,
                  'isAutoApprove', ara.is_auto_approve,
                  'firstName', u.first_name,
                  'lastName', u.last_name,
                  'email', u.email
                ) ORDER BY ara.sequence_order
              ) FILTER (WHERE ara.id IS NOT NULL) as approvers
       FROM approval_rules ar
       LEFT JOIN approval_rule_approvers ara ON ar.id = ara.approval_rule_id
       LEFT JOIN users u ON ara.user_id = u.id
       WHERE ar.id = $1 AND ar.company_id = $2
       GROUP BY ar.id`,
      [ruleId, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Approval rule not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get approval rule error:', error);
    res.status(500).json({ error: 'Failed to fetch approval rule' });
  }
};

exports.updateApprovalRule = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { ruleId } = req.params;
    const { name, ruleType, percentageThreshold, requiresManagerApproval, approvers, isActive } = req.body;
    const companyId = req.user.companyId;

    await client.query('BEGIN');

    // Update rule
    const result = await client.query(
      `UPDATE approval_rules
       SET name = COALESCE($1, name),
           rule_type = COALESCE($2, rule_type),
           percentage_threshold = COALESCE($3, percentage_threshold),
           requires_manager_approval = COALESCE($4, requires_manager_approval),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND company_id = $7
       RETURNING *`,
      [name, ruleType, percentageThreshold, requiresManagerApproval, isActive, ruleId, companyId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Approval rule not found' });
    }

    // Update approvers if provided
    if (approvers && Array.isArray(approvers)) {
      // Delete existing approvers
      await client.query(
        'DELETE FROM approval_rule_approvers WHERE approval_rule_id = $1',
        [ruleId]
      );

      // Add new approvers
      for (const approver of approvers) {
        await client.query(
          `INSERT INTO approval_rule_approvers (approval_rule_id, user_id, sequence_order, is_auto_approve)
           VALUES ($1, $2, $3, $4)`,
          [ruleId, approver.userId, approver.sequenceOrder, approver.isAutoApprove || false]
        );
      }
    }

    await client.query('COMMIT');

    res.json({
      message: 'Approval rule updated successfully',
      rule: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update approval rule error:', error);
    res.status(500).json({ error: 'Failed to update approval rule' });
  } finally {
    client.release();
  }
};

exports.deleteApprovalRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    const companyId = req.user.companyId;

    // Soft delete by deactivating
    const result = await db.query(
      'UPDATE approval_rules SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2 RETURNING *',
      [ruleId, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Approval rule not found' });
    }

    res.json({ message: 'Approval rule deleted successfully' });
  } catch (error) {
    console.error('Delete approval rule error:', error);
    res.status(500).json({ error: 'Failed to delete approval rule' });
  }
};
