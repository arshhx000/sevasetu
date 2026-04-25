const Category = require('../models/Category');

exports.getCategories = async (_req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    return res.json({ categories });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load categories', error: error.message });
  }
};

exports.getAllCategories = async (_req, res) => {
  try {
    const categories = await Category.find({}).sort({ createdAt: -1 });
    return res.json({ categories });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load categories', error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const exists = await Category.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (exists) {
      return res.status(409).json({ message: 'Category already exists' });
    }

    const category = await Category.create({ name, description });
    return res.status(201).json({ category });
  } catch (error) {
    return res.status(500).json({ message: 'Could not create category', error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const name = req.body.name !== undefined ? String(req.body.name || '').trim() : category.name;
    const description = req.body.description !== undefined ? String(req.body.description || '').trim() : category.description;
    const isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : category.isActive;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const duplicate = await Category.findOne({
      _id: { $ne: category._id },
      name: new RegExp(`^${name}$`, 'i')
    });
    if (duplicate) {
      return res.status(409).json({ message: 'Another category already uses this name' });
    }

    category.name = name;
    category.description = description;
    category.isActive = isActive;
    await category.save();

    return res.json({ category });
  } catch (error) {
    return res.status(500).json({ message: 'Could not update category', error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    await category.deleteOne();
    return res.json({ message: 'Category deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Could not delete category', error: error.message });
  }
};
