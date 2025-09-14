import React, { createContext, useContext, useState, useEffect } from 'react';
import carbonDataService from '../services/carbonDataService';
import { useAuth } from './AuthContext';

const CarbonContext = createContext();

export const useCarbon = () => {
  const context = useContext(CarbonContext);
  if (!context) {
    // Return default values instead of throwing error to prevent blank screen
    return {
      dashboardData: null,
      loading: true,
      error: null,
      updateWalletBalance: () => {},
      purchaseCarbonOffset: async () => ({ success: false, error: 'Context not available' }),
      recordEnergyConsumption: async () => ({ success: false, error: 'Context not available' }),
      getEnergyConsumptionData: async () => ({ current: 2847, monthly: [2850, 3200, 2800, 3100, 2900, 2847], efficiency: [85, 88, 82, 90, 87, 92], buildings: { 'Building A': 35, 'Building B': 28, 'Building C': 22, 'Building D': 15 } }),
      refreshData: () => {}
    };
  }
  return context;
};

export const CarbonProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load dashboard data from API (institute-filtered)
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading dashboard data from API...');
      const data = await carbonDataService.getDashboardData();
      console.log('Dashboard data received:', data);
      
      if (data && data.instituteDisplayName) {
        console.log('✅ Successfully loaded dashboard data:', {
          instituteName: data.instituteDisplayName,
          dataSource: data.dataSource,
          hasRealData: data.dataSource === 'mongodb',
          departmentCount: data.departmentData?.length || 0,
          co2Savings: data.co2Savings
        });
        setDashboardData(data);
        
        if (data.dataSource === 'sample') {
          setError('Using sample data - no real MongoDB data found for your institute');
        }
      } else {
        console.warn('No institute data received');
        setError('Unable to load institute data - please ensure your institute has carbon data in the system');
        setDashboardData(null);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      if (err.message.includes('404') || err.message.includes('No carbon data found')) {
        setError('No carbon data found for your institute. Please contact administrator to set up data.');
      } else {
        setError(`Failed to load data: ${err.message}`);
      }
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  // Update wallet balance
  const updateWalletBalance = async (amount, type = 'credit') => {
    try {
      await carbonDataService.updateWalletBalance(amount, type);
      loadDashboardData();
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      setError(error.message);
    }
  };

  // Purchase carbon offset
  const purchaseCarbonOffset = async (amount, description = 'Carbon offset purchase') => {
    try {
      const result = await carbonDataService.purchaseCarbonOffset(amount, description);
      loadDashboardData();
      return { success: true, ...result };
    } catch (err) {
      console.error('Error purchasing carbon offset:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Record energy consumption
  const recordEnergyConsumption = async (consumption, building = 'Building A') => {
    try {
      const result = await carbonDataService.recordEnergyConsumption(consumption, building);
      loadDashboardData();
      return { success: true, ...result };
    } catch (err) {
      console.error('Error recording energy consumption:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Get energy consumption data for charts
  const getEnergyConsumptionData = async () => {
    try {
      return await carbonDataService.getEnergyConsumptionData();
    } catch (error) {
      console.error('Error getting energy consumption data:', error);
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
  };

  // Get weekly energy data for institutes
  const getWeeklyEnergyData = async () => {
    try {
      return await carbonDataService.getWeeklyEnergyData();
    } catch (error) {
      console.error('Error getting weekly energy data:', error);
      return carbonDataService.getFallbackWeeklyEnergyData();
    }
  };

  // Refresh data
  const refreshData = () => {
    loadDashboardData();
  };

  // Load dashboard data when component mounts or when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('Loading dashboard data for user:', user.email, 'institute:', user.institute);
      loadDashboardData();
    } else if (!isAuthenticated) {
      // Clear data when user logs out
      setDashboardData(null);
      setError(null);
      setLoading(false);
    }
  }, [user, isAuthenticated]); // Reload data whenever user changes

  const value = {
    dashboardData,
    loading,
    error,
    updateWalletBalance,
    purchaseCarbonOffset,
    recordEnergyConsumption,
    getEnergyConsumptionData,
    getWeeklyEnergyData,
    refreshData
  };

  return (
    <CarbonContext.Provider
      value={{
        dashboardData,
        loading,
        error,
        updateWalletBalance,
        purchaseCarbonOffset,
        recordEnergyConsumption,
        getEnergyConsumptionData,
        getWeeklyEnergyData,
        refreshData
      }}
    >
      {children}
    </CarbonContext.Provider>
  );
};
