
import {
  Box,
  Flex,
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
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  useToast,
  Image,
  Avatar,
  AvatarGroup,
  Tooltip,
  Center,
  Circle,
  Spinner,
  keyframes,
} from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import {
  MdEmojiEvents,
  MdTrendingUp,
  MdRefresh,
  MdStar,
  MdLocalFireDepartment,
  MdEco,
  MdPublic,
  MdSchedule,
  MdCheckCircle,
  MdSchool,
  MdBusiness,
  MdPeople,
  MdAttachMoney,
  MdSpeed,
  MdWhatshot,
  MdNature,
  MdPark,
  MdForest,
  MdAutoAwesome,
  MdRocket,
  MdDiamond,
} from "react-icons/md";

// Animation keyframes
const growAnimation = keyframes`
  0% { transform: scale(0.8) rotate(-5deg); opacity: 0; }
  50% { transform: scale(1.1) rotate(2deg); opacity: 0.8; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const floatAnimation = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const sparkleAnimation = keyframes`
  0% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1.2); }
  100% { opacity: 0; transform: scale(0); }
`;

// Growth Tree Component
const GrowthTree = ({ level, isAnimating }) => {
  const treeColor = useColorModeValue("green.400", "green.300");
  const leafColor = useColorModeValue("green.500", "green.400");
  const trunkColor = useColorModeValue("yellow.700", "yellow.600");
  
  return (
    <VStack spacing="2" align="center" position="relative">
      {/* Tree Crown */}
      <Box
        position="relative"
        animation={isAnimating ? `${growAnimation} 2s ease-in-out` : "none"}
      >
        {/* Main Tree Body */}
        <Circle
          size="120px"
          bg={`linear-gradient(135deg, ${treeColor}, ${leafColor})`}
          position="relative"
          boxShadow="0 8px 32px rgba(34, 197, 94, 0.3)"
        >
          <Icon as={MdNature} w="60px" h="60px" color="white" />
        </Circle>
        
        {/* Sparkles */}
        {isAnimating && (
          <>
            <Circle
              size="8px"
              bg="yellow.300"
              position="absolute"
              top="10px"
              right="15px"
              animation={`${sparkleAnimation} 1s ease-in-out infinite`}
            />
            <Circle
              size="6px"
              bg="yellow.200"
              position="absolute"
              top="25px"
              left="20px"
              animation={`${sparkleAnimation} 1.5s ease-in-out infinite`}
            />
            <Circle
              size="4px"
              bg="yellow.100"
              position="absolute"
              bottom="15px"
              right="25px"
              animation={`${sparkleAnimation} 2s ease-in-out infinite`}
            />
          </>
        )}
      </Box>
      
      {/* Tree Trunk */}
      <Box
        w="20px"
        h="40px"
        bg={trunkColor}
        borderRadius="10px"
        animation={isAnimating ? `${growAnimation} 2s ease-in-out 0.5s both` : "none"}
      />
      
      {/* Level Badge */}
      <Badge
        colorScheme="green"
        variant="solid"
        px="3"
        py="1"
        borderRadius="full"
        fontSize="sm"
        fontWeight="bold"
        animation={isAnimating ? `${pulseAnimation} 2s ease-in-out infinite` : "none"}
      >
        Level {level}
      </Badge>
    </VStack>
  );
};

// Gamified Department Card Component
const DepartmentCard = ({ department, rank, isCurrentUser, isAnimating }) => {
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = useColorModeValue("gray.500", "gray.400");
  
  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return "yellow.400";
      case 2: return "gray.300";
      case 3: return "orange.400";
      default: return "blue.400";
    }
  };
  
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return MdEmojiEvents;
      case 2: return MdStar;
      case 3: return MdLocalFireDepartment;
      default: return MdTrendingUp;
    }
  };
  
  const getRankBadge = (rank) => {
    switch (rank) {
      case 1: return "👑";
      case 2: return "🥈";
      case 3: return "🥉";
      default: return `#${rank}`;
    }
  };

  return (
    <Card
      bg={cardBg}
      borderColor={borderColor}
      borderWidth="2px"
      borderRadius="20px"
      p="20px"
      position="relative"
      overflow="hidden"
      transform={isAnimating ? "scale(1.02)" : "scale(1)"}
      transition="all 0.3s ease"
      _hover={{
        transform: "scale(1.05)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
      }}
      boxShadow={isCurrentUser ? "0 0 30px rgba(34, 197, 94, 0.3)" : "0 4px 20px rgba(0,0,0,0.1)"}
    >
      {/* Rank Badge */}
      <Badge
        position="absolute"
        top="-5px"
        right="-5px"
        bg={getRankColor(rank)}
        color="white"
        borderRadius="full"
        w="40px"
        h="40px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="lg"
        fontWeight="bold"
        animation={isAnimating ? `${pulseAnimation} 2s ease-in-out infinite` : "none"}
      >
        {getRankBadge(rank)}
      </Badge>
      
      {/* Current User Highlight */}
      {isCurrentUser && (
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          h="4px"
          bg="linear-gradient(90deg, #22c55e, #16a34a, #15803d)"
          borderRadius="20px 20px 0 0"
        />
      )}
      
      <VStack spacing="4" align="stretch">
        {/* Department Header */}
        <HStack justify="space-between" align="center">
          <HStack spacing="3">
            <Icon as={getRankIcon(rank)} w="24px" h="24px" color={getRankColor(rank)} />
            <VStack align="start" spacing="0">
              <Text
                color={textColor}
                fontSize="lg"
                fontWeight="bold"
                noOfLines={1}
              >
                {department.name}
              </Text>
              <Text color={textColorSecondary} fontSize="sm">
                {department.branch}
              </Text>
            </VStack>
          </HStack>
          
          {isCurrentUser && (
            <Badge colorScheme="green" variant="solid" px="2" py="1">
              Your Dept
            </Badge>
          )}
        </HStack>
        
        {/* Stats Grid */}
        <SimpleGrid columns={2} gap="3">
          <Stat textAlign="center" p="3" bg="green.50" borderRadius="lg">
            <StatLabel color={textColorSecondary} fontSize="xs">ENTO Saved</StatLabel>
            <StatNumber color="green.500" fontSize="lg" fontWeight="bold">
              {department.entoSaved.toLocaleString()}
            </StatNumber>
          </Stat>
          
          <Stat textAlign="center" p="3" bg="blue.50" borderRadius="lg">
            <StatLabel color={textColorSecondary} fontSize="xs">CO₂ Saved</StatLabel>
            <StatNumber color="blue.500" fontSize="lg" fontWeight="bold">
              {department.emissionsSaved}kg
            </StatNumber>
          </Stat>
        </SimpleGrid>
        
        {/* Progress Bar */}
        <VStack spacing="2" align="stretch">
          <HStack justify="space-between">
            <Text color={textColorSecondary} fontSize="sm">Progress to Next Level</Text>
            <Text color={textColor} fontSize="sm" fontWeight="bold">
              {Math.floor((department.entoSaved / 20000) * 100)}%
            </Text>
          </HStack>
          <Progress
            value={(department.entoSaved / 20000) * 100}
            colorScheme="green"
            size="lg"
            borderRadius="full"
            bg="gray.100"
          />
        </VStack>
        
        {/* Team Stats */}
        <HStack justify="space-around" pt="2">
          <VStack spacing="1">
            <Icon as={MdPeople} color={textColorSecondary} w="16px" h="16px" />
            <Text color={textColor} fontSize="sm" fontWeight="bold">
              {department.students}
            </Text>
            <Text color={textColorSecondary} fontSize="xs">Students</Text>
          </VStack>
          
          <VStack spacing="1">
            <Icon as={MdSchool} color={textColorSecondary} w="16px" h="16px" />
            <Text color={textColor} fontSize="sm" fontWeight="bold">
              {department.faculty}
            </Text>
            <Text color={textColorSecondary} fontSize="xs">Faculty</Text>
          </VStack>
          
          <VStack spacing="1">
            <Icon as={MdDiamond} color={textColorSecondary} w="16px" h="16px" />
            <Text color={textColor} fontSize="sm" fontWeight="bold">
              {department.carbonCredits}
            </Text>
            <Text color={textColorSecondary} fontSize="xs">Credits</Text>
          </VStack>
        </HStack>
      </VStack>
    </Card>
  );
};

export default function Leaderboard() {
  // Chakra Color Mode
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = useColorModeValue("gray.500", "gray.400");
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const brandColor = useColorModeValue("brand.500", "white");
  const successColor = useColorModeValue("green.500", "green.300");
  const warningColor = useColorModeValue("orange.500", "orange.300");
  const errorColor = useColorModeValue("red.500", "red.300");
  
  const toast = useToast();
  
  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(5);
  
  // Mock leaderboard data with gamified elements
  const [leaderboardData, setLeaderboardData] = useState([
    {
      id: 1,
      name: "Computer Science Department",
      branch: "Software Engineering",
      entoSaved: 45000,
      emissionsSaved: 4500,
      carbonCredits: 3200,
      students: 450,
      faculty: 35,
      level: 8,
      xp: 45000,
      nextLevelXp: 50000,
    },
    {
      id: 2,
      name: "Environmental Science",
      branch: "Sustainability Studies",
      entoSaved: 42000,
      emissionsSaved: 4200,
      carbonCredits: 3000,
      students: 380,
      faculty: 28,
      level: 7,
      xp: 42000,
      nextLevelXp: 45000,
    },
    {
      id: 3,
      name: "Engineering Department",
      branch: "Green Technology",
      entoSaved: 38000,
      emissionsSaved: 3800,
      carbonCredits: 2800,
      students: 520,
      faculty: 42,
      level: 7,
      xp: 38000,
      nextLevelXp: 42000,
    },
    {
      id: 4,
      name: "Business Administration",
      branch: "Sustainable Business",
      entoSaved: 32000,
      emissionsSaved: 3200,
      carbonCredits: 2400,
      students: 600,
      faculty: 45,
      level: 6,
      xp: 32000,
      nextLevelXp: 38000,
    },
    {
      id: 5,
      name: "Arts & Humanities",
      branch: "Environmental Studies",
      entoSaved: 28000,
      emissionsSaved: 2800,
      carbonCredits: 2000,
      students: 350,
      faculty: 25,
      level: 6,
      xp: 28000,
      nextLevelXp: 32000,
    },
    {
      id: 6,
      name: "Mathematics Department",
      branch: "Data Science",
      entoSaved: 25000,
      emissionsSaved: 2500,
      carbonCredits: 1800,
      students: 300,
      faculty: 22,
      level: 5,
      xp: 25000,
      nextLevelXp: 28000,
    },
  ]);

  const handleRefresh = () => {
    setIsAnimating(true);
    toast({
      title: "Leaderboard Updated!",
      description: "Fresh data loaded with new rankings.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
    
    // Simulate data refresh
    setTimeout(() => {
      setLeaderboardData(prev => 
        prev.map(dept => ({
          ...dept,
          entoSaved: dept.entoSaved + Math.floor(Math.random() * 1000),
          emissionsSaved: dept.emissionsSaved + Math.floor(Math.random() * 100),
        }))
      );
      setIsAnimating(false);
    }, 2000);
  };

  const handleLevelUp = () => {
    setCurrentLevel(prev => prev + 1);
    toast({
      title: "Level Up! 🌱",
      description: "Your department has grown to the next level!",
      status: "success",
      duration: 4000,
      isClosable: true,
    });
  };

  // Calculate total stats
  const totalEntoSaved = leaderboardData.reduce((sum, dept) => sum + dept.entoSaved, 0);
  const totalEmissionsSaved = leaderboardData.reduce((sum, dept) => sum + dept.emissionsSaved, 0);
  const totalStudents = leaderboardData.reduce((sum, dept) => sum + dept.students, 0);
  const totalFaculty = leaderboardData.reduce((sum, dept) => sum + dept.faculty, 0);

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      {/* Header Section */}
      <Flex justify="space-between" align="center" mb="30px">
        <Box>
          <Heading color={textColor} fontSize="4xl" fontWeight="bold" mb="2">
            🏆 Gamified Leaderboard
          </Heading>
          <Text color={textColorSecondary} fontSize="lg">
            Compete, grow, and save the planet together! 🌍
          </Text>
        </Box>
        <HStack spacing="3">
          <Button
            leftIcon={<Icon as={MdAutoAwesome} />}
            colorScheme="purple"
            variant="outline"
            size="sm"
            onClick={handleLevelUp}
          >
            Level Up Tree
          </Button>
          <Button
            leftIcon={<Icon as={MdRefresh} />}
            colorScheme="brand"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isAnimating}
          >
            Refresh
          </Button>
        </HStack>
      </Flex>

      {/* Stats Overview */}
      <SimpleGrid columns={{ base: 2, md: 4 }} gap="20px" mb="30px">
        <Card bg={cardBg} borderColor={borderColor} p="20px">
          <Stat textAlign="center">
            <StatLabel color={textColorSecondary} fontSize="sm">Total ENTO Saved</StatLabel>
            <StatNumber color={successColor} fontSize="2xl" fontWeight="bold">
              {totalEntoSaved.toLocaleString()}
            </StatNumber>
            <StatHelpText color={textColorSecondary}>
              <Icon as={MdTrendingUp} mr="1" />
              +12% this month
            </StatHelpText>
          </Stat>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} p="20px">
          <Stat textAlign="center">
            <StatLabel color={textColorSecondary} fontSize="sm">CO₂ Emissions Saved</StatLabel>
            <StatNumber color={brandColor} fontSize="2xl" fontWeight="bold">
              {totalEmissionsSaved.toLocaleString()}kg
            </StatNumber>
            <StatHelpText color={textColorSecondary}>
              <Icon as={MdEco} mr="1" />
              Planet Impact
            </StatHelpText>
          </Stat>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} p="20px">
          <Stat textAlign="center">
            <StatLabel color={textColorSecondary} fontSize="sm">Total Students</StatLabel>
            <StatNumber color={warningColor} fontSize="2xl" fontWeight="bold">
              {totalStudents.toLocaleString()}
            </StatNumber>
            <StatHelpText color={textColorSecondary}>
              <Icon as={MdPeople} mr="1" />
              Active Members
            </StatHelpText>
          </Stat>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} p="20px">
          <Stat textAlign="center">
            <StatLabel color={textColorSecondary} fontSize="sm">Faculty Members</StatLabel>
            <StatNumber color={errorColor} fontSize="2xl" fontWeight="bold">
              {totalFaculty.toLocaleString()}
            </StatNumber>
            <StatHelpText color={textColorSecondary}>
              <Icon as={MdSchool} mr="1" />
              Mentors
            </StatHelpText>
          </Stat>
        </Card>
      </SimpleGrid>

      {/* Main Leaderboard with Growth Tree */}
      <Card bg={cardBg} borderColor={borderColor} p="30px" mb="30px">
        <CardHeader textAlign="center" mb="30px">
          <Heading size="lg" color={textColor} mb="2">
            🌳 Growth Tree Challenge
          </Heading>
          <Text color={textColorSecondary}>
            Watch your department's tree grow as you save more ENTO tokens!
          </Text>
        </CardHeader>
        
        <SimpleGrid columns={{ base: 1, lg: 3 }} gap="30px" align="center">
          {/* Left Side - Top 3 Departments */}
          <VStack spacing="4" align="stretch">
            <Text color={textColor} fontSize="lg" fontWeight="bold" textAlign="center">
              🥇 Top Performers
            </Text>
            {leaderboardData.slice(0, 3).map((department, index) => (
              <DepartmentCard
                key={department.id}
                department={department}
                rank={index + 1}
                isCurrentUser={department.id === 4} // Business Admin is current user
                isAnimating={isAnimating}
              />
            ))}
          </VStack>
          
          {/* Center - Growth Tree */}
          <Center>
            <VStack spacing="6" align="center">
              <GrowthTree level={currentLevel} isAnimating={isAnimating} />
              
              {/* Tree Stats */}
              <Card bg="green.50" p="20px" borderRadius="20px" w="200px">
                <VStack spacing="3">
                  <Text color="green.600" fontSize="sm" fontWeight="bold">
                    Current Level
                  </Text>
                  <Text color="green.700" fontSize="2xl" fontWeight="bold">
                    {currentLevel}
                  </Text>
                  <Progress
                    value={75}
                    colorScheme="green"
                    size="lg"
                    borderRadius="full"
                    w="100%"
                  />
                  <Text color="green.600" fontSize="xs">
                    75% to Level {currentLevel + 1}
                  </Text>
                </VStack>
              </Card>
              
              {/* Floating Elements */}
              <HStack spacing="4" opacity="0.7">
                <Icon as={MdRocket} w="20px" h="20px" color="blue.400" />
                <Icon as={MdDiamond} w="20px" h="20px" color="purple.400" />
                <Icon as={MdAutoAwesome} w="20px" h="20px" color="pink.400" />
              </HStack>
            </VStack>
          </Center>
          
          {/* Right Side - Other Departments */}
          <VStack spacing="4" align="stretch">
            <Text color={textColor} fontSize="lg" fontWeight="bold" textAlign="center">
              🌱 Growing Strong
            </Text>
            {leaderboardData.slice(3).map((department, index) => (
              <DepartmentCard
                key={department.id}
                department={department}
                rank={index + 4}
                isCurrentUser={department.id === 4}
                isAnimating={isAnimating}
              />
            ))}
          </VStack>
        </SimpleGrid>
      </Card>

      {/* Achievement Section */}
      <Card bg={cardBg} borderColor={borderColor} p="30px">
        <CardHeader textAlign="center">
          <Heading size="lg" color={textColor} mb="2">
            🏅 Recent Achievements
          </Heading>
          <Text color={textColorSecondary}>
            Celebrate your department's milestones!
          </Text>
        </CardHeader>
        
        <SimpleGrid columns={{ base: 1, md: 3 }} gap="20px">
          <Card bg="yellow.50" p="20px" borderRadius="15px" borderColor="yellow.200">
            <HStack spacing="3">
              <Icon as={MdEmojiEvents} w="24px" h="24px" color="yellow.500" />
              <VStack align="start" spacing="1">
                <Text color="yellow.700" fontSize="sm" fontWeight="bold">
                  First Place!
                </Text>
                <Text color="yellow.600" fontSize="xs">
                  Computer Science leads the pack
                </Text>
              </VStack>
            </HStack>
          </Card>
          
          <Card bg="green.50" p="20px" borderRadius="15px" borderColor="green.200">
            <HStack spacing="3">
              <Icon as={MdEco} w="24px" h="24px" color="green.500" />
              <VStack align="start" spacing="1">
                <Text color="green.700" fontSize="sm" fontWeight="bold">
                  Eco Warrior
                </Text>
                <Text color="green.600" fontSize="xs">
                  Environmental Science saving the planet
                </Text>
              </VStack>
            </HStack>
          </Card>
          
          <Card bg="blue.50" p="20px" borderRadius="15px" borderColor="blue.200">
            <HStack spacing="3">
              <Icon as={MdTrendingUp} w="24px" h="24px" color="blue.500" />
              <VStack align="start" spacing="1">
                <Text color="blue.700" fontSize="sm" fontWeight="bold">
                  Rising Star
                </Text>
                <Text color="blue.600" fontSize="xs">
                  Arts & Humanities climbing fast
                </Text>
              </VStack>
            </HStack>
          </Card>
        </SimpleGrid>
      </Card>
    </Box>
  );
}