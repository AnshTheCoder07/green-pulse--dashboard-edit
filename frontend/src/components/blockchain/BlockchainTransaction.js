import React, { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  VStack,
  HStack,
  Badge,
  Icon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { MdBlockchain, MdCheckCircle, MdError } from 'react-icons/md';
import { useCarbon } from 'contexts/CarbonContext';

export default function BlockchainTransaction({ transaction, onClose }) {
  const { isOpen, onOpen, onClose: onModalClose } = useDisclosure();
  const [blockchainStatus, setBlockchainStatus] = useState('pending');
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const cardBg = useColorModeValue('white', 'navy.700');
  const borderColor = useColorModeValue('secondaryGray.200', 'whiteAlpha.100');

  React.useEffect(() => {
    if (transaction) {
      onOpen();
      submitToBlockchain();
    }
  }, [transaction]);

  const submitToBlockchain = async () => {
    try {
      setBlockchainStatus('processing');
      
      // Simulate blockchain submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful transaction
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      setTxHash(mockTxHash);
      setBlockchainStatus('success');
    } catch (err) {
      setError(err.message);
      setBlockchainStatus('error');
    }
  };

  const handleClose = () => {
    onModalClose();
    if (onClose) onClose();
  };

  const getStatusColor = () => {
    switch (blockchainStatus) {
      case 'success': return 'green';
      case 'error': return 'red';
      case 'processing': return 'blue';
      default: return 'gray';
    }
  };

  const getStatusIcon = () => {
    switch (blockchainStatus) {
      case 'success': return MdCheckCircle;
      case 'error': return MdError;
      case 'processing': return MdBlockchain;
      default: return MdBlockchain;
    }
  };

  const getStatusText = () => {
    switch (blockchainStatus) {
      case 'success': return 'Transaction Confirmed';
      case 'error': return 'Transaction Failed';
      case 'processing': return 'Processing...';
      default: return 'Pending';
    }
  };

  if (!transaction) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent bg={cardBg}>
        <ModalHeader>
          <Flex align="center">
            <Icon as={MdBlockchain} w="24px" h="24px" me="8px" color="blue.500" />
            <Text color={textColor} fontSize="lg" fontWeight="700">
              Blockchain Transaction
            </Text>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb="24px">
          <VStack spacing="20px" align="stretch">
            {/* Transaction Details */}
            <Box p="16px" border="1px solid" borderColor={borderColor} borderRadius="12px">
              <Text color={textColor} fontSize="sm" fontWeight="600" mb="12px">
                Transaction Details
              </Text>
              <VStack spacing="8px" align="stretch">
                <HStack justify="space-between">
                  <Text color="secondaryGray.600" fontSize="sm">Type:</Text>
                  <Badge colorScheme="blue" variant="subtle">
                    {transaction.type.replace('_', ' ').toUpperCase()}
                  </Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text color="secondaryGray.600" fontSize="sm">Amount:</Text>
                  <Text color={textColor} fontSize="sm" fontWeight="600">
                    {transaction.amount} ENTO
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text color="secondaryGray.600" fontSize="sm">Description:</Text>
                  <Text color={textColor} fontSize="sm" fontWeight="600">
                    {transaction.description}
                  </Text>
                </HStack>
                {transaction.building && (
                  <HStack justify="space-between">
                    <Text color="secondaryGray.600" fontSize="sm">Building:</Text>
                    <Text color={textColor} fontSize="sm" fontWeight="600">
                      {transaction.building}
                    </Text>
                  </HStack>
                )}
              </VStack>
            </Box>

            {/* Blockchain Status */}
            <Box p="16px" border="1px solid" borderColor={borderColor} borderRadius="12px">
              <Flex align="center" mb="12px">
                <Icon as={getStatusIcon()} w="20px" h="20px" me="8px" color={`${getStatusColor()}.500`} />
                <Text color={textColor} fontSize="sm" fontWeight="600">
                  Blockchain Status
                </Text>
              </Flex>
              
              {blockchainStatus === 'success' && (
                <Alert status="success" borderRadius="8px">
                  <AlertIcon />
                  <Box>
                    <AlertTitle fontSize="sm">Transaction Confirmed!</AlertTitle>
                    <AlertDescription fontSize="xs">
                      Transaction hash: {txHash}
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              {blockchainStatus === 'error' && (
                <Alert status="error" borderRadius="8px">
                  <AlertIcon />
                  <Box>
                    <AlertTitle fontSize="sm">Transaction Failed</AlertTitle>
                    <AlertDescription fontSize="xs">
                      {error || 'An error occurred during blockchain submission'}
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              {blockchainStatus === 'processing' && (
                <Alert status="info" borderRadius="8px">
                  <AlertIcon />
                  <Box>
                    <AlertTitle fontSize="sm">Processing Transaction</AlertTitle>
                    <AlertDescription fontSize="xs">
                      Submitting to blockchain network...
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              <Text color="secondaryGray.600" fontSize="xs" mt="8px">
                Status: <Badge colorScheme={getStatusColor()} variant="subtle">{getStatusText()}</Badge>
              </Text>
            </Box>

            {/* Action Buttons */}
            <Flex justify="flex-end" pt="8px">
              <Button
                size="sm"
                colorScheme={blockchainStatus === 'success' ? 'green' : 'blue'}
                onClick={handleClose}
                isDisabled={blockchainStatus === 'processing'}
              >
                {blockchainStatus === 'success' ? 'Done' : 'Close'}
              </Button>
            </Flex>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}






