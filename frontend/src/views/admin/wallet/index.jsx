import {
  Box,
  Text,
  Button,
  Icon,
  useColorModeValue,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Badge,
  VStack,
  HStack,
  Progress,
} from "@chakra-ui/react";
import React from "react";
import {
  MdBatteryChargingFull,
  MdAttachMoney,
  MdSchedule,
  MdBuild,
  MdAdd,
  MdPayment,
  MdRefresh,
  MdSettings,
} from "react-icons/md";

// Energy Pack Card Component
const EnergyPackCard = () => {
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = useColorModeValue("gray.500", "gray.400");

  return (
    <Card bg={cardBg} borderColor={borderColor} p="30px" mb="30px">
      <CardHeader>
        <HStack justify="space-between" align="center">
          <Heading size="lg" color={textColor}>
            Current Energy Pack
          </Heading>
          <Badge colorScheme="green" variant="solid" px="3" py="1" borderRadius="full">
            ACTIVE
          </Badge>
        </HStack>
      </CardHeader>
      <CardBody>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap="20px" mb="30px">
          <VStack spacing="2" align="center">
            <Text color={textColorSecondary} fontSize="sm" fontWeight="medium">
              Current Capacity
            </Text>
            <Text color={textColor} fontSize="3xl" fontWeight="bold">
              75%
            </Text>
            <Progress value={75} colorScheme="green" size="lg" w="100%" borderRadius="full" />
          </VStack>
          
          <VStack spacing="2" align="center">
            <Text color={textColorSecondary} fontSize="sm" fontWeight="medium">
              Remaining Energy
            </Text>
            <Text color={textColor} fontSize="2xl" fontWeight="bold">
              75 kWh
            </Text>
            <Text color={textColorSecondary} fontSize="sm">
              of 100 kWh total
            </Text>
          </VStack>
          
          <VStack spacing="2" align="center">
            <Text color={textColorSecondary} fontSize="sm" fontWeight="medium">
              Daily Usage
            </Text>
            <Text color={textColor} fontSize="2xl" fontWeight="bold">
              25 kWh
            </Text>
            <Text color="green.500" fontSize="sm" fontWeight="bold">
              ▲ 12% from yesterday
            </Text>
          </VStack>
          
          <VStack spacing="2" align="center">
            <Text color={textColorSecondary} fontSize="sm" fontWeight="medium">
              Efficiency
            </Text>
            <Text color={textColor} fontSize="2xl" fontWeight="bold">
              92%
            </Text>
            <Text color="green.500" fontSize="sm" fontWeight="bold">
              ▲ 2% improvement
            </Text>
          </VStack>
        </SimpleGrid>
        
        <VStack spacing="4" align="stretch" mb="30px">
          <HStack justify="space-between">
            <Text color={textColorSecondary} fontSize="sm">
              Last Charged: 2 hours ago
            </Text>
            <Text color={textColorSecondary} fontSize="sm">
              Next Maintenance: 15 days
            </Text>
          </HStack>
        </VStack>
        
        <HStack spacing="3" justify="center">
          <Button
            leftIcon={<Icon as={MdBatteryChargingFull} />}
            colorScheme="green"
            size="md"
          >
            + Start Charging
          </Button>
          <Button
            leftIcon={<Icon as={MdSettings} />}
            colorScheme="gray"
            variant="outline"
            size="md"
          >
            Optimize Usage
          </Button>
          <Button
            leftIcon={<Icon as={MdBuild} />}
            colorScheme="gray"
            variant="outline"
            size="md"
          >
            Schedule Maintenance
          </Button>
        </HStack>
      </CardBody>
    </Card>
  );
};

// Current Loan Card Component
const CurrentLoanCard = () => {
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = useColorModeValue("gray.500", "gray.400");

  return (
    <Card bg={cardBg} borderColor={borderColor} p="30px" mb="30px">
      <CardHeader>
        <HStack justify="space-between" align="center">
          <Heading size="lg" color={textColor}>
            Current Loan
          </Heading>
          <Badge colorScheme="blue" variant="solid" px="3" py="1" borderRadius="full">
            CURRENT
          </Badge>
        </HStack>
      </CardHeader>
      <CardBody>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap="20px" mb="30px">
          <VStack spacing="2" align="center">
            <Text color={textColorSecondary} fontSize="sm" fontWeight="medium">
              Remaining Balance
            </Text>
            <Text color={textColor} fontSize="2xl" fontWeight="bold">
              35,000 ENTO
            </Text>
            <Text color={textColorSecondary} fontSize="sm">
              of 50,000 ENTO total
            </Text>
          </VStack>
          
          <VStack spacing="2" align="center">
            <Text color={textColorSecondary} fontSize="sm" fontWeight="medium">
              Monthly Payment
            </Text>
            <Text color={textColor} fontSize="2xl" fontWeight="bold">
              1,250 ENTO
            </Text>
            <Text color={textColorSecondary} fontSize="sm">
              Due 2024-02-15
            </Text>
          </VStack>
          
          <VStack spacing="2" align="center">
            <Text color={textColorSecondary} fontSize="sm" fontWeight="medium">
              Interest Rate
            </Text>
            <Text color={textColor} fontSize="2xl" fontWeight="bold">
              4.5%
            </Text>
            <Text color={textColorSecondary} fontSize="sm">
              Annual rate
            </Text>
          </VStack>
          
          <VStack spacing="2" align="center">
            <Text color={textColorSecondary} fontSize="sm" fontWeight="medium">
              Remaining Payments
            </Text>
            <Text color={textColor} fontSize="2xl" fontWeight="bold">
              28
            </Text>
            <Text color={textColorSecondary} fontSize="sm">
              of 36 total
            </Text>
          </VStack>
        </SimpleGrid>
        
        <VStack spacing="4" align="stretch" mb="30px">
          <HStack justify="space-between">
            <Text color={textColorSecondary} fontSize="sm">
              <Text as="span" fontWeight="bold">Loan Type:</Text> Green Energy Investment
            </Text>
            <Text color={textColorSecondary} fontSize="sm">
              <Text as="span" fontWeight="bold">Start Date:</Text> 2022-01-15
            </Text>
          </HStack>
        </VStack>
        
        <HStack spacing="3" justify="center">
          <Button
            leftIcon={<Icon as={MdPayment} />}
            colorScheme="green"
            size="md"
          >
            $ Make Payment
          </Button>
          <Button
            leftIcon={<Icon as={MdRefresh} />}
            colorScheme="gray"
            variant="outline"
            size="md"
          >
            Refinance
          </Button>
          <Button
            leftIcon={<Icon as={MdSchedule} />}
            colorScheme="gray"
            variant="outline"
            size="md"
          >
            Payment Schedule
          </Button>
        </HStack>
      </CardBody>
    </Card>
  );
};

// Quick Actions Card Component
const QuickActionsCard = () => {
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("navy.700", "white");

  return (
    <Card bg={cardBg} borderColor={borderColor} p="30px">
      <CardHeader>
        <Heading size="lg" color={textColor}>
          Quick Actions
        </Heading>
      </CardHeader>
      <CardBody>
        <HStack spacing="4" justify="center">
          <Button
            leftIcon={<Icon as={MdAdd} />}
            colorScheme="green"
            size="lg"
            h="60px"
            px="8"
          >
            + Upgrade Energy Pack
          </Button>
          <Button
            leftIcon={<Icon as={MdAttachMoney} />}
            colorScheme="green"
            size="lg"
            h="60px"
            px="8"
          >
            Apply for New Loan
          </Button>
          <Button
            leftIcon={<Icon as={MdPayment} />}
            colorScheme="blue"
            size="lg"
            h="60px"
            px="8"
          >
            Make Prepayment
          </Button>
        </HStack>
      </CardBody>
    </Card>
  );
};

export default function Wallet() {
  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      {/* Energy Pack Card */}
      <EnergyPackCard />
      
      {/* Current Loan Card */}
      <CurrentLoanCard />
      
      {/* Quick Actions Card */}
      <QuickActionsCard />
    </Box>
  );
}
