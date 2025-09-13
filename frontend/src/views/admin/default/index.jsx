/*!
  ... (Horizon UI copyright) ...
*/

import {
  Box,
  Flex,
  Icon,
  Select,
  SimpleGrid,
  Text,
  useColorModeValue,
  Card,
  CardBody,
  CardHeader,
  Heading,
  VStack,
  HStack,
  Badge,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Button,
  Avatar,
  AvatarGroup,
} from "@chakra-ui/react";
// import Earth from "assets/img/dashboards/usa.png"; // Could represent carbon market or simply keep as is
import MiniCalendar from "components/calendar/MiniCalendar";
import CarbonMiniStats from "components/card/CarbonMiniStats";
import IconBox from "components/icons/IconBox";
import React from "react";
import {
  MdAddTask,
  MdAttachMoney,
  MdBarChart,
  MdFileCopy,
  MdTrendingUp,
  MdEco,
  MdPeople,
  MdStar,
  MdCheckCircle,
  MdSchedule,
  MdNotifications,
  MdHistory,
  MdEmojiEvents,
  MdLocalFireDepartment,
  MdNature,
  MdPublic,
  MdTrendingDown,
  MdShowChart,
  MdTimeline,
  MdAssessment,
  MdSpeed,
  MdLightbulb,
  MdWaterDrop,
  MdRecycling,
  MdSolarPower,
  MdWindPower,
  MdElectricBolt,
  MdThermostat,
  MdInsights,
  MdAnalytics,
  MdAccountBalance,
  MdSecurity,
  MdVerified,
  MdMore,
} from "react-icons/md";
import { useCarbon } from "contexts/CarbonContext";
import { useDepartment } from "contexts/DepartmentContext";
import CheckTable from "views/admin/default/components/CheckTable";
import ComplexTable from "views/admin/default/components/ComplexTable";
import DailyTraffic from "views/admin/default/components/DailyTraffic";
import PieCard from "views/admin/default/components/PieCard";
import Tasks from "views/admin/default/components/Tasks";
import TotalSpent from "views/admin/default/components/TotalSpent";
import WeeklyRevenue from "views/admin/default/components/WeeklyRevenue";
import AlertSystem from "components/alerts/AlertSystem";
import {
  columnsDataCheck,
  columnsDataComplex,
} from "views/admin/default/variables/columnsData";
import tableDataCheck from "views/admin/default/variables/tableDataCheck.json";
import tableDataComplex from "views/admin/default/variables/tableDataComplex.json";








// Horizontal Scrolling Department Carbon Data Component
const DepartmentCarbonData = () => {
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = useColorModeValue("gray.500", "gray.400");
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const itemBg = useColorModeValue("gray.50", "gray.700");
  
  const { getEnergyConsumptionByDepartment } = useDepartment();
  const departmentData = getEnergyConsumptionByDepartment();

  return (
    <Card bg={cardBg} borderColor={borderColor} w="100%" h="100%">
      <CardHeader>
        <Heading size="md" color={textColor}>
          Department Carbon Data
        </Heading>
      </CardHeader>
      <CardBody>
        <Box overflowX="auto" w="100%">
          <HStack spacing="4" minW="max-content" pb="2">
            {departmentData.map((dept, index) => (
              <Box
                key={dept.name}
                minW="200px"
                p="4"
                bg={itemBg}
                borderRadius="lg"
                border="1px solid"
                borderColor={borderColor}
              >
                <VStack spacing="2" align="center">
                  <HStack spacing="2">
                    <Box h="12px" w="12px" bg={dept.color} borderRadius="50%" />
                    <Text color={textColor} fontSize="sm" fontWeight="bold" textAlign="center">
                      {dept.name}
                    </Text>
                  </HStack>
                  <Text color={textColor} fontSize="2xl" fontWeight="bold">
                    {dept.consumption} kWh
                  </Text>
                  <Text color={textColorSecondary} fontSize="xs">
                    Energy Consumption
                  </Text>
                  <Text color={textColor} fontSize="lg" fontWeight="bold">
                    {dept.efficiency}%
                  </Text>
                  <Text color={textColorSecondary} fontSize="xs">
                    Efficiency
                  </Text>
                  <Badge 
                    colorScheme={dept.efficiency >= 90 ? "green" : dept.efficiency >= 70 ? "orange" : "red"}
                    variant="subtle"
                    fontSize="xs"
                  >
                    {dept.efficiency >= 90 ? "Excellent" : dept.efficiency >= 70 ? "Good" : "Needs Improvement"}
                  </Badge>
                </VStack>
              </Box>
            ))}
          </HStack>
        </Box>
      </CardBody>
    </Card>
  );
};

export default function CarbonDeptDashboard() {
  // Chakra Color Mode
  const brandColor = useColorModeValue("green.400", "white");
  const boxBg = useColorModeValue("green.50", "whiteAlpha.100"); // subtle green background for cards
  
  // Carbon data context
  const { dashboardData, loading } = useCarbon();
  
  // Use real data or fallback to defaults
  const co2Savings = dashboardData?.co2Savings ?? 350.4;
  const carbonBudgetUsed = dashboardData?.carbonBudgetUsed ?? 642.39;
  const walletBalance = dashboardData?.walletBalance ?? 1000;

  // Show loading state if data is not available
  if (loading && !dashboardData) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} textAlign="center">
        <Text fontSize="lg" color="gray.600">Loading dashboard data...</Text>
      </Box>
    );
  }

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} px={{ base: "20px", md: "30px" }}>
      {/* Alert System - Top of Page */}
      <Box mb="20px">
        <AlertSystem />
      </Box>
      
      
      <SimpleGrid
        columns={{ base: 1, md: 2, lg: 3, "2xl": 6 }}
        gap="15px"
        mb="15px"
      >
        <CarbonMiniStats
          startContent={
            <IconBox
              w="56px"
              h="56px"
              bg={boxBg}
              icon={
                <Icon w="32px" h="32px" as={MdBarChart} color={brandColor} />
              }
            />
          }
          name="CO₂ Savings (tonnes)"
          value={co2Savings.toFixed(1)}
          growth="+12.5%"
        />
        <CarbonMiniStats
          startContent={
            <IconBox
              w="56px"
              h="56px"
              bg={boxBg}
              icon={
                <Icon w="32px" h="32px" as={MdAttachMoney} color={brandColor} />
              }
            />
          }
          name="Carbon Budget Used (this month)"
          value={`${carbonBudgetUsed.toFixed(2)} ENTO`}
        />
        <CarbonMiniStats growth="+23%" name="Offsets Purchased" value="574.34" />
        <CarbonMiniStats
          endContent={
            <Flex me="-16px" mt="10px">
             
              <Select
                id="balance"
                variant="mini"
                mt="5px"
                me="0px"
                defaultValue="carbon"
              >
                <option value="carbon">CO₂</option>
                <option value="water">Water</option>
                <option value="gba">Biodiversity</option>
              </Select>
            </Flex>
          }
          name="Carbon Wallet Balance"
          value={`${walletBalance.toLocaleString()} ENTO`}
        />
        <CarbonMiniStats
          startContent={
            <IconBox
              w="56px"
              h="56px"
              bg="linear-gradient(90deg, #59b769 0%, #64b5f6 100%)"
              icon={<Icon w="28px" h="28px" as={MdAddTask} color="white" />}
            />
          }
          name="New Reduction Initiatives"
          value="154"
        />
        <CarbonMiniStats
          startContent={
            <IconBox
              w="56px"
              h="56px"
              bg={boxBg}
              icon={
                <Icon w="32px" h="32px" as={MdFileCopy} color={brandColor} />
              }
            />
          }
          name="Carbon Value"
          value="2,935"
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 2 }} gap="15px" mb="15px">
        <TotalSpent title="Energy Consumption" />
        <WeeklyRevenue title="Weekly Carbon Revenue" />
      </SimpleGrid>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 2 }} gap="15px" mb="15px">
        <DailyTraffic title="Departmental Footprint Traffic" />
        <DepartmentCarbonData />
      </SimpleGrid>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 2 }} gap="15px" mb="15px">
        <Tasks title="Pending Carbon Tasks" />
        <MiniCalendar h="100%" minW="100%" selectRange={false} />
      </SimpleGrid>
    </Box>
  );
}
