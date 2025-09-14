const mongoose = require('mongoose');

const carbonDataSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.Mixed, // Can be string or object (for backward compatibility)
    required: true,
    index: true // Index for efficient institute-based queries
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Carbon tracking data
  co2Savings: {
    type: Number,
    default: 0
  },
  carbonBudgetUsed: {
    type: Number,
    default: 0
  },
  carbonBudgetTotal: {
    type: Number,
    default: 1000
  },
  walletBalance: {
    type: Number,
    default: 1000
  },
  offsetsPurchased: {
    type: Number,
    default: 0
  },
  // Energy consumption data
  currentEnergyConsumption: {
    type: Number,
    default: 0
  },
  monthlyEnergyConsumption: [{
    month: String,
    consumption: Number,
    efficiency: Number,
    date: { type: Date, default: Date.now }
  }],
  // Building-wise data
  buildingData: [{
    buildingName: String,
    consumption: Number,
    efficiency: Number,
    carbonFootprint: Number,
    lastUpdated: { type: Date, default: Date.now }
  }],
  // Department-wise data
  departmentData: [{
    departmentName: String,
    consumption: Number,
    efficiency: Number,
    carbonFootprint: Number,
    color: String, // For chart visualization
    lastUpdated: { type: Date, default: Date.now }
  }],
  // Transaction history
  transactions: [{
    type: {
      type: String,
      enum: ['credit', 'debit', 'offset_purchase', 'energy_consumption'],
      required: true
    },
    amount: Number,
    description: String,
    co2Impact: Number,
    building: String,
    consumption: Number,
    blockchainTxHash: String,
    date: { type: Date, default: Date.now }
  }],
  // Analytics data
  analytics: {
    totalReductionInitiatives: { type: Number, default: 0 },
    carbonValue: { type: Number, default: 0 },
    weeklyRevenueData: [{
      week: String,
      revenue: Number,
      date: { type: Date, default: Date.now }
    }],
    dailyTrafficData: [{
      day: String,
      traffic: Number,
      date: { type: Date, default: Date.now }
    }]
  }
}, {
  timestamps: true
});

// Index for efficient queries by institute and user
carbonDataSchema.index({ institute: 1, userId: 1 });

// Static method to get institute identifier for consistent querying
carbonDataSchema.statics.getInstituteIdentifier = function(institute) {
  if (!institute) return null;
  
  if (typeof institute === 'string') {
    return institute.toLowerCase();
  } else if (typeof institute === 'object' && institute.name) {
    return institute.name.toLowerCase();
  } else if (typeof institute === 'object' && institute.id) {
    return institute.id;
  }
  
  return String(institute).toLowerCase();
};

// Instance method to check if data belongs to specific institute
carbonDataSchema.methods.belongsToInstitute = function(targetInstitute) {
  const thisInstitute = this.constructor.getInstituteIdentifier(this.institute);
  const checkInstitute = this.constructor.getInstituteIdentifier(targetInstitute);
  return thisInstitute === checkInstitute;
};

module.exports = mongoose.model('CarbonData', carbonDataSchema);