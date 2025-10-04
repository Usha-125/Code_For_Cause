const bcrypt = require('bcryptjs');
const db = require('../database/db');

exports.createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, managerId } = req.body;
    const companyId = req.user.companyId;

    // Validation
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['employee', 'manager'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.query(
      `INSERT INTO users (company_id, email, password_hash, first_name, last_name, role, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, first_name, last_name, role, manager_id, created_at`,
      [companyId, email, passwordHash, firstName, lastName, role, managerId || null]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const result = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.manager_id, u.is_active, u.created_at,
              m.first_name as manager_first_name, m.last_name as manager_last_name
       FROM users u
       LEFT JOIN users m ON u.manager_id = m.id
       WHERE u.company_id = $1
       ORDER BY u.created_at DESC`,
      [companyId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, role, managerId, isActive } = req.body;
    const companyId = req.user.companyId;

    // Verify user belongs to same company
    const userCheck = await db.query(
      'SELECT id FROM users WHERE id = $1 AND company_id = $2',
      [userId, companyId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await db.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           role = COALESCE($3, role),
           manager_id = $4,
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, email, first_name, last_name, role, manager_id, is_active`,
      [firstName, lastName, role, managerId, isActive, userId]
    );

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const companyId = req.user.companyId;

    // Verify user belongs to same company
    const userCheck = await db.query(
      'SELECT id FROM users WHERE id = $1 AND company_id = $2',
      [userId, companyId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft delete by deactivating
    await db.query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

exports.getManagers = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const result = await db.query(
      `SELECT id, email, first_name, last_name
       FROM users
       WHERE company_id = $1 AND role IN ('manager', 'admin') AND is_active = true
       ORDER BY first_name, last_name`,
      [companyId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ error: 'Failed to fetch managers' });
  }
};
