const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');

const register = async (req, res) => {
  try {
    const { institute, fullName, email, password } = req.body;
    
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    const user = new User({
      institute: typeof institute === 'string' ? institute.trim() : institute,
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password,
      position: 'Student' // Default position
    });
    
    await user.save();
    
    const token = generateToken(user._id);
    
    const userData = {
      id: user._id,
      institute: user.institute,
      fullName: user.fullName,
      email: user.email,
      position: user.position,
      department: user.department,
      branch: user.branch,
      bio: user.bio,
      education: user.education,
      location: user.location,
      createdAt: user.createdAt
    };
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userData,
        token
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, institute } = req.body;
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Sign-up to get started'
      });
    }
    
    const userInstitute = user.institute;
    let instituteMatches = false;
    
    if (typeof userInstitute === 'string' && typeof institute === 'string') {
      instituteMatches = userInstitute.toLowerCase() === institute.toLowerCase();
    } else if (typeof userInstitute === 'object' && typeof institute === 'object') {
      instituteMatches = userInstitute.id === institute.id;
    } else if (typeof userInstitute === 'object' && typeof institute === 'string') {
      instituteMatches = userInstitute.name.toLowerCase() === institute.toLowerCase();
    } else if (typeof userInstitute === 'string' && typeof institute === 'object') {
      instituteMatches = userInstitute.toLowerCase() === institute.name.toLowerCase();
    }
    
    if (!instituteMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid institute. Please select the institute you registered with.'
      });
    }
    
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }
    
    const token = generateToken(user._id);
    
    const userData = {
      id: user._id,
      institute: user.institute,
      fullName: user.fullName,
      email: user.email,
      position: user.position,
      department: user.department,
      branch: user.branch,
      bio: user.bio,
      education: user.education,
      location: user.location,
      createdAt: user.createdAt
    };
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        token
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      fullName,
      position,
      department,
      branch,
      bio,
      email,
      education,
      location
    } = req.body;

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (fullName) user.fullName = fullName;
    if (position) user.position = position;
    if (department) user.department = department;
    if (branch) user.branch = branch;
    if (bio) user.bio = bio;
    if (email) user.email = email;
    if (education) user.education = education;
    if (location) user.location = location;

    await user.save();

    const userData = {
      id: user._id,
      institute: user.institute,
      fullName: user.fullName,
      email: user.email,
      position: user.position,
      department: user.department,
      branch: user.branch,
      bio: user.bio,
      education: user.education,
      location: user.location,
      createdAt: user.createdAt
    };

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: userData
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};