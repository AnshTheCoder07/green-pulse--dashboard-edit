const mongoose = require('mongoose');

const energyConsumptionSchema = new mongoose.Schema({
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
  buildingName: {
    type: String,
    required: true
  },
  departmentName: {
    type: String,
    required: true
  },
  consumption: {
    type: Number,
    required: true // in kWh
  },
  efficiency: {
    type: Number,
    default: 85 // percentage
  },
  carbonFootprint: {
    type: Number,
    required: true // CO2 equivalent
  },
  energySource: {
    type: String,
    enum: ['grid', 'solar', 'wind', 'hybrid'],
    default: 'grid'
  },
  cost: {
    type: Number,
    default: 0 // in currency units
  },
  // Metadata
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deviceId: {
    type: String
  },
  meterReading: {
    type: Number
  }
}, {
  timestamps: true
});

// Index for efficient queries
energyConsumptionSchema.index({ institute: 1, timestamp: -1 });
energyConsumptionSchema.index({ buildingName: 1, departmentName: 1 });
energyConsumptionSchema.index({ timestamp: -1 });

// Static method to get consumption by institute
energyConsumptionSchema.statics.getByInstitute = function(institute, startDate = null, endDate = null) {
  const query = { institute };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }
  
  return this.find(query).sort({ timestamp: -1 });
};

// Static method to get aggregated data by department for an institute
energyConsumptionSchema.statics.getDepartmentAggregation = function(institute) {
  return this.aggregate([
    { $match: { institute } },
    {
      $group: {
        _id: '$departmentName',
        totalConsumption: { $sum: '$consumption' },
        avgEfficiency: { $avg: '$efficiency' },
        totalCarbonFootprint: { $sum: '$carbonFootprint' },
        count: { $sum: 1 },
        lastUpdated: { $max: '$timestamp' }
      }
    },
    {
      $project: {
        departmentName: '$_id',
        consumption: '$totalConsumption',
        efficiency: { $round: ['$avgEfficiency', 1] },
        carbonFootprint: '$totalCarbonFootprint',
        color: {
          $switch: {
            branches: [
              { case: { $eq: ['$_id', 'Computer Science'] }, then: '#4FD1C7' },
              { case: { $eq: ['$_id', 'Engineering'] }, then: '#63B3ED' },
              { case: { $eq: ['$_id', 'Medical'] }, then: '#F687B3' },
              { case: { $eq: ['$_id', 'Business'] }, then: '#FEB2B2' },
              { case: { $eq: ['$_id', 'Arts'] }, then: '#9AE6B4' }
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

// Static method to get building aggregation
energyConsumptionSchema.statics.getBuildingAggregation = function(institute) {
  return this.aggregate([
    { $match: { institute } },
    {
      $group: {
        _id: '$buildingName',
        totalConsumption: { $sum: '$consumption' },
        avgEfficiency: { $avg: '$efficiency' },
        totalCarbonFootprint: { $sum: '$carbonFootprint' },
        count: { $sum: 1 },
        lastUpdated: { $max: '$timestamp' }
      }
    },
    {
      $project: {
        buildingName: '$_id',
        consumption: '$totalConsumption',
        efficiency: { $round: ['$avgEfficiency', 1] },
        carbonFootprint: '$totalCarbonFootprint',
        lastUpdated: '$lastUpdated',
        _id: 0
      }
    },
    { $sort: { consumption: -1 } }
  ]);
};

// Static method to get monthly data for charts
energyConsumptionSchema.statics.getMonthlyData = function(institute, months = 6) {
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
        totalConsumption: { $sum: '$consumption' },
        avgEfficiency: { $avg: '$efficiency' },
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
        consumption: '$totalConsumption',
        efficiency: { $round: ['$avgEfficiency', 1] },
        year: '$_id.year',
        monthNum: '$_id.month',
        _id: 0
      }
    },
    { $sort: { year: 1, monthNum: 1 } }
  ]);
};

module.exports = mongoose.model('EnergyConsumption', energyConsumptionSchema);