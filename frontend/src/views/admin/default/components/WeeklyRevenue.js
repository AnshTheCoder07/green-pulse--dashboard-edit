// Chakra imports
import {
  Box,
  Button,
  Flex,
  Icon,
  Text,
  useColorModeValue,
  Select,
  Spinner,
  Badge,
  Tooltip,
} from "@chakra-ui/react";
import Card from "components/card/CarbonCard.js";
// Custom components
import BarChart from "components/charts/BarChart";
import React, { useState, useEffect } from "react";
import {
  barChartOptionsConsumption,
} from "variables/charts";
import { MdBarChart, MdInfo } from "react-icons/md";
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
  const { getWeeklyEnergyData } = useCarbon();
  const [weeklyEnergyData, setWeeklyEnergyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstitution, setSelectedInstitution] = useState('all');
  const [institutions, setInstitutions] = useState([]);
  const [dataSource, setDataSource] = useState('loading');

  // Fetch weekly energy data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getWeeklyEnergyData();
        setWeeklyEnergyData(data);
        
        // Extract unique institution names from the data
        const uniqueInstitutions = [...new Set(data.map(item => item.name.split(' - ')[0]))];
        setInstitutions(uniqueInstitutions);
        
        // Check if data is from MongoDB or fallback
        setDataSource(data.length > 0 && data[0].source === 'mongodb' ? 'mongodb' : 'sample');
      } catch (error) {
        console.error('Error fetching weekly energy data:', error);
        setDataSource('error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getWeeklyEnergyData]);

  // Filter data based on selected institution
  const filteredData = selectedInstitution === 'all' 
    ? weeklyEnergyData 
    : weeklyEnergyData.filter(item => item.name.includes(selectedInstitution));

  // Get badge color based on data source
  const getBadgeColor = () => {
    switch(dataSource) {
      case 'mongodb': return 'green';
      case 'sample': return 'orange';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  // Get badge text based on data source
  const getBadgeText = () => {
    switch(dataSource) {
      case 'mongodb': return 'Live Data';
      case 'sample': return 'Sample Data';
      case 'error': return 'Error';
      default: return 'Loading';
    }
  };

  return (
    <Card align='center' direction='column' w='100%' {...rest}>
      <Flex align='center' w='100%' px='15px' py='10px'>
        <Flex direction="column">
          <Text
            color={textColor}
            fontSize='xl'
            fontWeight='700'
            lineHeight='100%'>
            Weekly Energy Consumption
          </Text>
          <Flex align="center" mt="2">
            <Badge colorScheme={getBadgeColor()} mr="2">
              {getBadgeText()}
            </Badge>
            {dataSource === 'sample' && (
              <Tooltip label="Using sample data as real-time data is unavailable" placement="bottom">
                <Icon as={MdInfo} color="orange.500" />
              </Tooltip>
            )}
          </Flex>
        </Flex>
        <Flex ml="auto" align="center">
          <Select
            ml='auto'
            mr='2'
            w='auto'
            value={selectedInstitution}
            onChange={(e) => setSelectedInstitution(e.target.value)}
            size='sm'
            variant='filled'
          >
            <option value='all'>All Institutions</option>
            {institutions.map((inst, index) => (
              <option key={index} value={inst}>{inst}</option>
            ))}
          </Select>
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
      </Flex>

      <Box h='240px' w='100%' mt='auto'>
        {loading ? (
          <Flex justify='center' align='center' h='100%'>
            <Spinner size='xl' color='brand.500' />
          </Flex>
        ) : filteredData.length > 0 ? (
          <BarChart
            chartData={filteredData}
            chartOptions={{
              ...barChartOptionsConsumption,
              xaxis: {
                ...barChartOptionsConsumption.xaxis,
                categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
              }
            }}
          />
        ) : (
          <Flex justify='center' align='center' h='100%' direction="column">
            <Text color={textColor} fontSize="lg" mb="2">
              No data available for {selectedInstitution}
            </Text>
            <Button size="sm" colorScheme="blue" onClick={() => setSelectedInstitution('all')}>
              View All Data
            </Button>
          </Flex>
        )}
      </Box>
    </Card>
  );
}
