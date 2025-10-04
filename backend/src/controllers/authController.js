const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const currencyService = require('../services/currencyService');

exports.signup = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { email, password, firstName, lastName, companyName, country, currencyCode } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName || !companyName || !country || !currencyCode) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    await client.query('BEGIN');

    // Check if user already exists
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create company
    const companyResult = await client.query(
      `INSERT INTO companies (name, currency_code, country) 
       VALUES ($1, $2, $3) RETURNING id`,
      [companyName, currencyCode, country]
    );
    const companyId = companyResult.rows[0].id;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const userResult = await client.query(
      `INSERT INTO users (company_id, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, 'admin') RETURNING id, email, first_name, last_name, role, company_id`,
      [companyId, email, passwordHash, firstName, lastName]
    );

    const user = userResult.rows[0];

    // Create default expense categories for the company
    await client.query(
      `INSERT INTO expense_categories (company_id, name, description) VALUES
       ($1, 'Travel', 'Travel related expenses'),
       ($1, 'Food & Dining', 'Meals and dining expenses'),
       ($1, 'Office Supplies', 'Office supplies and equipment'),
       ($1, 'Transportation', 'Local transportation'),
       ($1, 'Accommodation', 'Hotel and lodging'),
       ($1, 'Entertainment', 'Client entertainment'),
       ($1, 'Other', 'Other expenses')`,
      [companyId]
    );

    await client.query('COMMIT');

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        companyId: user.company_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'Company and admin user created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        companyId: user.company_id
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  } finally {
    client.release();
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user
    const result = await db.query(
      `SELECT u.*, c.currency_code as company_currency, c.name as company_name
       FROM users u
       JOIN companies c ON u.company_id = c.id
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        companyId: user.company_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        companyId: user.company_id,
        companyCurrency: user.company_currency,
        companyName: user.company_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.getCountries = async (req, res) => {
  try {
    const countries = await currencyService.getCountries();
    res.json(countries);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
};
