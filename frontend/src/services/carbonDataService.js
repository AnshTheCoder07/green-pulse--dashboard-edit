// Carbon Data Service for GreenPulse Dashboard with Institute Filtering
// This service handles all carbon-related data including wallet, savings, and consumption
// Now supports institute-specific data isolation through backend API
import axios from 'axios';

class CarbonDataService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    this.carbonDataEndpoint = `${this.baseUrl}/carbon-data`;
  }

  // Helper method to get auth headers
  getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  // Get dashboard data from backend API (institute-filtered)
  async getDashboardData() {
    try {
      const response = await fetch(`${this.carbonDataEndpoint}/dashboard`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Don't return fallback data - let the error propagate
      throw error;
    }
  }

  // Update wallet balance through API
  async updateWalletBalance(amount, type = 'credit') {
    try {
      const response = await fetch(`${this.carbonDataEndpoint}/wallet-balance`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ amount, type })
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        return result;
      } else {
        throw new Error(result.message || 'Failed to update wallet balance');
      }
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      throw error;
    }
  }

  // Purchase carbon offset through API
  async purchaseCarbonOffset(amount, description = 'Carbon offset purchase') {
    try {
      const response = await fetch(`${this.carbonDataEndpoint}/carbon-offset`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ amount, description })
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        return result;
      } else {
        throw new Error(result.message || 'Failed to purchase carbon offset');
      }
    } catch (error) {
      console.error('Error purchasing carbon offset:', error);
      throw error;
    }
  }

  // Record energy consumption through API
  async recordEnergyConsumption(consumption, building = 'Building A') {
    try {
      const response = await fetch(`${this.carbonDataEndpoint}/energy-consumption`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ consumption, building })
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        return result;
      } else {
        throw new Error(result.message || 'Failed to record energy consumption');
      }
    } catch (error) {
      console.error('Error recording energy consumption:', error);
      throw error;
    }
  }

  // Get institute analytics through API
  async getInstituteAnalytics() {
    try {
      const response = await fetch(`${this.carbonDataEndpoint}/institute-analytics`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch institute analytics');
      }
    } catch (error) {
      console.error('Error fetching institute analytics:', error);
      return null;
    }
  }

  // Legacy compatibility methods - these will use the main dashboard data
  async getWalletBalance() {
    try {
      const dashboardData = await this.getDashboardData();
      return dashboardData.walletBalance || 1000;
    } catch (error) {
      return 1000; // fallback
    }
  }

  async getCO2Savings() {
    try {
      const dashboardData = await this.getDashboardData();
      return dashboardData.co2Savings || 350.4;
    } catch (error) {
      return 350.4; // fallback
    }
  }

  async getCarbonBudgetUsed() {
    try {
      const dashboardData = await this.getDashboardData();
      return dashboardData.carbonBudgetUsed || 642.39;
    } catch (error) {
      return 642.39; // fallback
    }
  }

  async getEnergyConsumption() {
    try {
      const dashboardData = await this.getDashboardData();
      return dashboardData.currentEnergyConsumption || 2847;
    } catch (error) {
      return 2847; // fallback
    }
  }

  // Get energy consumption data for charts
  async getEnergyConsumptionData() {
    try {
      const dashboardData = await this.getDashboardData();
      
      if (dashboardData && dashboardData.monthlyEnergyConsumption) {
        return {
          current: dashboardData.currentEnergyConsumption || 2847,
          monthly: dashboardData.monthlyEnergyConsumption.map(item => item.consumption),
          efficiency: dashboardData.monthlyEnergyConsumption.map(item => item.efficiency),
          buildings: dashboardData.buildingData ? 
            dashboardData.buildingData.reduce((acc, building) => {
              acc[building.buildingName] = building.consumption;
              return acc;
            }, {}) : {
              'Building A': 35,
              'Building B': 28, 
              'Building C': 22,
              'Building D': 15
            }
        };
      }
      
      // Fallback data
      return {
        current: 2847,
        monthly: [2850, 3200, 2800, 3100, 2900, 2847],
        efficiency: [85, 88, 82, 90, 87, 92],
        buildings: {
          'Building A': 35,
          'Building B': 28,
          'Building C': 22,
          'Building D': 15
        }
      };
    } catch (error) {
      console.error('Error getting energy consumption data:', error);
      // Return fallback data
      return {
        current: 2847,
        monthly: [2850, 3200, 2800, 3100, 2900, 2847],
        efficiency: [85, 88, 82, 90, 87, 92],
        buildings: {
          'Building A': 35,
          'Building B': 28,
          'Building C': 22,
          'Building D': 15
        }
      };
    }
  }

  // Get weekly energy consumption data for institutes
  async getWeeklyEnergyData() {
    try {
      const response = await axios.get(`${this.apiUrl}/carbon-data/weekly-energy`, {
        headers: this.getAuthHeaders()
      });
      
      if (response.data && response.data.success) {
        // Format the data to include institution name if available
        const weeklyData = response.data.data.weeklyEnergyData;
        const instituteName = response.data.data.institute || '';
        const dataSource = response.data.data.dataSource || 'sample';
        
        // Add institution name to each department if not already included
        return weeklyData.map(dept => ({
          name: dept.name.includes(' - ') ? dept.name : `${instituteName} - ${dept.name}`,
          data: dept.data,
          source: dataSource
        }));
      }
      
      // Return fallback data if API call succeeds but no data
      return this.getFallbackWeeklyEnergyData();
    } catch (error) {
      console.error('Error getting weekly energy data:', error);
      // Return fallback data
      return this.getFallbackWeeklyEnergyData();
    }
  }
  
  // Fallback weekly energy data
  getFallbackWeeklyEnergyData() {
    return [
      {
        name: "University A - Computer Science Dept",
        data: [180, 165, 195, 175, 185, 190, 170],
        source: 'sample'
      },
      {
        name: "University A - Engineering Dept", 
        data: [220, 200, 240, 210, 225, 235, 205],
        source: 'sample'
      },
      {
        name: "University B - Medical School",
        data: [200, 185, 215, 195, 205, 210, 190],
        source: 'sample'
      },
      {
        name: "University B - Science Lab Complex",
        data: [250, 230, 270, 245, 255, 265, 235],
        source: 'sample'
      },
      {
        name: "University C - Business School",
        data: [150, 140, 165, 155, 160, 165, 145],
        source: 'sample'
      }
    ];
  }

  // Add transaction through wallet update or specific actions
  async addTransaction(transaction) {
    try {
      if (transaction.type === 'credit' || transaction.type === 'debit') {
        return await this.updateWalletBalance(transaction.amount, transaction.type);
      } else if (transaction.type === 'offset_purchase') {
        return await this.purchaseCarbonOffset(transaction.amount, transaction.description);
      } else if (transaction.type === 'energy_consumption') {
        return await this.recordEnergyConsumption(transaction.consumption || transaction.amount, transaction.building);
      }
      
      throw new Error('Unknown transaction type');
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  }

  // Mock blockchain integration (maintained for compatibility)
  async submitToBlockchain(transaction) {
    try {
      // Mock blockchain submission
      console.log('Submitting to blockchain:', transaction);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock blockchain response
      const blockchainResponse = {
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        blockNumber: Math.floor(Math.random() * 1000000),
        gasUsed: Math.floor(Math.random() * 100000),
        status: 'success'
      };
      
      return {
        success: true,
        blockchainResponse,
        transaction
      };
    } catch (error) {
      console.error('Blockchain submission failed:', error);
      return {
        success: false,
        error: error.message,
        transaction
      };
    }
  }

  // Fallback data for offline/error scenarios
  getFallbackData() {
    return {
      instituteDisplayName: 'Default Institute',
      co2Savings: 350.4,
      carbonBudgetUsed: 642.39,
      walletBalance: 1000,
      offsetsPurchased: 574.34,
      currentEnergyConsumption: 2847,
      monthlyEnergyConsumption: [
        { month: 'Jan', consumption: 2850, efficiency: 85 },
        { month: 'Feb', consumption: 3200, efficiency: 88 },
        { month: 'Mar', consumption: 2800, efficiency: 82 },
        { month: 'Apr', consumption: 3100, efficiency: 90 },
        { month: 'May', consumption: 2900, efficiency: 87 },
        { month: 'Jun', consumption: 2847, efficiency: 92 }
      ],
      buildingData: [
        { buildingName: 'Building A', consumption: 35, efficiency: 92, carbonFootprint: 12.3 },
        { buildingName: 'Building B', consumption: 28, efficiency: 88, carbonFootprint: 9.8 },
        { buildingName: 'Building C', consumption: 22, efficiency: 85, carbonFootprint: 7.7 },
        { buildingName: 'Building D', consumption: 15, efficiency: 90, carbonFootprint: 5.3 }
      ],
      departmentData: [
        { departmentName: 'Computer Science', consumption: 450, efficiency: 92, carbonFootprint: 157.5, color: '#4FD1C7' },
        { departmentName: 'Electrical Engineering', consumption: 380, efficiency: 88, carbonFootprint: 133.0, color: '#63B3ED' },
        { departmentName: 'Mechanical Engineering', consumption: 320, efficiency: 85, carbonFootprint: 112.0, color: '#F687B3' },
        { departmentName: 'Civil Engineering', consumption: 290, efficiency: 87, carbonFootprint: 101.5, color: '#FEB2B2' },
        { departmentName: 'Chemical Engineering', consumption: 250, efficiency: 90, carbonFootprint: 87.5, color: '#9AE6B4' }
      ],
      transactions: [],
      analytics: {
        totalReductionInitiatives: 154,
        carbonValue: 2935
      }
    };
  }

  // Initialize service (now just returns instance)
  init() {
    return this;
  }
}

// Create singleton instance
const carbonDataService = new CarbonDataService().init();

export default carbonDataService;