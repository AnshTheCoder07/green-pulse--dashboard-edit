const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { instituteFilter } = require('../middleware/instituteAuth');
const {
  getDashboardData,
  updateWalletBalance,
  purchaseCarbonOffset,
  recordEnergyConsumption,
  getWeeklyEnergyData,
  getInstituteAnalytics
} = require('../controllers/carbonDataController');

// Apply authentication and institute filtering to all routes
router.use(authenticateToken);
router.use(instituteFilter);

// GET /api/carbon-data/dashboard - Get dashboard data for user's institute
router.get('/dashboard', getDashboardData);

// GET /api/carbon-data/weekly-energy - Get weekly energy data
router.get('/weekly-energy', getWeeklyEnergyData);

// PUT /api/carbon-data/wallet-balance - Update wallet balance
router.put('/wallet-balance', updateWalletBalance);

// POST /api/carbon-data/carbon-offset - Purchase carbon offset
router.post('/carbon-offset', purchaseCarbonOffset);

// POST /api/carbon-data/energy-consumption - Record energy consumption
router.post('/energy-consumption', recordEnergyConsumption);

// GET /api/carbon-data/institute-analytics - Get institute-wide analytics
router.get('/institute-analytics', getInstituteAnalytics);

module.exports = router;