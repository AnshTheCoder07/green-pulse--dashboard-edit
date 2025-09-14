const mongoose = require('mongoose');

const carbonBiometricSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  // Carbon Metrics
  co2Emissions: {
    type: Number,
    required: true // in tonnes
  },
  co2Savings: {
    type: Number,
    default: 0 // in tonnes
  },
  carbonFootprint: {
    type: Number,
    required: true // in tonnes CO2 equivalent
  },
  carbonOffset: {
    type: Number,
    default: 0 // in tonnes CO2
  },
  // Energy Related Carbon Data
  energyConsumption: {
    type: Number,
    required: true // in kWh
  },
  renewableEnergyUsage: {
    type: Number,
    default: 0 // in kWh
  },
  gridEnergyUsage: {
    type: Number,
    required: true // in kWh
  },
  // Carbon Budget and Wallet
  carbonBudget: {
    allocated: { type: Number, default: 1000 },
    used: { type: Number, default: 0 },
    remaining: { type: Number, default: 1000 }
  },
  carbonWallet: {
    balance: { type: Number, default: 1000 },
    transactions: [{
      type: {
        type: String,
        enum: ['credit', 'debit', 'offset_purchase', 'energy_consumption'],
        required: true
      },
      amount: { type: Number, required: true },
      description: String,
      timestamp: { type: Date, default: Date.now },
      transactionId: String
    }]
  },
  // Efficiency Metrics
  energyEfficiency: {
    type: Number,
    default: 85, // percentage
    min: 0,
    max: 100
  },
  carbonEfficiency: {
    type: Number,
    default: 75, // percentage
    min: 0,
    max: 100
  },
  // Location and Context
  buildingName: String,
  departmentName: String,
  deviceId: String,
  sensorData: {
    temperature: Number,
    humidity: Number,
    airQuality: Number
  },
  // Metadata
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dataSource: {
    type: String,
    enum: ['sensor', 'manual', 'estimated', 'api'],
    default: 'sensor'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
carbonBiometricSchema.index({ institute: 1, timestamp: -1 });
carbonBiometricSchema.index({ buildingName: 1, departmentName: 1 });
carbonBiometricSchema.index({ timestamp: -1 });
carbonBiometricSchema.index({ userId: 1 });

// Static method to get latest data by institute
carbonBiometricSchema.statics.getLatestByInstitute = function(institute) {
  return this.findOne({ institute }).sort({ timestamp: -1 });
};

// Static method to get aggregated carbon data for dashboard
carbonBiometricSchema.statics.getDashboardData = function(institute) {
  return this.aggregate([
    { $match: { institute } },
    { $sort: { timestamp: -1 } },
    { $limit: 100 }, // Get recent data for calculations
    {
      $group: {
        _id: null,
        totalCO2Savings: { $sum: '$co2Savings' },
        avgCarbonBudgetUsed: { $avg: '$carbonBudget.used' },
        totalCarbonBudgetAllocated: { $avg: '$carbonBudget.allocated' },
        avgWalletBalance: { $avg: '$carbonWallet.balance' },
        totalOffsetsPurchased: { $sum: '$carbonOffset' },
        currentEnergyConsumption: { $first: '$energyConsumption' },
        avgEnergyEfficiency: { $avg: '$energyEfficiency' },
        avgCarbonEfficiency: { $avg: '$carbonEfficiency' },
        totalReductionInitiatives: { $sum: { $size: { $ifNull: ['$carbonWallet.transactions', []] } } },
        lastUpdated: { $max: '$timestamp' },
        dataPoints: { $sum: 1 }
      }
    },
    {
      $project: {
        co2Savings: { $round: ['$totalCO2Savings', 2] },
        carbonBudgetUsed: { $round: ['$avgCarbonBudgetUsed', 2] },
        carbonBudgetTotal: { $round: ['$totalCarbonBudgetAllocated', 2] },
        walletBalance: { $round: ['$avgWalletBalance', 2] },
        offsetsPurchased: { $round: ['$totalOffsetsPurchased', 2] },
        currentEnergyConsumption: 1,
        avgEnergyEfficiency: { $round: ['$avgEnergyEfficiency', 1] },
        avgCarbonEfficiency: { $round: ['$avgCarbonEfficiency', 1] },
        totalReductionInitiatives: 1,
        lastUpdated: 1,
        dataPoints: 1,
        _id: 0
      }
    }
  ]);
};

// Static method to get monthly trends
carbonBiometricSchema.statics.getMonthlyTrends = function(institute, months = 6) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return this.aggregate([
    {
      $match: {
        institute,
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' }
        },
        avgEnergyConsumption: { $avg: '$energyConsumption' },
        avgEfficiency: { $avg: '$energyEfficiency' },
        totalCO2Savings: { $sum: '$co2Savings' },
        avgCarbonBudgetUsed: { $avg: '$carbonBudget.used' },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        month: {
          $switch: {
            branches: [
              { case: { $eq: ['$_id.month', 1] }, then: 'Jan' },
              { case: { $eq: ['$_id.month', 2] }, then: 'Feb' },
              { case: { $eq: ['$_id.month', 3] }, then: 'Mar' },
              { case: { $eq: ['$_id.month', 4] }, then: 'Apr' },
              { case: { $eq: ['$_id.month', 5] }, then: 'May' },
              { case: { $eq: ['$_id.month', 6] }, then: 'Jun' },
              { case: { $eq: ['$_id.month', 7] }, then: 'Jul' },
              { case: { $eq: ['$_id.month', 8] }, then: 'Aug' },
              { case: { $eq: ['$_id.month', 9] }, then: 'Sep' },
              { case: { $eq: ['$_id.month', 10] }, then: 'Oct' },
              { case: { $eq: ['$_id.month', 11] }, then: 'Nov' },
              { case: { $eq: ['$_id.month', 12] }, then: 'Dec' }
            ]
          }
        },
        consumption: { $round: ['$avgEnergyConsumption', 0] },
        efficiency: { $round: ['$avgEfficiency', 1] },
        co2Savings: { $round: ['$totalCO2Savings', 2] },
        carbonBudgetUsed: { $round: ['$avgCarbonBudgetUsed', 2] },
        year: '$_id.year',
        monthNum: '$_id.month',
        _id: 0
      }
    },
    { $sort: { year: 1, monthNum: 1 } }
  ]);
};

// Static method to get department-wise carbon data
carbonBiometricSchema.statics.getDepartmentData = function(institute) {
  return this.aggregate([
    { $match: { institute, departmentName: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$departmentName',
        totalConsumption: { $sum: '$energyConsumption' },
        avgEfficiency: { $avg: '$energyEfficiency' },
        totalCarbonFootprint: { $sum: '$carbonFootprint' },
        totalCO2Savings: { $sum: '$co2Savings' },
        count: { $sum: 1 },
        lastUpdated: { $max: '$timestamp' }
      }
    },
    {
      $project: {
        departmentName: '$_id',
        consumption: { $round: ['$totalConsumption', 0] },
        efficiency: { $round: ['$avgEfficiency', 1] },
        carbonFootprint: { $round: ['$totalCarbonFootprint', 2] },
        co2Savings: { $round: ['$totalCO2Savings', 2] },
        color: {
          $switch: {
            branches: [
              { case: { $eq: ['$_id', 'Computer Science'] }, then: '#4FD1C7' },
              { case: { $eq: ['$_id', 'Engineering'] }, then: '#63B3ED' },
              { case: { $eq: ['$_id', 'Medical'] }, then: '#F687B3' },
              { case: { $eq: ['$_id', 'Business'] }, then: '#FEB2B2' },
              { case: { $eq: ['$_id', 'Arts'] }, then: '#9AE6B4' },
              { case: { $eq: ['$_id', 'Science'] }, then: '#A78BFA' }
            ],
            default: '#A0AEC0'
          }
        },
        lastUpdated: '$lastUpdated',
        _id: 0
      }
    },
    { $sort: { consumption: -1 } }
  ]);
};

// Static method to get building-wise carbon data
carbonBiometricSchema.statics.getBuildingData = function(institute) {
  return this.aggregate([
    { $match: { institute, buildingName: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$buildingName',
        totalConsumption: { $sum: '$energyConsumption' },
        avgEfficiency: { $avg: '$energyEfficiency' },
        totalCarbonFootprint: { $sum: '$carbonFootprint' },
        count: { $sum: 1 },
        lastUpdated: { $max: '$timestamp' }
      }
    },
    {
      $project: {
        buildingName: '$_id',
        consumption: { $round: ['$totalConsumption', 0] },
        efficiency: { $round: ['$avgEfficiency', 1] },
        carbonFootprint: { $round: ['$totalCarbonFootprint', 2] },
        lastUpdated: '$lastUpdated',
        _id: 0
      }
    },
    { $sort: { consumption: -1 } }
  ]);
};

module.exports = mongoose.model('CarbonBiometric', carbonBiometricSchema);