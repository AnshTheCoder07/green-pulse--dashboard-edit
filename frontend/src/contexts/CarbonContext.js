import React, { createContext, useContext, useState, useEffect } from 'react';
import carbonDataService from '../services/carbonDataService';

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
      getEnergyConsumptionData: () => ({ current: 2847, monthly: [2850, 3200, 2800, 3100, 2900, 2847], efficiency: [85, 88, 82, 90, 87, 92], buildings: { 'Building A': 35, 'Building B': 28, 'Building C': 22, 'Building D': 15 } }),
      refreshData: () => {}
    };
  }
  return context;
};

export const CarbonProvider = ({ children }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      const data = carbonDataService.getDashboardData();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update wallet balance
  const updateWalletBalance = (amount, type = 'credit') => {
    const transaction = {
      type,
      amount,
      description: type === 'credit' ? 'Wallet top-up' : 'Wallet deduction'
    };
    
    carbonDataService.addTransaction(transaction);
    loadDashboardData();
  };

  // Purchase carbon offset
  const purchaseCarbonOffset = async (amount, description = 'Carbon offset purchase') => {
    try {
      const transaction = {
        type: 'offset_purchase',
        amount,
        description,
        co2Impact: amount * 0.1 // Mock CO2 impact calculation
      };

      // Submit to blockchain
      const blockchainResult = await carbonDataService.submitToBlockchain(transaction);
      
      if (blockchainResult.success) {
        carbonDataService.addTransaction({
          ...transaction,
          blockchainTxHash: blockchainResult.blockchainResponse.txHash
        });
        
        // Update CO2 savings
        carbonDataService.updateCO2Savings(transaction.co2Impact);
        
        loadDashboardData();
        return { success: true, transaction, blockchainResult };
      } else {
        throw new Error('Blockchain submission failed');
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Record energy consumption
  const recordEnergyConsumption = async (consumption, building = 'Building A') => {
    try {
      const transaction = {
        type: 'energy_consumption',
        amount: consumption * 0.05, // Mock cost calculation (5 ENTO per kWh)
        description: `Energy consumption in ${building}`,
        building,
        consumption
      };

      // Submit to blockchain
      const blockchainResult = await carbonDataService.submitToBlockchain(transaction);
      
      if (blockchainResult.success) {
        carbonDataService.addTransaction({
          ...transaction,
          blockchainTxHash: blockchainResult.blockchainResponse.txHash
        });
        
        // Update energy consumption and carbon budget
        carbonDataService.updateEnergyConsumption(consumption);
        carbonDataService.updateCarbonBudgetUsed(transaction.amount);
        
        loadDashboardData();
        return { success: true, transaction, blockchainResult };
      } else {
        throw new Error('Blockchain submission failed');
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Get energy consumption data for charts
  const getEnergyConsumptionData = () => {
    return carbonDataService.getEnergyConsumptionData();
  };

  // Refresh data
  const refreshData = () => {
    loadDashboardData();
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const value = {
    dashboardData,
    loading,
    error,
    updateWalletBalance,
    purchaseCarbonOffset,
    recordEnergyConsumption,
    getEnergyConsumptionData,
    refreshData
  };

  return (
    <CarbonContext.Provider value={value}>
      {children}
    </CarbonContext.Provider>
  );
};
