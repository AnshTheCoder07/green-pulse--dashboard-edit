
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Text,
  Badge,
  HStack,
  Icon,
  useColorModeValue,
  Button,
  VStack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Flex,
  Spinner,
} from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import {
  MdBlock,
  MdCheckCircle,
  MdPending,
  MdError,
  MdRefresh,
  MdFilterList,
  MdDownload,
  MdVisibility,
  MdTrendingUp,
  MdAttachMoney,
  MdSchedule,
} from "react-icons/md";

// Blockchain Transaction Component
const BlockchainTransaction = ({ transaction, index }) => {
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = useColorModeValue("gray.500", "gray.400");

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified': return MdCheckCircle;
      case 'pending': return MdPending;
      case 'failed': return MdError;
      case 'inactive': return MdBlock;
      default: return MdSchedule;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'green';
      case 'pending': return 'yellow';
      case 'failed': return 'red';
      case 'inactive': return 'gray';
      case 'anomaly': return 'orange';
      default: return 'blue';
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'green.500';
    if (progress >= 50) return 'yellow.500';
    return 'red.500';
  };

  return (
    <Tr _hover={{ bg: useColorModeValue("gray.50", "gray.700") }}>
      <Td>
        <HStack spacing="3">
          <Icon
            as={getStatusIcon(transaction.status)}
            w="20px"
            h="20px"
            color={`${getStatusColor(transaction.status)}.500`}
          />
          <VStack align="start" spacing="0">
            <Text color={textColor} fontSize="sm" fontWeight="bold">
              {transaction.name}
            </Text>
            <Text color={textColorSecondary} fontSize="xs">
              {transaction.type}
            </Text>
          </VStack>
        </HStack>
      </Td>
      <Td>
        <Badge
          colorScheme={getStatusColor(transaction.status)}
          variant="subtle"
          fontSize="xs"
          textTransform="capitalize"
        >
          {transaction.status}
        </Badge>
      </Td>
      <Td>
        <Text color={textColorSecondary} fontSize="sm">
          {transaction.date}
        </Text>
      </Td>
      <Td>
        <HStack spacing="2">
          <Text
            color={getProgressColor(transaction.progress)}
            fontSize="sm"
            fontWeight="bold"
          >
            {transaction.progress}%
          </Text>
          <Box
            w="60px"
            h="4px"
            bg="gray.200"
            borderRadius="full"
            overflow="hidden"
          >
            <Box
              w={`${transaction.progress}%`}
              h="100%"
              bg={getProgressColor(transaction.progress)}
              borderRadius="full"
            />
          </Box>
        </HStack>
      </Td>
      <Td>
        <Text color={textColor} fontSize="sm" fontWeight="bold">
          {transaction.quantity?.toLocaleString() || '-'}
        </Text>
      </Td>
      <Td>
        <Text color={textColorSecondary} fontSize="sm">
          {transaction.value || '-'}
        </Text>
      </Td>
    </Tr>
  );
};

export default function EmissionsData() {
  // Chakra Color Mode
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = useColorModeValue("gray.500", "gray.400");
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const brandColor = useColorModeValue("green.400", "green.300");

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);

  // Mock blockchain transaction data
  const mockTransactions = [
    {
      id: 1,
      name: "ENERGY CONSUMPTION",
      type: "Energy Transaction",
      status: "failed",
      date: "9/12/2025",
      progress: 0,
      quantity: -150.5,
      value: "-150.5 ENTO",
      txHash: "0x123456...7890abcdef"
    },
    {
      id: 2,
      name: "CARBON OFFSET_PURCHASE",
      type: "Carbon Offset",
      status: "verified",
      date: "9/11/2025",
      progress: 100,
      quantity: -500,
      value: "-500 ENTO",
      txHash: "0xabcdef...1234567890"
    },
    {
      id: 3,
      name: "CREDIT",
      type: "Credit Transaction",
      status: "verified",
      date: "9/10/2025",
      progress: 100,
      quantity: 1000,
      value: "+1000 ENTO",
      txHash: "0x987654...3210fedcba"
    },
    {
      id: 4,
      name: "Carbon Marketplace",
      type: "Carbon Credit",
      status: "verified",
      date: "12.Jan.2021",
      progress: 75.5,
      quantity: 2458,
      value: "2,458 ENTO",
      txHash: "0x1234567890abcdef1234567890abcdef12345678"
    },
    {
      id: 5,
      name: "Renewable Energy Credits",
      type: "Energy Credit",
      status: "verified",
      date: "21.Feb.2021",
      progress: 35.4,
      quantity: 1485,
      value: "1,485 ENTO",
      txHash: "0xabcdef1234567890abcdef1234567890abcdef12"
    },
    {
      id: 6,
      name: "Carbon Offsets",
      type: "Offset Credit",
      status: "pending",
      date: "13.Mar.2021",
      progress: 25,
      quantity: 1024,
      value: "1,024 ENTO",
      txHash: "0x9876543210fedcba9876543210fedcba98765432"
    },
    {
      id: 7,
      name: "Sustainable Assets",
      type: "Asset Token",
      status: "verified",
      date: "24.Jan.2021",
      progress: 100,
      quantity: 858,
      value: "858 ENTO",
      txHash: "0x456789abcdef0123456789abcdef0123456789ab"
    },
    {
      id: 8,
      name: "Energy Trading",
      type: "Energy Trade",
      status: "verified",
      date: "24.Oct.2022",
      progress: 75.5,
      quantity: 1024,
      value: "1,024 ENTO",
      txHash: "0x2345678901bcdef2345678901bcdef2345678901"
    },
    {
      id: 9,
      name: "Carbon Credit Sale",
      type: "Carbon Sale",
      status: "verified",
      date: "24.Oct.2022",
      progress: 75.5,
      quantity: 1024,
      value: "1,024 ENTO",
      txHash: "0x3456789012cdef3456789012cdef3456789012"
    },
    {
      id: 10,
      name: "Green Energy Purchase",
      type: "Energy Purchase",
      status: "verified",
      date: "12.Jan.2021",
      progress: 75.5,
      quantity: 1024,
      value: "1,024 ENTO",
      txHash: "0x4567890123def4567890123def4567890123def"
    }
  ];

  useEffect(() => {
    setTransactions(mockTransactions);
  }, []); // Empty dependency array is correct here

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setTransactions([...mockTransactions]);
      setIsLoading(false);
    }, 1500);
  };

  const handleExport = () => {
    // Simulate export functionality
    console.log("Exporting blockchain transactions...");
  };

  // Calculate summary stats
  const totalTransactions = transactions.length;
  const verifiedTransactions = transactions.filter(tx => tx.status === 'verified').length;
  const totalValue = transactions.reduce((sum, tx) => sum + (tx.quantity || 0), 0);
  const averageProgress = transactions.reduce((sum, tx) => sum + tx.progress, 0) / totalTransactions;

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      {/* Header Section */}
      <Flex justify="space-between" align="center" mb="30px">
        <Box>
          <Heading color={textColor} fontSize="4xl" fontWeight="bold" mb="2">
            🔗 Blockchain Transactions
          </Heading>
          <Text color={textColorSecondary} fontSize="lg">
            Real-time carbon credit and energy token transactions
          </Text>
        </Box>
        <HStack spacing="3">
          <Button
            leftIcon={<Icon as={MdFilterList} />}
            colorScheme="gray"
            variant="outline"
            size="sm"
          >
            Filter
          </Button>
          <Button
            leftIcon={<Icon as={MdDownload} />}
            colorScheme="blue"
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            leftIcon={<Icon as={MdRefresh} />}
            colorScheme="brand"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isLoading}
          >
            Refresh
          </Button>
        </HStack>
      </Flex>

      {/* Summary Stats */}
      <SimpleGrid columns={{ base: 1, md: 4 }} gap="20px" mb="30px">
        <Card bg={cardBg} borderColor={borderColor} p="20px">
          <Stat textAlign="center">
            <StatLabel color={textColorSecondary} fontSize="sm">Total Transactions</StatLabel>
            <StatNumber color={brandColor} fontSize="2xl" fontWeight="bold">
              {totalTransactions}
            </StatNumber>
            <StatHelpText color={textColorSecondary}>
              <Icon as={MdBlock} mr="1" />
              Blockchain Records
            </StatHelpText>
          </Stat>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} p="20px">
          <Stat textAlign="center">
            <StatLabel color={textColorSecondary} fontSize="sm">Verified</StatLabel>
            <StatNumber color="green.500" fontSize="2xl" fontWeight="bold">
              {verifiedTransactions}
            </StatNumber>
            <StatHelpText color={textColorSecondary}>
              <Icon as={MdCheckCircle} mr="1" />
              {Math.round((verifiedTransactions / totalTransactions) * 100)}% Success Rate
            </StatHelpText>
          </Stat>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} p="20px">
          <Stat textAlign="center">
            <StatLabel color={textColorSecondary} fontSize="sm">Total Value</StatLabel>
            <StatNumber color="blue.500" fontSize="2xl" fontWeight="bold">
              {totalValue.toLocaleString()}
            </StatNumber>
            <StatHelpText color={textColorSecondary}>
              <Icon as={MdAttachMoney} mr="1" />
              ENTO Tokens
            </StatHelpText>
          </Stat>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} p="20px">
          <Stat textAlign="center">
            <StatLabel color={textColorSecondary} fontSize="sm">Avg Progress</StatLabel>
            <StatNumber color="purple.500" fontSize="2xl" fontWeight="bold">
              {Math.round(averageProgress)}%
            </StatNumber>
            <StatHelpText color={textColorSecondary}>
              <Icon as={MdTrendingUp} mr="1" />
              Completion Rate
            </StatHelpText>
          </Stat>
        </Card>
      </SimpleGrid>

      {/* Main Blockchain Transactions Table */}
      <Card bg={cardBg} borderColor={borderColor}>
        <CardHeader>
          <HStack justify="space-between" align="center">
            <Heading size="lg" color={textColor}>
              Live Blockchain Transactions
            </Heading>
            <HStack spacing="2">
              <Button size="sm" variant="outline" leftIcon={<Icon as={MdVisibility} />}>
                View Details
              </Button>
            </HStack>
          </HStack>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <Flex justify="center" align="center" h="200px">
              <Spinner size="xl" color="green.500" />
            </Flex>
          ) : (
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th color={textColorSecondary}>Transaction</Th>
                    <Th color={textColorSecondary}>Status</Th>
                    <Th color={textColorSecondary}>Date</Th>
                    <Th color={textColorSecondary}>Progress</Th>
                    <Th color={textColorSecondary}>Quantity</Th>
                    <Th color={textColorSecondary}>Value</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {transactions.map((transaction) => (
                    <BlockchainTransaction
                      key={transaction.id}
                      transaction={transaction}
                    />
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </CardBody>
      </Card>
    </Box>
  );
}
