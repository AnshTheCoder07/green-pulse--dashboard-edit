// components/institute/InstituteSelector.jsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  VStack,
  HStack,
  Text,
  Badge,
  useColorModeValue,
  SimpleGrid,
  Icon,
  Divider,
  Spinner,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { MdSchool, MdLocationOn, MdPeople, MdBusiness, MdEnergySavingsLeaf, MdExpandMore } from 'react-icons/md';
import { useInstitute } from 'contexts/InstituteContext';

const InstituteSelector = ({ onSelect, isSignUp = false }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { institutes, currentInstitute, selectInstitute, loading, error } = useInstitute();
  const [selectedInstitute, setSelectedInstitute] = useState(null);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  const handleInstituteSelect = (institute) => {
    setSelectedInstitute(institute);
  };

  const handleConfirmSelection = () => {
    if (selectedInstitute) {
      selectInstitute(selectedInstitute.id);
      if (onSelect) {
        onSelect(selectedInstitute);
      }
      onClose();
    }
  };

  const InstituteCard = ({ institute, isSelected, onClick }) => (
    <Box
      p={4}
      borderWidth={2}
      borderColor={isSelected ? 'green.500' : borderColor}
      borderRadius="lg"
      bg={cardBg}
      cursor="pointer"
      _hover={{ bg: hoverBg }}
      onClick={onClick}
      transition="all 0.2s"
    >
      <VStack align="start" spacing={3}>
        <HStack justify="space-between" w="100%">
          <HStack>
            <Icon as={MdSchool} w={6} h={6} color="green.500" />
            <Text fontSize="lg" fontWeight="bold">
              {institute.name}
            </Text>
          </HStack>
          <Badge colorScheme="green" variant="subtle">
            {institute.campusId}
          </Badge>
        </HStack>

        <HStack>
          <Icon as={MdLocationOn} w={4} h={4} color="gray.500" />
          <Text fontSize="sm" color="gray.600">
            {institute.location}
          </Text>
        </HStack>

        <SimpleGrid columns={2} spacing={4} w="100%">
          <HStack>
            <Icon as={MdBusiness} w={4} h={4} color="blue.500" />
            <Text fontSize="sm">
              {institute.totalBuildings} Buildings
            </Text>
          </HStack>
          <HStack>
            <Icon as={MdPeople} w={4} h={4} color="purple.500" />
            <Text fontSize="sm">
              {institute.totalStudents?.toLocaleString()} Students
            </Text>
          </HStack>
        </SimpleGrid>

        <HStack>
          <Icon as={MdEnergySavingsLeaf} w={4} h={4} color="green.500" />
          <Text fontSize="sm" color="green.600">
            {institute.energyCapacity?.toLocaleString()} kWh capacity
          </Text>
        </HStack>

        <Text fontSize="xs" color="gray.500">
          Established: {institute.established}
        </Text>
      </VStack>
    </Box>
  );

  if (loading) {
    return (
      <Button
        isLoading
        loadingText="Loading Institutes..."
        variant="outline"
        size="lg"
        w="100%"
        leftIcon={<MdSchool />}
      >
        Loading...
      </Button>
    );
  }

  if (error) {
    return (
      <Button
        variant="outline"
        leftIcon={<MdSchool />}
        size="lg"
        w="100%"
        justifyContent="flex-start"
        colorScheme="red"
        onClick={() => window.location.reload()}
      >
        Error loading institutes - Click to retry
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={onOpen}
        variant="outline"
        leftIcon={<MdSchool />}
        rightIcon={<MdExpandMore />}
        size="lg"
        w="100%"
        justifyContent="space-between"
        textAlign="left"
      >
        <Box flex="1" textAlign="left">
          <Text
            isTruncated
            maxW="300px" // Adjust this width as needed
            fontSize="md"
          >
            {currentInstitute ? currentInstitute.name : 'Select Institute'}
          </Text>
          {currentInstitute && (
            <Text fontSize="xs" color="gray.500" isTruncated>
              {currentInstitute.location} • {currentInstitute.campusId}
            </Text>
          )}
        </Box>
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Icon as={MdSchool} w={6} h={6} color="green.500" />
              <Text>Select Your Institute</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {isSignUp && (
              <Box mb={4} p={4} bg="blue.50" borderRadius="md">
                <Text fontSize="sm" color="blue.700">
                  <strong>Note:</strong> You can only select your institute once during sign up. 
                  This selection cannot be changed later.
                </Text>
              </Box>
            )}

            {institutes.length === 0 && !loading && (
              <Box textAlign="center" py={8}>
                <Icon as={MdSchool} w={12} h={12} color="gray.400" />
                <Text mt={4} color="gray.600">
                  No institutes available
                </Text>
                <Button mt={4} onClick={() => window.location.reload()}>
                  Refresh
                </Button>
              </Box>
            )}

            {institutes.length > 0 && (
              <VStack spacing={4} align="stretch">
                {institutes.map((institute) => (
                  <InstituteCard
                    key={institute.id}
                    institute={institute}
                    isSelected={selectedInstitute?.id === institute.id}
                    onClick={() => handleInstituteSelect(institute)}
                  />
                ))}
              </VStack>
            )}

            <Divider my={4} />

            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.600">
                {institutes.length} institutes available
              </Text>
              <HStack>
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  colorScheme="green"
                  onClick={handleConfirmSelection}
                  isDisabled={!selectedInstitute}
                >
                  {isSignUp ? 'Continue with Sign Up' : 'Select Institute'}
                </Button>
              </HStack>
            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default InstituteSelector;
