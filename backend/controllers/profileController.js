const User = require('../models/User');

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
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

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const {
      designation,
      department,
      branch,
      aboutMe,
      education,
      location,
      fullName
    } = req.body;

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields if provided
    if (designation) user.designation = designation;
    if (department) user.department = department;
    if (branch) user.branch = branch;
    if (aboutMe) user.aboutMe = aboutMe;
    if (education) user.education = education;
    if (location) user.location = location;
    if (fullName) user.fullName = fullName;

    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(user._id).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
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
  getProfile,
  updateProfile
};