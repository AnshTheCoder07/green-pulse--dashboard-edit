const CarbonData = require('../models/CarbonData');
const CarbonBiometric = require('../models/CarbonBiometric');
const EnergyConsumption = require('../models/EnergyConsumption');
const User = require('../models/User');
const { createInstituteFilter, getInstituteDisplayName } = require('../middleware/instituteAuth');

/**
 * Get dashboard data for a specific user's institute from real MongoDB data
 */
const getDashboardData = async (req, res) => {
  try {
    const userId = req.user._id;
    const userInstitute = req.userInstitute;
    
    console.log('Getting dashboard data for user:', userId, 'institute:', userInstitute);
    
    if (!userInstitute) {
      return res.status(400).json({
        success: false,
        message: 'User institute not found'
      });
    }

    // Get institute display name (handle both string and object formats)
    const instituteDisplayName = getInstituteDisplayName(userInstitute);
    console.log('Institute display name:', instituteDisplayName);
    
    // Convert institute to string for database queries
    const instituteNameForQuery = typeof userInstitute === 'object' && userInstitute.name 
      ? userInstitute.name 
      : String(userInstitute);
    
    console.log('Institute name for query:', instituteNameForQuery);

    // Get real carbon biometric data from MongoDB using string name
    const carbonBiometricData = await CarbonBiometric.getDashboardData(instituteNameForQuery);
    console.log('Carbon biometric data:', carbonBiometricData);

    // Get monthly trends from real data
    const monthlyTrends = await CarbonBiometric.getMonthlyTrends(instituteNameForQuery, 6);
    console.log('Monthly trends:', monthlyTrends);

    // Get department data from real energy consumption data
    const departmentData = await CarbonBiometric.getDepartmentData(instituteNameForQuery);
    console.log('Department data:', departmentData);

    // Get building data from real energy consumption data
    const buildingData = await CarbonBiometric.getBuildingData(instituteNameForQuery);
    console.log('Building data:', buildingData);

    // Only return data if real MongoDB data exists
    if (!carbonBiometricData || carbonBiometricData.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No carbon data found for institute: ${instituteDisplayName}. Please contact administrator to set up data for your institute.`
      });
    }

    // Use only real data from MongoDB
    const biometric = carbonBiometricData[0];
    
    // Ensure we have real monthly trends data
    const realMonthlyTrends = monthlyTrends && monthlyTrends.length > 0 ? monthlyTrends : [];
    
    // Ensure we have real building data
    const realBuildingData = buildingData && buildingData.length > 0 ? buildingData : [];
    
    // Ensure we have real department data
    const realDepartmentData = departmentData && departmentData.length > 0 ? departmentData : [];
    
    const dashboardData = {
      instituteDisplayName,
      co2Savings: biometric.co2Savings || 0,
      carbonBudgetUsed: biometric.carbonBudgetUsed || 0,
      carbonBudgetTotal: biometric.carbonBudgetTotal || 1000,
      walletBalance: biometric.walletBalance || 1000,
      offsetsPurchased: biometric.offsetsPurchased || 0,
      currentEnergyConsumption: biometric.currentEnergyConsumption || 0,
      
      // Only real monthly energy consumption data
      monthlyEnergyConsumption: realMonthlyTrends,
      
      // Only real building data
      buildingData: realBuildingData,
      
      // Only real department data
      departmentData: realDepartmentData,
      
      analytics: {
        totalReductionInitiatives: biometric.totalReductionInitiatives || 0,
        carbonValue: Math.round(biometric.co2Savings * 100) || 0 // Calculate from real CO2 savings
      },
      
      dataSource: 'mongodb',
      lastUpdated: biometric.lastUpdated || new Date(),
      dataPoints: biometric.dataPoints || 0
    };

    console.log('Final dashboard data:', dashboardData);

    res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
};

/**
 * Update wallet balance for institute-specific user data
 */
const updateWalletBalance = async (req, res) => {
  try {
    const { amount, type } = req.body;
    const userId = req.user._id;
    const userInstitute = req.userInstitute;

    if (!amount || !type) {
      return res.status(400).json({
        success: false,
        message: 'Amount and type are required'
      });
    }

    const carbonData = await CarbonData.findOne({
      userId,
      ...createInstituteFilter(userInstitute)
    });

    if (!carbonData) {
      return res.status(404).json({
        success: false,
        message: 'Carbon data not found for user'
      });
    }

    // Update wallet balance
    if (type === 'credit') {
      carbonData.walletBalance += amount;
    } else {
      carbonData.walletBalance = Math.max(0, carbonData.walletBalance - amount);
    }

    // Add transaction record
    carbonData.transactions.push({
      type,
      amount,
      description: type === 'credit' ? 'Wallet top-up' : 'Wallet deduction',
      date: new Date()
    });

    await carbonData.save();

    res.status(200).json({
      success: true,
      message: 'Wallet balance updated successfully',
      data: {
        newBalance: carbonData.walletBalance
      }
    });

  } catch (error) {
    console.error('Update wallet balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating wallet balance'
    });
  }
};

/**
 * Purchase carbon offset
 */
const purchaseCarbonOffset = async (req, res) => {
  try {
    const { amount, description } = req.body;
    const userId = req.user._id;
    const userInstitute = req.userInstitute;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    const carbonData = await CarbonData.findOne({
      userId,
      ...createInstituteFilter(userInstitute)
    });

    if (!carbonData) {
      return res.status(404).json({
        success: false,
        message: 'Carbon data not found for user'
      });
    }

    // Check if user has sufficient balance
    if (carbonData.walletBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }

    // Calculate CO2 impact
    const co2Impact = amount * 0.1; // Mock calculation

    // Update data
    carbonData.walletBalance -= amount;
    carbonData.offsetsPurchased += amount;
    carbonData.co2Savings += co2Impact;

    // Add transaction record
    carbonData.transactions.push({
      type: 'offset_purchase',
      amount,
      description: description || 'Carbon offset purchase',
      co2Impact,
      blockchainTxHash: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock hash
      date: new Date()
    });

    await carbonData.save();

    res.status(200).json({
      success: true,
      message: 'Carbon offset purchased successfully',
      data: {
        transaction: carbonData.transactions[carbonData.transactions.length - 1],
        newBalance: carbonData.walletBalance,
        co2Savings: carbonData.co2Savings
      }
    });

  } catch (error) {
    console.error('Purchase carbon offset error:', error);
    res.status(500).json({
      success: false,
      message: 'Error purchasing carbon offset'
    });
  }
};

/**
 * Record energy consumption
 */
const recordEnergyConsumption = async (req, res) => {
  try {
    const { consumption, building } = req.body;
    const userId = req.user._id;
    const userInstitute = req.userInstitute;

    if (!consumption) {
      return res.status(400).json({
        success: false,
        message: 'Consumption amount is required'
      });
    }

    const carbonData = await CarbonData.findOne({
      userId,
      ...createInstituteFilter(userInstitute)
    });

    if (!carbonData) {
      return res.status(404).json({
        success: false,
        message: 'Carbon data not found for user'
      });
    }

    // Calculate cost (mock: 0.05 ENTO per kWh)
    const cost = consumption * 0.05;

    // Update energy consumption
    carbonData.currentEnergyConsumption += consumption;
    carbonData.carbonBudgetUsed += cost;

    // Update building data if specified
    if (building) {
      const buildingIndex = carbonData.buildingData.findIndex(b => b.buildingName === building);
      if (buildingIndex >= 0) {
        carbonData.buildingData[buildingIndex].consumption += consumption;
        carbonData.buildingData[buildingIndex].lastUpdated = new Date();
      }
    }

    // Add transaction record
    carbonData.transactions.push({
      type: 'energy_consumption',
      amount: cost,
      description: `Energy consumption in ${building || 'Building A'}`,
      building: building || 'Building A',
      consumption,
      blockchainTxHash: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock hash
      date: new Date()
    });

    await carbonData.save();

    res.status(200).json({
      success: true,
      message: 'Energy consumption recorded successfully',
      data: {
        transaction: carbonData.transactions[carbonData.transactions.length - 1],
        currentConsumption: carbonData.currentEnergyConsumption,
        carbonBudgetUsed: carbonData.carbonBudgetUsed
      }
    });

  } catch (error) {
    console.error('Record energy consumption error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording energy consumption'
    });
  }
};

/**
 * Get weekly energy consumption data for charts
 */
const getWeeklyEnergyData = async (req, res) => {
  try {
    const userInstitute = req.userInstitute;
    
    // Convert institute to string for database queries
    const instituteNameForQuery = typeof userInstitute === 'object' && userInstitute.name 
      ? userInstitute.name 
      : String(userInstitute);
    
    console.log('Getting weekly energy data for institute:', instituteNameForQuery);
    
    const instituteDisplayName = getInstituteDisplayName(userInstitute);
    
    // Get data from the last 7 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    // Get daily energy consumption from the last week
    const weeklyData = await CarbonBiometric.aggregate([
      {
        $match: {
          institute: instituteNameForQuery,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$timestamp' },
            department: '$departmentName'
          },
          totalConsumption: { $sum: '$energyConsumption' },
          avgEfficiency: { $avg: '$energyEfficiency' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.department',
          weeklyData: {
            $push: {
              dayOfWeek: '$_id.dayOfWeek',
              consumption: '$totalConsumption'
            }
          },
          totalWeeklyConsumption: { $sum: '$totalConsumption' }
        }
      },
      {
        $project: {
          departmentName: '$_id',
          data: {
            $map: {
              input: [1, 2, 3, 4, 5, 6, 7], // Sunday=1, Monday=2, etc.
              as: 'day',
              in: {
                $let: {
                  vars: {
                    dayData: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$weeklyData',
                            cond: { $eq: ['$$this.dayOfWeek', '$$day'] }
                          }
                        }, 0
                      ]
                    }
                  },
                  in: {
                    $ifNull: ['$$dayData.consumption', 0]
                  }
                }
              }
            }
          },
          totalWeeklyConsumption: 1,
          _id: 0
        }
      },
      { $sort: { totalWeeklyConsumption: -1 } },
      { $limit: 5 } // Top 5 departments
    ]);
    
    console.log('Weekly energy data results:', weeklyData);
    
    // Only use real data - no fallback
    if (weeklyData.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No weekly energy data found for institute: ${instituteDisplayName}`
      });
    }
    
    // Format real data for the chart
    const formattedData = weeklyData.map(dept => ({
      name: dept.departmentName || 'Unknown Department',
      data: dept.data || [0, 0, 0, 0, 0, 0, 0]
    }));
    
    res.status(200).json({
      success: true,
      data: {
        weeklyEnergyData: formattedData,
        dataSource: weeklyData.length > 0 ? 'mongodb' : 'sample',
        institute: getInstituteDisplayName(userInstitute),
        dateRange: {
          start: startDate.toISOString(),
          end: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    console.error('Get weekly energy data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching weekly energy data',
      error: error.message
    });
  }
};

/**
 * Get institute-specific analytics
 */
const getInstituteAnalytics = async (req, res) => {
  try {
    const userInstitute = req.userInstitute;
    
    // Convert institute to string for database queries
    const instituteNameForQuery = typeof userInstitute === 'object' && userInstitute.name 
      ? userInstitute.name 
      : String(userInstitute);
    
    // Get aggregated data for the institute
    const instituteData = await CarbonData.aggregate([
      { $match: createInstituteFilter(userInstitute) },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalCO2Savings: { $sum: '$co2Savings' },
          totalCarbonBudgetUsed: { $sum: '$carbonBudgetUsed' },
          totalWalletBalance: { $sum: '$walletBalance' },
          totalOffsetsPurchased: { $sum: '$offsetsPurchased' },
          avgEnergyConsumption: { $avg: '$currentEnergyConsumption' }
        }
      }
    ]);

    const analytics = instituteData.length > 0 ? instituteData[0] : {
      totalUsers: 0,
      totalCO2Savings: 0,
      totalCarbonBudgetUsed: 0,
      totalWalletBalance: 0,
      totalOffsetsPurchased: 0,
      avgEnergyConsumption: 0
    };

    res.status(200).json({
      success: true,
      data: {
        instituteName: getInstituteDisplayName(userInstitute),
        ...analytics
      }
    });

  } catch (error) {
    console.error('Get institute analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching institute analytics'
    });
  }
};

module.exports = {
  getDashboardData,
  updateWalletBalance,
  purchaseCarbonOffset,
  recordEnergyConsumption,
  getWeeklyEnergyData,
  getInstituteAnalytics
};
