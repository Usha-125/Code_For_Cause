const db = require('../database/db');

exports.getCategories = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const result = await db.query(
      `SELECT * FROM expense_categories 
       WHERE company_id = $1 AND is_active = true
       ORDER BY name`,
      [companyId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const companyId = req.user.companyId;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const result = await db.query(
      `INSERT INTO expense_categories (company_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [companyId, name, description]
    );

    res.status(201).json({
      message: 'Category created successfully',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, description, isActive } = req.body;
    const companyId = req.user.companyId;

    const result = await db.query(
      `UPDATE expense_categories
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           is_active = COALESCE($3, is_active)
       WHERE id = $4 AND company_id = $5
       RETURNING *`,
      [name, description, isActive, categoryId, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({
      message: 'Category updated successfully',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const companyId = req.user.companyId;

    const result = await db.query(
      'UPDATE expense_categories SET is_active = false WHERE id = $1 AND company_id = $2 RETURNING *',
      [categoryId, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};
