const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Institute Schema (if you want to use Mongoose models)
const instituteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  campusId: { type: String, required: true },
  location: { type: String, required: true },
  address: { type: String, required: true },
  established: { type: String },
  totalBuildings: { type: Number, required: true },
  totalStudents: { type: Number, required: true },
  energyCapacity: { type: Number, default: 0 },
  carbonBudget: { type: Number, default: 0 },
  contact: {
    email: { type: String, required: true },
    phone: { type: String, required: true }
  }
}, { timestamps: true });

const Institute = mongoose.model('Institute', instituteSchema, 'institutes');

// GET /api/institutes - Get all institutes
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/institutes - Request received');
    
    // Check if collection exists and has documents
    const collections = await mongoose.connection.db.listCollections({ name: 'institutes' }).toArray();
    if (collections.length === 0) {
      console.log('Collection "institutes" does not exist');
      return res.status(404).json({
        success: false,
        message: 'Institutes collection not found in database'
      });
    }
    
    // Count documents in collection
    const count = await Institute.countDocuments({});
    console.log(`Found ${count} institutes in database`);
    
    // Fetch institutes
    const institutes = await Institute.find({}).select('-_id -__v');
    console.log('Institutes fetched successfully');
    
    res.json(institutes);
  } catch (error) {
    console.error('Error fetching institutes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch institutes',
      error: error.message
    });
  }
});

// GET /api/institutes/:id - Get single institute by ID
router.get('/:id', async (req, res) => {
  try {
    const institute = await Institute.findOne({ id: req.params.id }).select('-_id -__v');
    
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }
    
    res.json(institute);
  } catch (error) {
    console.error('Error fetching institute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch institute',
      error: error.message
    });
  }
});

// POST /api/institutes - Create new institute
router.post('/', async (req, res) => {
  try {
    const newInstituteData = {
      id: `inst_${Date.now()}`,
      ...req.body,
      established: req.body.established || new Date().getFullYear().toString()
    };
    
    const newInstitute = new Institute(newInstituteData);
    await newInstitute.save();
    
    // Return without MongoDB-specific fields
    const responseData = newInstitute.toObject();
    delete responseData._id;
    delete responseData.__v;
    
    res.status(201).json({
      success: true,
      message: 'Institute created successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error creating institute:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Institute with this ID already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create institute',
      error: error.message
    });
  }
});

// PUT /api/institutes/:id - Update institute
router.put('/:id', async (req, res) => {
  try {
    const updatedInstitute = await Institute.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    ).select('-_id -__v');
    
    if (!updatedInstitute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Institute updated successfully',
      data: updatedInstitute
    });
  } catch (error) {
    console.error('Error updating institute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update institute',
      error: error.message
    });
  }
});

// DELETE /api/institutes/:id - Delete institute
router.delete('/:id', async (req, res) => {
  try {
    const deletedInstitute = await Institute.findOneAndDelete({ id: req.params.id });
    
    if (!deletedInstitute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Institute deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting institute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete institute',
      error: error.message
    });
  }
});

// GET /api/institutes/campus/:campusId - Get institute by campus ID
router.get('/campus/:campusId', async (req, res) => {
  try {
    const institute = await Institute.findOne({ campusId: req.params.campusId }).select('-_id -__v');
    
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }
    
    res.json(institute);
  } catch (error) {
    console.error('Error fetching institute by campus ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch institute',
      error: error.message
    });
  }
});

module.exports = router;
