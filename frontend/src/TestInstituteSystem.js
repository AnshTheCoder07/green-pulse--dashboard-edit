// Simple test component to verify institute-specific system works
import React, { useEffect, useState } from 'react';
import { Box, Text, Heading, VStack, Alert, AlertIcon } from '@chakra-ui/react';
import { useCarbon } from 'contexts/CarbonContext';
import { useAuth } from 'contexts/AuthContext';

const TestInstituteSystem = () => {
  const { dashboardData, loading, error, getEnergyConsumptionData } = useCarbon();
  const { user, isAuthenticated } = useAuth();
  const [energyData, setEnergyData] = useState(null);
  const [energyError, setEnergyError] = useState(null);

  useEffect(() => {
    const testEnergyData = async () => {
      try {
        console.log('Testing getEnergyConsumptionData...');
        const data = await getEnergyConsumptionData();
        console.log('Energy data received:', data);
        setEnergyData(data);
      } catch (err) {
        console.error('Energy data error:', err);
        setEnergyError(err.message);
      }
    };

    if (!loading) {
      testEnergyData();
    }
  }, [loading, getEnergyConsumptionData]);

  return (
    <Box p="20px" maxW="800px" mx="auto">
      <Heading size="lg" mb="20px">
        🧪 Institute System Test
      </Heading>
      
      <VStack spacing="15px" align="stretch">
        <Box>
          <Text fontWeight="bold">Authentication Status:</Text>
          <Text color={isAuthenticated ? 'green.500' : 'red.500'}>
            {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
          </Text>
        </Box>

        {user && (
          <Box>
            <Text fontWeight="bold">User Info:</Text>
            <Text>Name: {user.fullName}</Text>
            <Text>Email: {user.email}</Text>
            <Text>Institute: {JSON.stringify(user.institute)}</Text>
          </Box>
        )}

        <Box>
          <Text fontWeight="bold">Dashboard Data Status:</Text>
          <Text color={loading ? 'yellow.500' : error ? 'red.500' : 'green.500'}>
            {loading ? '⏳ Loading...' : error ? `❌ Error: ${error}` : '✅ Loaded'}
          </Text>
        </Box>

        {dashboardData && (
          <Box>
            <Text fontWeight="bold">Institute Display Name:</Text>
            <Text fontSize="xl" color="blue.600">
              {dashboardData.instituteDisplayName || 'Not Available'}
            </Text>
          </Box>
        )}

        <Box>
          <Text fontWeight="bold">Energy Data Test:</Text>
          {energyError ? (
            <Alert status="error">
              <AlertIcon />
              Energy Data Error: {energyError}
            </Alert>
          ) : energyData ? (
            <VStack align="start" spacing="2px">
              <Text color="green.500">✅ Energy data loaded successfully</Text>
              <Text fontSize="sm">Current: {energyData.current} kWh</Text>
              <Text fontSize="sm">Monthly data points: {energyData.monthly?.length || 0}</Text>
              <Text fontSize="sm">Efficiency data points: {energyData.efficiency?.length || 0}</Text>
              <Text fontSize="sm">Buildings: {Object.keys(energyData.buildings || {}).length}</Text>
            </VStack>
          ) : (
            <Text color="yellow.500">⏳ Loading energy data...</Text>
          )}
        </Box>

        {dashboardData && (
          <Box>
            <Text fontWeight="bold">Dashboard Data Sample:</Text>
            <Box fontSize="sm" p="10px" bg="gray.100" borderRadius="5px">
              <Text>CO₂ Savings: {dashboardData.co2Savings}</Text>
              <Text>Carbon Budget Used: {dashboardData.carbonBudgetUsed}</Text>
              <Text>Wallet Balance: {dashboardData.walletBalance}</Text>
              <Text>Department Data: {dashboardData.departmentData?.length || 0} departments</Text>
            </Box>
          </Box>
        )}

        <Alert status="info">
          <AlertIcon />
          <Text fontSize="sm">
            This test component verifies that the institute-specific dashboard system is working correctly. 
            All data should be filtered by the user's institute.
          </Text>
        </Alert>
      </VStack>
    </Box>
  );
};

export default TestInstituteSystem;