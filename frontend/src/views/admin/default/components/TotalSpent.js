// Chakra imports
import {
  Box,
  Button,
  Flex,
  Icon,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
// Custom components
import Card from "components/card/CarbonCard.js";
import LineChart from "components/charts/LineChart";
import React, { useState, useEffect } from "react";
import { IoCheckmarkCircle } from "react-icons/io5";
import { MdBarChart, MdOutlineCalendarToday } from "react-icons/md";
// Assets
import { RiArrowUpSFill } from "react-icons/ri";
import {
  lineChartOptionsTotalSpent,
} from "variables/charts";
import { useCarbon } from "contexts/CarbonContext";

export default function TotalSpent(props) {
  const { ...rest } = props;

  // Chakra Color Mode
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue("secondaryGray.600", "white");
  const boxBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");
  const iconColor = useColorModeValue("brand.500", "white");
  const bgButton = useColorModeValue("secondaryGray.300", "whiteAlpha.100");
  const bgHover = useColorModeValue(
    { bg: "secondaryGray.400" },
    { bg: "whiteAlpha.50" }
  );
  const bgFocus = useColorModeValue(
    { bg: "secondaryGray.300" },
    { bg: "whiteAlpha.100" }
  );

  // Carbon data context
  const { getEnergyConsumptionData } = useCarbon();
  const [energyData, setEnergyData] = useState({
    current: 2847,
    monthly: [2850, 3200, 2800, 3100, 2900, 2847],
    efficiency: [85, 88, 82, 90, 87, 92],
    buildings: {
      'Building A': 35,
      'Building B': 28,
      'Building C': 22,
      'Building D': 15
    }
  });
  
  // Load energy data on component mount
  useEffect(() => {
    const loadEnergyData = async () => {
      try {
        const data = await getEnergyConsumptionData();
        setEnergyData(data);
      } catch (error) {
        console.error('Error loading energy data:', error);
        // Keep default/fallback data if loading fails
      }
    };
    
    loadEnergyData();
  }, [getEnergyConsumptionData]);
  
  // Calculate efficiency trend
  const currentEfficiency = energyData.efficiency && energyData.efficiency.length > 0 
    ? energyData.efficiency[energyData.efficiency.length - 1] 
    : 92;
  const previousEfficiency = energyData.efficiency && energyData.efficiency.length > 1 
    ? energyData.efficiency[energyData.efficiency.length - 2] 
    : 87;
  const efficiencyChange = previousEfficiency 
    ? ((currentEfficiency - previousEfficiency) / previousEfficiency * 100).toFixed(1) 
    : '0.0';
  
  return (
    <Card
      justifyContent='center'
      align='center'
      direction='column'
      w='100%'
      mb='0px'
      {...rest}>
      <Flex justify='space-between' ps='0px' pe='20px' pt='5px'>
        <Flex align='center' w='100%'>
          <Button
            bg={boxBg}
            fontSize='sm'
            fontWeight='500'
            color={textColorSecondary}
            borderRadius='7px'>
            <Icon
              as={MdOutlineCalendarToday}
              color={textColorSecondary}
              me='4px'
            />
            This month
          </Button>
          <Button
            ms='auto'
            align='center'
            justifyContent='center'
            bg={bgButton}
            _hover={bgHover}
            _focus={bgFocus}
            _active={bgFocus}
            w='37px'
            h='37px'
            lineHeight='100%'
            borderRadius='10px'
            {...rest}>
            <Icon as={MdBarChart} color={iconColor} w='24px' h='24px' />
          </Button>
        </Flex>
      </Flex>
      <Flex w='100%' flexDirection={{ base: "column", lg: "row" }}>
        <Flex flexDirection='column' me='20px' mt='28px'>
          <Text
            color={textColor}
            fontSize='34px'
            textAlign='start'
            fontWeight='700'
            lineHeight='100%'>
            {(energyData.current || 2847).toLocaleString()} kWh
          </Text>
          <Flex align='center' mb='20px'>
            <Text
              color='secondaryGray.600'
              fontSize='sm'
              fontWeight='500'
              mt='4px'
              me='12px'>
              Energy Consumption
            </Text>
            <Flex align='center'>
              <Icon as={RiArrowUpSFill} color={efficiencyChange >= 0 ? 'green.500' : 'red.500'} me='2px' mt='2px' />
              <Text color={efficiencyChange >= 0 ? 'green.500' : 'red.500'} fontSize='sm' fontWeight='700'>
                {efficiencyChange >= 0 ? '+' : ''}{efficiencyChange}%
              </Text>
            </Flex>
          </Flex>

          <Flex align='center'>
            <Icon as={IoCheckmarkCircle} color={currentEfficiency >= 85 ? 'green.500' : currentEfficiency >= 70 ? 'orange.500' : 'red.500'} me='4px' />
            <Text color={currentEfficiency >= 85 ? 'green.500' : currentEfficiency >= 70 ? 'orange.500' : 'red.500'} fontSize='md' fontWeight='700'>
              {currentEfficiency >= 85 ? 'Efficient' : currentEfficiency >= 70 ? 'Moderate' : 'Needs Improvement'}
            </Text>
          </Flex>
        </Flex>
        <Box h='260px' w='100%' mt='auto'>
          <LineChart
            chartData={[
              {
                name: "Energy Consumption (kWh)",
                data: energyData.monthly || [2850, 3200, 2800, 3100, 2900, 2847]
              },
              {
                name: "Energy Efficiency (%)",
                data: energyData.efficiency || [85, 88, 82, 90, 87, 92]
              }
            ]}
            chartOptions={lineChartOptionsTotalSpent}
          />
        </Box>
      </Flex>
    </Card>
  );
}
