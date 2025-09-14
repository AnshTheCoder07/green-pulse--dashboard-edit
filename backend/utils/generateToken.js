// backend/utils/generateToken.js
const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpire } = require('../config/auth');

const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    jwtSecret, 
    { expiresIn: jwtExpire }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, jwtSecret);
};

module.exports = {
  generateToken,
  verifyToken
};