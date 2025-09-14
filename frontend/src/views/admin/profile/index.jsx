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
  Avatar,
  Badge,
  VStack,
  HStack,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Image,
  useToast,
  Textarea,
  Input,
  InputGroup,
  InputLeftElement,
} from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import {
  MdPerson,
  MdWork,
  MdEmail,
  MdPhone,
  MdLocationOn,
  MdEdit,
  MdSave,
  MdCancel,
  MdAccountBalanceWallet,
  MdEco,
  MdTrendingUp,
  MdRefresh,
  MdStar,
  MdLocalFireDepartment,
  MdPublic,
  MdSchedule,
  MdCheckCircle,
  MdCamera,
  MdSchool,
  MdBusiness,
} from "react-icons/md";

// Assets
import banner from "assets/img/auth/banner.png";
import avatar from "assets/img/avatars/avatarSimmmple.png";

// Import Auth Context and Service
import { useAuth } from "contexts/AuthContext";
import authService from "services/authService";

export default function ProfilePage() {
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
  const { user, updateUserData } = useAuth();

  // Personal Information State
  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    department: "",
    branch: "",
    position: "",
    email: "",
    phone: "",
    location: "",
    education: "",
    joinDate: "",
    employeeId: "",
    manager: "",
    team: "",
    bio: "",
  });

  // Department & ENTO Statistics
  const [departmentStats, setDepartmentStats] = useState({
    departmentName: "",
    branch: "",
    entoSaved: 15400,
    entoCount: 12500,
    carbonCredits: 1250,
    co2Saved: 1540,
    rank: 4,
    totalMembers: 450,
    activeMembers: 320,
  });

  // Savings Data for Last One Year
  const [savingsData, setSavingsData] = useState([
    { month: "Jan", entoSaved: 1200, co2Saved: 120 },
    { month: "Feb", entoSaved: 1350, co2Saved: 135 },
    { month: "Mar", entoSaved: 1100, co2Saved: 110 },
    { month: "Apr", entoSaved: 1450, co2Saved: 145 },
    { month: "May", entoSaved: 1600, co2Saved: 160 },
    { month: "Jun", entoSaved: 1750, co2Saved: 175 },
    { month: "Jul", entoSaved: 1900, co2Saved: 190 },
    { month: "Aug", entoSaved: 2100, co2Saved: 210 },
    { month: "Sep", entoSaved: 1850, co2Saved: 185 },
    { month: "Oct", entoSaved: 2000, co2Saved: 200 },
    { month: "Nov", entoSaved: 2200, co2Saved: 220 },
    { month: "Dec", entoSaved: 2400, co2Saved: 240 },
  ]);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    position: '',
    department: '',
    branch: '',
    bio: '',
    email: '',
    education: '',
    location: ''
  });
  const [postText, setPostText] = useState("");

  // Load user data on component mount
  useEffect(() => {
    const loadUserData = async () => {
      // First, try to load from localStorage
      const savedProfileData = localStorage.getItem('profileData');
      const savedDeptStats = localStorage.getItem('departmentStats');

      if (savedProfileData) {
        const profileData = JSON.parse(savedProfileData);
        setPersonalInfo(profileData);
        setEditData(profileData);
      }

      if (savedDeptStats) {
        setDepartmentStats(JSON.parse(savedDeptStats));
      }

      // Then, try to get fresh data from server only once
      try {
        const response = await authService.getProfile();
        if (response.success) {
          const userData = response.data;
          const updatedInfo = {
            name: userData.fullName || '',
            position: userData.position || 'Student',
            department: userData.department || '',
            branch: userData.branch || '',
            bio: userData.bio || '',
            email: userData.email || '',
            education: userData.education || '',
            location: userData.location || '',
            // Keep other fields
            phone: "+1 (555) 123-4567",
            employeeId: "GP-2022-001",
            manager: "Dr. Sarah Chen",
            team: "Carbon Analytics Team",
            joinDate: "2022-03-15"
          };

          setPersonalInfo(updatedInfo);
          setEditData(updatedInfo);
          localStorage.setItem('profileData', JSON.stringify(updatedInfo));

          const updatedDeptStats = {
            departmentName: userData.department || '',
            branch: userData.branch || '',
            entoSaved: 15400,
            entoCount: 12500,
            carbonCredits: 1250,
            co2Saved: 1540,
            rank: 4,
            totalMembers: 450,
            activeMembers: 320,
          };
          setDepartmentStats(updatedDeptStats);
          localStorage.setItem('departmentStats', JSON.stringify(updatedDeptStats));

          // Update global context
          updateUserData(userData);
        }
      } catch (error) {
        console.error('Error loading fresh data:', error);
        // Fall back to user context data if available
        if (user && !savedProfileData) {
          const fallbackInfo = {
            name: user.fullName || '',
            position: user.position || '',
            department: user.department || '',
            branch: user.branch || '',
            bio: user.bio || '',
            email: user.email || '',
            education: user.education || '',
            location: user.location || '',
            phone: "+1 (555) 123-4567",
            employeeId: "GP-2022-001",
            manager: "Dr. Sarah Chen",
            team: "Carbon Analytics Team",
            joinDate: "2022-03-15"
          };
          setPersonalInfo(fallbackInfo);
          setEditData(fallbackInfo);
        }
      }
    };

    loadUserData();
  }, []); // Remove dependencies to prevent infinite loops

  // Sync editData with personalInfo when not editing
  useEffect(() => {
    if (!isEditing && personalInfo.name) {
      setEditData({
        name: personalInfo.name || '',
        position: personalInfo.position || '',
        department: personalInfo.department || '',
        branch: personalInfo.branch || '',
        bio: personalInfo.bio || '',
        email: personalInfo.email || '',
        education: personalInfo.education || '',
        location: personalInfo.location || ''
      });
    }
  }, [personalInfo, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
    // Properly set editData with current personalInfo values
    setEditData({
      name: personalInfo.name || '',
      position: personalInfo.position || '',
      department: personalInfo.department || '',
      branch: personalInfo.branch || '',
      bio: personalInfo.bio || '',
      email: personalInfo.email || '',
      education: personalInfo.education || '',
      location: personalInfo.location || ''
    });
  };

  const handleSave = async () => {
    try {
      const updateData = {
        fullName: editData.name,
        position: editData.position,
        department: editData.department,
        branch: editData.branch,
        bio: editData.bio,
        email: editData.email,
        education: editData.education,
        location: editData.location
      };

      const response = await authService.updateProfile(updateData);
      
      if (response.success) {
        // Update local state and localStorage for persistence
        const updatedPersonalInfo = {
          ...personalInfo,
          name: updateData.fullName,
          position: updateData.position,
          department: updateData.department,
          branch: updateData.branch,
          bio: updateData.bio,
          email: updateData.email,
          education: updateData.education,
          location: updateData.location
        };

        setPersonalInfo(updatedPersonalInfo);
        localStorage.setItem('profileData', JSON.stringify(updatedPersonalInfo));

        // Update department stats
        const updatedDeptStats = {
          ...departmentStats,
          departmentName: updateData.department,
          branch: updateData.branch
        };
        
        setDepartmentStats(updatedDeptStats);
        localStorage.setItem('departmentStats', JSON.stringify(updatedDeptStats));
        
        setIsEditing(false);
        toast({
          title: "Profile Updated",
          description: "Your profile information has been saved successfully.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        // Update global context
        updateUserData(response.data);
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Properly reset editData to current personalInfo values
    setEditData({
      name: personalInfo.name || '',
      position: personalInfo.position || '',
      department: personalInfo.department || '',
      branch: personalInfo.branch || '',
      bio: personalInfo.bio || '',
      email: personalInfo.email || '',
      education: personalInfo.education || '',
      location: personalInfo.location || ''
    });
  };

  const handlePost = () => {
    if (postText.trim()) {
      toast({
        title: "Post Published",
        description: "Your post has been published successfully.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setPostText("");
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Add this refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await authService.getProfile();
      if (response.success) {
        const userData = response.data;
        const updatedInfo = {
          name: userData.fullName || '',
          position: userData.position || 'Student',
          department: userData.department || '',
          branch: userData.branch || '',
          bio: userData.bio || '',
          email: userData.email || '',
          education: userData.education || '',
          location: userData.location || '',
          // Keep other fields
          phone: "+1 (555) 123-4567",
          employeeId: "GP-2022-001",
          manager: "Dr. Sarah Chen",
          team: "Carbon Analytics Team",
          joinDate: "2022-03-15"
        };

        setPersonalInfo(updatedInfo);
        setEditData(updatedInfo);
        localStorage.setItem('profileData', JSON.stringify(updatedInfo));

        const updatedDeptStats = {
          departmentName: userData.department || '',
          branch: userData.branch || '',
          entoSaved: 15400,
          entoCount: 12500,
          carbonCredits: 1250,
          co2Saved: 1540,
          rank: 4,
          totalMembers: 450,
          activeMembers: 320,
        };
        setDepartmentStats(updatedDeptStats);
        localStorage.setItem('departmentStats', JSON.stringify(updatedDeptStats));

        // Update global context
        updateUserData(userData);
        
        // Notify navbar of update
        window.dispatchEvent(new CustomEvent('profileUpdated'));

        toast({
          title: "Profile Refreshed",
          description: "Your profile data has been updated from server.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh profile data.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      {/* Header Section */}
      <Flex justify="space-between" align="center" mb="30px">
        <Box>
          <Heading color={textColor} fontSize="2xl" fontWeight="bold">
            Profile Information
          </Heading>
          <Text color={textColorSecondary} fontSize="md">
            Dashboard / Users / {personalInfo.name}
          </Text>
        </Box>
        <Flex gap="10px">
          <Button
            leftIcon={<Icon as={MdRefresh} />}
            colorScheme="brand"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
            loadingText="Refreshing..."
          >
            Refresh
          </Button>
          {!isEditing ? (
            <Button
              leftIcon={<Icon as={MdEdit} />}
              colorScheme="brand"
              size="sm"
              onClick={handleEdit}
            >
              Edit Profile
            </Button>
          ) : (
            <HStack>
              <Button
                leftIcon={<Icon as={MdCancel} />}
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                leftIcon={<Icon as={MdSave} />}
                colorScheme="brand"
                size="sm"
                onClick={handleSave}
              >
                Save
              </Button>
            </HStack>
          )}
        </Flex>
      </Flex>

      {/* Profile Banner Card */}
      <Card bg={cardBg} mb="30px" borderColor={borderColor} overflow="hidden">
        <Box
          h="250px"
          bgImage={`url(${banner})`}
          bgSize="cover"
          bgPosition="center"
          position="relative"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <VStack spacing="4" textAlign="center">
            <Avatar
              size="2xl"
              name={personalInfo.name}
              src={avatar}
              border="4px solid"
              borderColor="white"
            />
            <VStack spacing="2">
              <Heading color="white" fontSize="2xl" textShadow="2px 2px 4px rgba(0,0,0,0.5)">
                {isEditing ? (
                  <input
                    value={editData.name}
                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                    style={{
                      background: 'rgba(255,255,255,0.9)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      color: textColor,
                      fontSize: '24px',
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}
                  />
                ) : (
                  personalInfo.name
                )}
              </Heading>
              <Text color="white" fontSize="lg" textShadow="1px 1px 2px rgba(0,0,0,0.5)">
                {isEditing ? (
                  <input
                    value={editData.position}
                    onChange={(e) => setEditData({...editData, position: e.target.value})}
                    style={{
                      background: 'rgba(255,255,255,0.9)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      color: textColorSecondary,
                      fontSize: '18px',
                      textAlign: 'center'
                    }}
                  />
                ) : (
                  personalInfo.position
                )}
              </Text>
            </VStack>
          </VStack>
        </Box>
        
        <CardBody p="30px">
          {/* Department Statistics */}
          <SimpleGrid columns={{ base: 2, md: 4 }} gap="20px" mb="30px">
            <Stat textAlign="center">
              <StatLabel color={textColorSecondary} fontSize="sm">Department</StatLabel>
              <StatNumber color={textColor} fontSize="lg">
                {isEditing ? (
                  <input
                    value={editData.department}
                    onChange={(e) => setEditData({...editData, department: e.target.value})}
                    style={{
                      background: 'transparent',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      color: textColor,
                      width: '100%',
                      textAlign: 'center'
                    }}
                  />
                ) : (
                  departmentStats.departmentName
                )}
              </StatNumber>
            </Stat>
            
            <Stat textAlign="center">
              <StatLabel color={textColorSecondary} fontSize="sm">Branch</StatLabel>
              <StatNumber color={textColor} fontSize="lg">
                {isEditing ? (
                  <input
                    value={editData.branch}
                    onChange={(e) => setEditData({...editData, branch: e.target.value})}
                    style={{
                      background: 'transparent',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      color: textColor,
                      width: '100%',
                      textAlign: 'center'
                    }}
                  />
                ) : (
                  departmentStats.branch
                )}
              </StatNumber>
            </Stat>
            
            <Stat textAlign="center">
              <StatLabel color={textColorSecondary} fontSize="sm">ENTO Saved</StatLabel>
              <StatNumber color={successColor} fontSize="lg">
                {departmentStats.entoSaved.toLocaleString()}
              </StatNumber>
            </Stat>
            
            <Stat textAlign="center">
              <StatLabel color={textColorSecondary} fontSize="sm">ENTO Count</StatLabel>
              <StatNumber color={brandColor} fontSize="lg">
                {departmentStats.entoCount.toLocaleString()}
              </StatNumber>
            </Stat>
          </SimpleGrid>

          {/* Profile Content */}
          <Box px="0" py="30px">
                <SimpleGrid columns={{ base: 1, lg: 2 }} gap="30px">
                  {/* About Me Section */}
                  <Card bg={cardBg} borderColor={borderColor}>
                    <CardHeader>
                      <Heading size="md" color={textColor}>
                        About Me
                      </Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing="4" align="stretch">
                        <Text color={textColor} lineHeight="1.6">
                          {isEditing ? (
                            <textarea
                              value={editData.bio}
                              onChange={(e) => setEditData({...editData, bio: e.target.value})}
                              style={{
                                background: 'transparent',
                                border: '1px solid #e2e8f0',
                                borderRadius: '4px',
                                padding: '8px',
                                color: textColor,
                                width: '100%',
                                minHeight: '100px',
                                resize: 'vertical'
                              }}
                            />
                          ) : (
                            personalInfo.bio
                          )}
                        </Text>
                        
                        <VStack spacing="3" align="stretch">
                          <HStack>
                            <Icon as={MdWork} color={textColorSecondary} w="20px" h="20px" />
                            <Text color={textColorSecondary} minW="100px">Position:</Text>
                            {isEditing ? (
                              <input
                                value={editData.position}
                                onChange={(e) => setEditData({...editData, position: e.target.value})}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  color: textColor,
                                  flex: 1
                                }}
                              />
                            ) : (
                              <Text color={textColor}>{personalInfo.position}</Text>
                            )}
                          </HStack>
                          
                          <HStack>
                            <Icon as={MdEmail} color={textColorSecondary} w="20px" h="20px" />
                            <Text color={textColorSecondary} minW="100px">Email:</Text>
                            {isEditing ? (
                              <input
                                value={editData.email}
                                onChange={(e) => setEditData({...editData, email: e.target.value})}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  color: textColor,
                                  flex: 1
                                }}
                              />
                            ) : (
                              <Text color={textColor}>{personalInfo.email}</Text>
                            )}
                          </HStack>
                          
                          <HStack>
                            <Icon as={MdSchool} color={textColorSecondary} w="20px" h="20px" />
                            <Text color={textColorSecondary} minW="100px">Education:</Text>
                            {isEditing ? (
                              <input
                                value={editData.education}
                                onChange={(e) => setEditData({...editData, education: e.target.value})}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  color: textColor,
                                  flex: 1
                                }}
                              />
                            ) : (
                              <Text color={textColor}>{personalInfo.education}</Text>
                            )}
                          </HStack>
                          
                          <HStack>
                            <Icon as={MdLocationOn} color={textColorSecondary} w="20px" h="20px" />
                            <Text color={textColorSecondary} minW="100px">Location:</Text>
                            {isEditing ? (
                              <input
                                value={editData.location}
                                onChange={(e) => setEditData({...editData, location: e.target.value})}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  color: textColor,
                                  flex: 1
                                }}
                              />
                            ) : (
                              <Text color={textColor}>{personalInfo.location}</Text>
                            )}
                          </HStack>
                        </VStack>

                        {/* Post Section */}
                        <Divider my="4" />
                        <VStack spacing="3" align="stretch">
                          <Text color={textColorSecondary} fontSize="sm" fontWeight="500">
                            What you are thinking...
                          </Text>
                          <Textarea
                            value={postText}
                            onChange={(e) => setPostText(e.target.value)}
                            placeholder="Share your thoughts..."
                            resize="vertical"
                            minH="80px"
                          />
                          <Flex justify="space-between" align="center">
                            <Icon as={MdCamera} color={textColorSecondary} w="20px" h="20px" />
                            <Button
                              colorScheme="brand"
                              size="sm"
                              onClick={handlePost}
                              isDisabled={!postText.trim()}
                            >
                              Post
                            </Button>
                          </Flex>
                        </VStack>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Savings Graph Section */}
                  <Card bg={cardBg} borderColor={borderColor}>
                    <CardHeader>
                      <HStack>
                        <Icon as={MdTrendingUp} color={brandColor} w="24px" h="24px" />
                        <Heading size="md" color={textColor}>
                          Last One Year Savings
                        </Heading>
                      </HStack>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing="6" align="stretch">
                        {/* Summary Stats */}
                        <SimpleGrid columns={2} gap="4">
                          <Stat textAlign="center" p="4" bg="green.50" borderRadius="lg">
                            <StatLabel color={textColorSecondary} fontSize="sm">Total ENTO Saved</StatLabel>
                            <StatNumber color={successColor} fontSize="xl">
                              {savingsData.reduce((sum, item) => sum + item.entoSaved, 0).toLocaleString()}
                            </StatNumber>
                          </Stat>
                          <Stat textAlign="center" p="4" bg="blue.50" borderRadius="lg">
                            <StatLabel color={textColorSecondary} fontSize="sm">Total CO₂ Saved</StatLabel>
                            <StatNumber color={brandColor} fontSize="xl">
                              {savingsData.reduce((sum, item) => sum + item.co2Saved, 0).toLocaleString()} kg
                            </StatNumber>
                          </Stat>
                        </SimpleGrid>

                        {/* Simple Bar Chart */}
                        <Box>
                          <Text color={textColorSecondary} fontSize="sm" mb="4" textAlign="center">
                            Monthly ENTO Savings Trend
                          </Text>
                          <HStack spacing="2" align="end" h="120px" justify="center">
                            {savingsData.map((item, index) => {
                              const maxValue = Math.max(...savingsData.map(d => d.entoSaved));
                              const height = (item.entoSaved / maxValue) * 100;
                              const isCurrentMonth = index === savingsData.length - 1;
                              
                              return (
                                <VStack key={item.month} spacing="1" flex="1">
                                  <Box
                                    bg={isCurrentMonth ? brandColor : successColor}
                                    h={`${height}px`}
                                    w="100%"
                                    borderRadius="4px 4px 0 0"
                                    minH="4px"
                                    transition="all 0.3s ease"
                                    _hover={{
                                      bg: isCurrentMonth ? "brand.600" : "green.600",
                                      transform: "scale(1.05)"
                                    }}
                                  />
                                  <Text color={textColorSecondary} fontSize="xs" fontWeight="bold">
                                    {item.month}
                                  </Text>
                                  <Text color={textColor} fontSize="xs" fontWeight="bold">
                                    {item.entoSaved}
                                  </Text>
                                </VStack>
                              );
                            })}
                          </HStack>
                        </Box>

                        {/* Monthly Breakdown */}
                        <Box>
                          <Text color={textColorSecondary} fontSize="sm" mb="3" fontWeight="500">
                            Monthly Breakdown
                          </Text>
                          <VStack spacing="2" align="stretch" maxH="200px" overflowY="auto">
                            {savingsData.slice(-6).reverse().map((item, index) => (
                              <HStack key={item.month} justify="space-between" p="2" bg="gray.50" borderRadius="md">
                                <Text color={textColor} fontSize="sm" fontWeight="500">
                                  {item.month}
                                </Text>
                                <HStack spacing="4">
                                  <Text color={successColor} fontSize="sm" fontWeight="bold">
                                    {item.entoSaved} ENTO
                                  </Text>
                                  <Text color={brandColor} fontSize="sm" fontWeight="bold">
                                    {item.co2Saved} kg CO₂
                                  </Text>
                                </HStack>
                              </HStack>
                            ))}
                          </VStack>
                        </Box>

                        {/* Growth Indicator */}
                        <HStack justify="center" p="3" bg="green.50" borderRadius="lg">
                          <Icon as={MdTrendingUp} color={successColor} w="20px" h="20px" />
                          <Text color={textColor} fontSize="sm" fontWeight="bold">
                            {((savingsData[savingsData.length - 1].entoSaved - savingsData[0].entoSaved) / savingsData[0].entoSaved * 100).toFixed(1)}% 
                            Growth This Year
                          </Text>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                </SimpleGrid>
          </Box>
        </CardBody>
      </Card>
    </Box>
  );
}