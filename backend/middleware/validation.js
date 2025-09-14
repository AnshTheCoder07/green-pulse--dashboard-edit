// backend/middleware/validation.js
const validateRegistration = (req, res, next) => {
  const { institute, fullName, email, password, confirmPassword } = req.body;
  
  console.log('Registration validation - received data:', { institute, fullName, email, password: '***', confirmPassword: '***' });
  
  const errors = [];
  
  // Check required fields with proper type checking
  if (!institute) {
    errors.push('Institute is required');
  } else if (typeof institute === 'object' && (!institute.name || !institute.id)) {
    errors.push('Invalid institute data');
  } else if (typeof institute === 'string' && institute.trim() === '') {
    errors.push('Institute is required');
  }
  
  if (!fullName || typeof fullName !== 'string' || fullName.trim() === '') {
    errors.push('Full name is required');
  }
  
  if (!email || typeof email !== 'string' || email.trim() === '') {
    errors.push('Email is required');
  }
  
  if (!password) {
    errors.push('Password is required');
  }
  
  if (!confirmPassword) {
    errors.push('Confirm password is required');
  }
  
  // Email validation
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (email && typeof email === 'string' && !emailRegex.test(email)) {
    errors.push('Please enter a valid email address');
  }
  
  // Password validation
  if (password && password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  // Password matching
  if (password && confirmPassword && password !== confirmPassword) {
    errors.push('Passwords do not match');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password, institute } = req.body;
  
  console.log('Login validation - received data:', { email, password: '***', institute: institute ? 'provided' : 'missing' });
  
  const errors = [];
  
  // Check institute
  if (!institute) {
    errors.push('Institute is required');
  } else if (typeof institute === 'object' && (!institute.name || !institute.id)) {
    errors.push('Invalid institute data');
  } else if (typeof institute === 'string' && institute.trim() === '') {
    errors.push('Institute is required');
  }
  
  if (!email || typeof email !== 'string' || email.trim() === '') {
    errors.push('Email is required');
  }
  
  if (!password) {
    errors.push('Password is required');
  }
  
  // Email validation
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (email && typeof email === 'string' && !emailRegex.test(email)) {
    errors.push('Please enter a valid email address');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  next();
};

module.exports = {
  validateRegistration,
  validateLogin
};