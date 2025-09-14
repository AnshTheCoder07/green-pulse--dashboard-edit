// frontend/src/views/auth/signUp/index.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  useColorModeValue,
  Alert,
  AlertIcon,
  useToast,
} from "@chakra-ui/react";
import DefaultAuth from "layouts/auth/Default";
import illustration from "assets/img/auth/auth.png";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { RiEyeCloseLine } from "react-icons/ri";
import InstituteSelector from "components/institute/InstituteSelector";
import { useInstitute } from "contexts/InstituteContext";
import { useAuth } from "contexts/AuthContext";

function SignUp() {
  const navigate = useNavigate();
  const toast = useToast();
  const { currentInstitute } = useInstitute();
  const { register, loading } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState([]);
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Chakra color mode
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = "gray.400";
  const textColorDetails = useColorModeValue("navy.700", "secondaryGray.600");
  const textColorBrand = useColorModeValue("brand.500", "white");
  const brandStars = useColorModeValue("brand.500", "brand.400");

  const handleClick = () => setShow(!show);
  const handleClickConfirm = () => setShowConfirm(!showConfirm);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSignUp = async (event) => {
    event.preventDefault();
    setErrors([]);

    // Validation checks
    const validationErrors = [];
    
    if (!currentInstitute) {
      validationErrors.push('Please select an institute first');
    }
    
    if (!agreeToTerms) {
      validationErrors.push('Please agree to the Terms of Service');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const userData = {
        institute: currentInstitute,
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      };

      const response = await register(userData);

      if (response.success) {
        toast({
          title: "Success",
          description: "Account created successfully! Welcome to Green Pulse.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        
        // Redirect to dashboard
        navigate('/admin/dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.errors && Array.isArray(error.errors)) {
        setErrors(error.errors);
      } else if (error.message) {
        setErrors([error.message]);
      } else {
        setErrors(['An unexpected error occurred. Please try again.']);
      }

      toast({
        title: "Registration Failed",
        description: error.message || "Please check your information and try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <DefaultAuth illustrationBackground={illustration} image={illustration}>
      <Box
        maxW={{ base: "100%", md: "max-content" }}
        w="100%"
        mx={{ base: "auto", lg: "0px" }}
        me="auto"
        h="100vh"
        overflowY="auto"
        px={{ base: "25px", md: "0px" }}
        py={{ base: "20px", md: "40px" }}
      >
        <Flex
          alignItems="start"
          justifyContent="center"
          flexDirection="column"
          minH="100%"
        >
          <Box me="auto" mb="20px">
            <Heading color={textColor} fontSize="28px" mb="8px">
              Sign Up
            </Heading>
            <Text
              mb="20px"
              ms="4px"
              color={textColorSecondary}
              fontWeight="400"
              fontSize="md"
            >
              Enter your details to create your account!
            </Text>
          </Box>
          
          <Flex
            zIndex="2"
            direction="column"
            w={{ base: "100%", md: "420px" }}
            maxW="100%"
            background="transparent"
            borderRadius="15px"
            mx={{ base: "auto", lg: "unset" }}
            me="auto"
            mb={{ base: "20px", md: "auto" }}
          >
            {/* Error Messages */}
            {errors.length > 0 && (
              <Alert status="error" mb="20px" borderRadius="15px">
                <AlertIcon />
                <Box>
                  {errors.map((error, index) => (
                    <Text key={index} fontSize="sm">
                      {error}
                    </Text>
                  ))}
                </Box>
              </Alert>
            )}

            {/* Institute Selection */}
            <Box mb="20px">
              <FormLabel
                display="flex"
                ms="4px"
                fontSize="sm"
                fontWeight="500"
                color={textColor}
                mb="8px"
              >
                Institute<Text color={brandStars}>*</Text>
              </FormLabel>
              <InstituteSelector />
            </Box>
            
            {/* FORM STARTS HERE */}
            <form onSubmit={handleSignUp}>
              <FormControl>
                <FormLabel
                  display="flex"
                  ms="4px"
                  fontSize="sm"
                  fontWeight="500"
                  color={textColor}
                  mb="8px"
                >
                  Full Name<Text color={brandStars}>*</Text>
                </FormLabel>
                <Input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  isRequired={true}
                  variant="auth"
                  fontSize="sm"
                  ms={{ base: "0px", md: "0px" }}
                  type="text"
                  placeholder="John Doe"
                  mb="20px"
                  fontWeight="500"
                  size="lg"
                />
                
                <FormLabel
                  display="flex"
                  ms="4px"
                  fontSize="sm"
                  fontWeight="500"
                  color={textColor}
                  mb="8px"
                >
                  Email<Text color={brandStars}>*</Text>
                </FormLabel>
                <Input
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  isRequired={true}
                  variant="auth"
                  fontSize="sm"
                  ms={{ base: "0px", md: "0px" }}
                  type="email"
                  placeholder="mail@greenpulse.com"
                  mb="20px"
                  fontWeight="500"
                  size="lg"
                />
                
                <FormLabel
                  ms="4px"
                  fontSize="sm"
                  fontWeight="500"
                  color={textColor}
                  display="flex"
                >
                  Password<Text color={brandStars}>*</Text>
                </FormLabel>
                <InputGroup size="md">
                  <Input
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    isRequired={true}
                    fontSize="sm"
                    placeholder="Min. 6 characters"
                    mb="20px"
                    size="lg"
                    type={show ? "text" : "password"}
                    variant="auth"
                  />
                  <InputRightElement display="flex" alignItems="center" mt="4px">
                    <Icon
                      color={textColorSecondary}
                      _hover={{ cursor: "pointer" }}
                      as={show ? RiEyeCloseLine : MdOutlineRemoveRedEye}
                      onClick={handleClick}
                    />
                  </InputRightElement>
                </InputGroup>
                
                <FormLabel
                  ms="4px"
                  fontSize="sm"
                  fontWeight="500"
                  color={textColor}
                  display="flex"
                >
                  Confirm Password<Text color={brandStars}>*</Text>
                </FormLabel>
                <InputGroup size="md">
                  <Input
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    isRequired={true}
                    fontSize="sm"
                    placeholder="Confirm your password"
                    mb="20px"
                    size="lg"
                    type={showConfirm ? "text" : "password"}
                    variant="auth"
                  />
                  <InputRightElement display="flex" alignItems="center" mt="4px">
                    <Icon
                      color={textColorSecondary}
                      _hover={{ cursor: "pointer" }}
                      as={showConfirm ? RiEyeCloseLine : MdOutlineRemoveRedEye}
                      onClick={handleClickConfirm}
                    />
                  </InputRightElement>
                </InputGroup>
                
                <Flex justifyContent="space-between" align="center" mb="20px">
                  <FormControl display="flex" alignItems="center">
                    <Checkbox
                      id="terms-checkbox"
                      colorScheme="brandScheme"
                      me="10px"
                      isChecked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      isRequired={true}
                    />
                    <FormLabel
                      htmlFor="terms-checkbox"
                      mb="0"
                      fontWeight="normal"
                      color={textColor}
                      fontSize="sm"
                    >
                      I agree to the Terms of Service
                    </FormLabel>
                  </FormControl>
                </Flex>
                
                <Button
                  type="submit"
                  isLoading={loading}
                  loadingText="Creating Account..."
                  fontSize="sm"
                  variant="brand"
                  fontWeight="500"
                  w="100%"
                  h="50"
                  mb="20px"
                >
                  Create Account
                </Button>
              </FormControl>
            </form>
            {/* FORM ENDS HERE */}
            
            <Flex
              flexDirection="column"
              justifyContent="center"
              alignItems="start"
              maxW="100%"
              mt="0px"
            >
              <Text color={textColorDetails} fontWeight="400" fontSize="14px">
                Already have an account?
                <NavLink to="/auth/sign-in">
                  <Text
                    color={textColorBrand}
                    as="span"
                    ms="5px"
                    fontWeight="500"
                  >
                    Sign In
                  </Text>
                </NavLink>
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Box>
    </DefaultAuth>
  );
}

export default SignUp;