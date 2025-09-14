// frontend/src/views/auth/signIn/index.jsx
import React, { useState, useEffect } from "react";
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

function SignIn() {
  const navigate = useNavigate();
  const toast = useToast();
  
  // Destructure ALL context values (this was the main issue)
  const {
    currentInstitute,
    institutes,
    loading: instituteLoading,
    error: instituteError
  } = useInstitute();
  
  const { login, loading } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState([]);
  const [show, setShow] = useState(false);

  // Chakra color mode
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = "gray.400";
  const textColorDetails = useColorModeValue("navy.700", "secondaryGray.600");
  const textColorBrand = useColorModeValue("brand.500", "white");
  const brandStars = useColorModeValue("brand.500", "brand.400");

  const handleClick = () => setShow(!show);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSignIn = async (event) => {
    event.preventDefault();
    setErrors([]);

    if (!currentInstitute) {
      setErrors(['Please select an institute first']);
      return;
    }

    try {
      const credentials = {
        email: formData.email,
        password: formData.password,
        institute: currentInstitute
      };

      const response = await login(credentials);

      if (response.success) {
        toast({
          title: "Success",
          description: "Login successful! Welcome back.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        navigate('/admin/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);

      if (error.errors && Array.isArray(error.errors)) {
        setErrors(error.errors);
      } else if (error.message) {
        setErrors([error.message]);
      } else {
        setErrors(['An unexpected error occurred. Please try again.']);
      }

      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials and try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Debug logging to help troubleshoot
  useEffect(() => {
    console.log("🏫 SignIn Debug:");
    console.log("  - Institutes:", institutes);
    console.log("  - Institutes length:", institutes?.length);
    console.log("  - Loading:", instituteLoading);
    console.log("  - Error:", instituteError);
    console.log("  - Current Institute:", currentInstitute);
  }, [institutes, instituteLoading, instituteError, currentInstitute]);

  // Handle loading state
  if (instituteLoading) {
    return (
      <DefaultAuth illustrationBackground={illustration} image={illustration}>
        <Flex justify="center" align="center" height="50vh">
          <Text>Loading institutes...</Text>
        </Flex>
      </DefaultAuth>
    );
  }

  // Handle error state
  if (instituteError) {
    return (
      <DefaultAuth illustrationBackground={illustration} image={illustration}>
        <Flex justify="center" align="center" height="50vh" flexDirection="column">
          <Alert status="error" mb="20px">
            <AlertIcon />
            Failed to load institutes: {instituteError}
          </Alert>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </Flex>
      </DefaultAuth>
    );
  }

  return (
    <DefaultAuth illustrationBackground={illustration} image={illustration}>
      <Flex
        maxW={{ base: "100%", md: "max-content" }}
        w="100%"
        mx={{ base: "auto", lg: "0px" }}
        me="auto"
        h="100%"
        alignItems="start"
        justifyContent="center"
        mb={{ base: "30px", md: "60px" }}
        px={{ base: "25px", md: "0px" }}
        mt={{ base: "40px", md: "14vh" }}
        flexDirection="column"
      >
        {/* Debug info (only shows in development) */}
        {process.env.NODE_ENV === 'development' && (
          <Box mb="10px" p="10px" bg="gray.100" borderRadius="md" fontSize="sm">
            <Text>Debug: {institutes?.length || 0} institutes loaded</Text>
            {instituteError && <Text color="red.500">Error: {instituteError}</Text>}
          </Box>
        )}

        <Box me="auto">
          <Heading color={textColor} fontSize="36px" mb="10px">
            Sign In
          </Heading>
          <Text
            mb="36px"
            ms="4px"
            color={textColorSecondary}
            fontWeight="400"
            fontSize="md"
          >
            Enter your email and password to sign in!
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
          <Box mb="25px">
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
            {/* Show institute count for debugging */}
            {institutes && (
              <Text fontSize="xs" color="gray.500" mt="4px">
                {institutes.length} institutes available
              </Text>
            )}
          </Box>

          {/* FORM STARTS HERE */}
          <form onSubmit={handleSignIn}>
            <FormControl>
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
                mb="24px"
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
                  mb="24px"
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

              <Flex justifyContent="space-between" align="center" mb="24px">
                <FormControl display="flex" alignItems="center">
                  <Checkbox
                    id="remember-login"
                    colorScheme="brandScheme"
                    me="10px"
                  />
                  <FormLabel
                    htmlFor="remember-login"
                    mb="0"
                    fontWeight="normal"
                    color={textColor}
                    fontSize="sm"
                  >
                    Keep me logged in
                  </FormLabel>
                </FormControl>
                <NavLink to="/auth/forgot-password">
                  <Text
                    color={textColorBrand}
                    fontSize="sm"
                    w="124px"
                    fontWeight="500"
                  >
                    Forgot password?
                  </Text>
                </NavLink>
              </Flex>

              <Button
                type="submit"
                isLoading={loading}
                loadingText="Signing In..."
                fontSize="sm"
                variant="brand"
                fontWeight="500"
                w="100%"
                h="50"
                mb="24px"
              >
                Sign In
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
              Not registered yet?
              <NavLink to="/auth/sign-up">
                <Text
                  color={textColorBrand}
                  as="span"
                  ms="5px"
                  fontWeight="500"
                >
                  Create an Account
                </Text>
              </NavLink>
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </DefaultAuth>
  );
}

export default SignIn;
