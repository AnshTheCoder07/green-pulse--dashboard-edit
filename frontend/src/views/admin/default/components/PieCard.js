// Chakra imports
import { Box, Flex, Text, Select, useColorModeValue } from "@chakra-ui/react";
// Custom components
import Card from "components/card/CarbonCard.js";
import PieChart from "components/charts/PieChart";
import { pieChartOptions } from "variables/charts";
import React from "react";
import { useDepartment } from "contexts/DepartmentContext";

export default function Conversion(props) {
  const { ...rest } = props;

  // Chakra Color Mode
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const cardColor = useColorModeValue("white", "navy.700");
  const cardShadow = useColorModeValue(
    "0px 18px 40px rgba(112, 144, 176, 0.12)",
    "unset"
  );

  // Department data context
  const { getEnergyConsumptionByDepartment } = useDepartment();
  const departmentData = getEnergyConsumptionByDepartment();

  // Calculate department energy usage percentages
  const totalEnergy = departmentData.reduce((sum, dept) => sum + dept.consumption, 0);
  const departmentPercentages = departmentData.map(dept => ({
    building: dept.name,
    energy: dept.consumption,
    percentage: Math.round((dept.consumption / totalEnergy) * 100),
    efficiency: dept.efficiency,
    color: dept.color
  }));

  // Generate pie chart data
  const pieData = departmentPercentages.map(item => item.percentage);
  const pieLabels = departmentPercentages.map(item => item.building);
  
  // Ensure we have valid data
  if (pieData.length === 0 || pieData.every(val => val === 0)) {
    return (
      <Card p='20px' align='center' direction='column' w='100%' {...rest}>
        <Text color={textColor} fontSize='md' fontWeight='600' mt='4px'>
          Department Energy Usage (This Month)
        </Text>
        <Text color={textColorSecondary} fontSize='sm' mt='20px'>
          No data available
        </Text>
      </Card>
    );
  }

  return (
    <Card p='20px' align='center' direction='column' w='100%' {...rest}>
      <Flex
        px={{ base: "0px", "2xl": "10px" }}
        justifyContent='space-between'
        alignItems='center'
        w='100%'
        mb='8px'>
        <Text color={textColor} fontSize='md' fontWeight='600' mt='4px'>
          Department Energy Usage (This Month)
        </Text>
        <Select
          fontSize='sm'
          variant='subtle'
          defaultValue='monthly'
          width='unset'
          fontWeight='700'>
          <option value='daily'>Daily</option>
          <option value='monthly'>Monthly</option>
          <option value='yearly'>Yearly</option>
        </Select>
      </Flex>

      <Box h='200px' w='100%'>
        <PieChart
          chartData={pieData}
          chartOptions={{
            ...pieChartOptions,
            labels: pieLabels
          }}
        />
      </Box>
      <Card
        bg={cardColor}
        flexDirection='column'
        boxShadow={cardShadow}
        w='100%'
        p='15px'
        px='20px'
        mt='15px'
        mx='auto'>
        <Flex direction='row' wrap='wrap' justify='space-between' align='center'>
          {departmentPercentages.map((item, index) => {
            return (
              <Flex key={item.building} direction='column' py='5px' minW='140px' maxW='180px'>
                <Flex align='center'>
                  <Box h='8px' w='8px' bg={item.color} borderRadius='50%' me='4px' />
                  <Text
                    fontSize='xs'
                    color='secondaryGray.600'
                    fontWeight='700'
                    mb='5px'
                    noOfLines={2}>
                    {item.building}
                  </Text>
                </Flex>
                <Text fontSize='lg' color={textColor} fontWeight='700'>
                  {item.percentage}%
                </Text>
                <Text fontSize='xs' color='secondaryGray.500'>
                  {item.energy} kWh
                </Text>
                <Text fontSize='xs' color={item.efficiency >= 90 ? 'green.500' : item.efficiency >= 70 ? 'orange.500' : 'red.500'}>
                  {item.efficiency}% efficient
                </Text>
              </Flex>
            );
          })}
        </Flex>
      </Card>
    </Card>
  );
}
