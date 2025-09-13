// Chakra imports
import {
  Box,
  Button,
  Flex,
  Icon,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import Card from "components/card/CarbonCard.js";
// Custom components
import BarChart from "components/charts/BarChart";
import React from "react";
import {
  barChartOptionsConsumption,
} from "variables/charts";
import { MdBarChart } from "react-icons/md";
import { useCarbon } from "contexts/CarbonContext";

export default function WeeklyRevenue(props) {
  const { ...rest } = props;

  // Chakra Color Mode
  const textColor = useColorModeValue("secondaryGray.900", "white");
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

  // Generate weekly energy consumption data by department
  const weeklyEnergyData = [
    {
      name: "Computer Science Dept",
      data: [180, 165, 195, 175, 185, 190, 170]
    },
    {
      name: "Engineering Dept", 
      data: [220, 200, 240, 210, 225, 235, 205]
    },
    {
      name: "Medical School",
      data: [200, 185, 215, 195, 205, 210, 190]
    },
    {
      name: "Science Lab Complex",
      data: [250, 230, 270, 245, 255, 265, 235]
    },
    {
      name: "Business School",
      data: [150, 140, 165, 155, 160, 165, 145]
    }
  ];

  return (
    <Card align='center' direction='column' w='100%' {...rest}>
      <Flex align='center' w='100%' px='15px' py='10px'>
        <Text
          me='auto'
          color={textColor}
          fontSize='xl'
          fontWeight='700'
          lineHeight='100%'>
          Weekly Energy Consumption
        </Text>
        <Button
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

      <Box h='240px' w='100%' mt='auto'>
        <BarChart
          chartData={weeklyEnergyData}
          chartOptions={{
            ...barChartOptionsConsumption,
            xaxis: {
              ...barChartOptionsConsumption.xaxis,
              categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            }
          }}
        />
      </Box>
    </Card>
  );
}
