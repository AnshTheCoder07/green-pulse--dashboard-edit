import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  Button,
  Flex
} from '@chakra-ui/react';
import { 
  MdWarning, 
  MdError, 
  MdInfo, 
  MdCheckCircle,
  MdNotifications,
  MdExpandMore,
  MdExpandLess
} from 'react-icons/md';
import { useCarbon } from 'contexts/CarbonContext';

const AlertSystem = () => {
  const [alerts, setAlerts] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [thresholds] = useState({
    energyConsumption: 3000, // kWh
    co2Savings: 200, // tonnes
    carbonBudget: 800, // ENTO
    efficiency: 70 // percentage
  });

  const { getEnergyConsumptionData, dashboardData } = useCarbon();

  // Alert types and their configurations
  const alertTypes = {
    energy_spike: {
      icon: MdWarning,
      color: 'orange',
      title: 'Energy Consumption Alert'
    },
    co2_threshold: {
      icon: MdError,
      color: 'red',
      title: 'CO₂ Savings Alert'
    },
    budget_exceeded: {
      icon: MdError,
      color: 'red',
      title: 'Carbon Budget Alert'
    },
    efficiency_low: {
      icon: MdWarning,
      color: 'yellow',
      title: 'Efficiency Alert'
    },
    system_info: {
      icon: MdInfo,
      color: 'blue',
      title: 'System Information'
    },
    success: {
      icon: MdCheckCircle,
      color: 'green',
      title: 'Success'
    }
  };

  // Check for threshold violations and generate alerts
  useEffect(() => {
    if (!dashboardData) return;

    const newAlerts = [];
    const energyData = getEnergyConsumptionData();
    const currentTime = new Date().toISOString();

    // Check energy consumption threshold
    if (energyData.current > thresholds.energyConsumption) {
      newAlerts.push({
        id: `energy_${Date.now()}`,
        type: 'energy_spike',
        message: `Energy consumption (${energyData.current.toLocaleString()} kWh) exceeds threshold (${thresholds.energyConsumption.toLocaleString()} kWh)`,
        timestamp: currentTime,
        severity: 'high',
        building: 'Multiple Buildings'
      });
    }

    // Check CO₂ savings threshold
    if (dashboardData.co2Savings < thresholds.co2Savings) {
      newAlerts.push({
        id: `co2_${Date.now()}`,
        type: 'co2_threshold',
        message: `CO₂ savings (${dashboardData.co2Savings.toFixed(1)} tonnes) below target (${thresholds.co2Savings} tonnes)`,
        timestamp: currentTime,
        severity: 'high'
      });
    }

    // Check carbon budget threshold
    if (dashboardData.carbonBudgetUsed > thresholds.carbonBudget) {
      newAlerts.push({
        id: `budget_${Date.now()}`,
        type: 'budget_exceeded',
        message: `Carbon budget usage (${dashboardData.carbonBudgetUsed.toFixed(2)} ENTO) exceeds limit (${thresholds.carbonBudget} ENTO)`,
        timestamp: currentTime,
        severity: 'critical'
      });
    }

    // Check efficiency threshold
    const currentEfficiency = energyData.efficiency[energyData.efficiency.length - 1];
    if (currentEfficiency < thresholds.efficiency) {
      newAlerts.push({
        id: `efficiency_${Date.now()}`,
        type: 'efficiency_low',
        message: `Energy efficiency (${currentEfficiency}%) below target (${thresholds.efficiency}%)`,
        timestamp: currentTime,
        severity: 'medium',
        building: 'System Wide'
      });
    }

    // Add success alerts for good performance
    if (currentEfficiency >= 90) {
      newAlerts.push({
        id: `success_${Date.now()}`,
        type: 'success',
        message: `Excellent energy efficiency achieved: ${currentEfficiency}%`,
        timestamp: currentTime,
        severity: 'low'
      });
    }

    // Update alerts state
    setAlerts(prevAlerts => {
      const existingIds = new Set(prevAlerts.map(alert => alert.id));
      const uniqueNewAlerts = newAlerts.filter(alert => !existingIds.has(alert.id));
      return [...uniqueNewAlerts, ...prevAlerts].slice(0, 10); // Keep only last 10 alerts
    });
  }, [dashboardData, thresholds, getEnergyConsumptionData]);

  const dismissAlert = (alertId) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId));
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const visibleAlerts = isExpanded ? alerts : alerts.slice(0, 3);

  return (
    <Box w="100%" maxW="600px">
      <Flex align="center" justify="space-between" mb={4}>
        <HStack>
          <Icon as={MdNotifications} w={5} h={5} />
          <Text fontSize="lg" fontWeight="bold">
            System Alerts
          </Text>
          {alerts.length > 0 && (
            <Badge colorScheme={getSeverityColor(alerts[0]?.severity)}>
              {alerts.length}
            </Badge>
          )}
        </HStack>
        {alerts.length > 3 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            rightIcon={isExpanded ? <MdExpandLess /> : <MdExpandMore />}
          >
            {isExpanded ? 'Show Less' : 'Show All'}
          </Button>
        )}
      </Flex>

      <VStack spacing={3} align="stretch">
        {visibleAlerts.length === 0 ? (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <AlertTitle>No Active Alerts</AlertTitle>
            <AlertDescription>All systems operating within normal parameters.</AlertDescription>
          </Alert>
        ) : (
          visibleAlerts.map((alert) => {
            const alertConfig = alertTypes[alert.type];
            const AlertIcon = alertConfig.icon;
            
            return (
              <Alert
                key={alert.id}
                status={alertConfig.color}
                borderRadius="md"
                position="relative"
              >
                <AlertIcon as={AlertIcon} />
                <Box flex="1">
                  <AlertTitle fontSize="sm">
                    {alertConfig.title}
                    <Badge
                      ml={2}
                      colorScheme={getSeverityColor(alert.severity)}
                      size="sm"
                    >
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription fontSize="sm">
                    {alert.message}
                  </AlertDescription>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    {formatTimestamp(alert.timestamp)}
                    {alert.building && ` • ${alert.building}`}
                  </Text>
                </Box>
                <CloseButton
                  position="absolute"
                  right="8px"
                  top="8px"
                  size="sm"
                  onClick={() => dismissAlert(alert.id)}
                />
              </Alert>
            );
          })
        )}
      </VStack>
    </Box>
  );
};

export default AlertSystem;
