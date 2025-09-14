// backend/config/auth.js
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: '7d',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
};