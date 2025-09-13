import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import DefaultAuth from "layouts/auth/Default";
import illustration from "assets/img/auth/auth.png";

function ForgotPassword() {
  const navigate = useNavigate();

  // Chakra color mode
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = "gray.400";
  const textColorDetails = useColorModeValue("navy.700", "secondaryGray.600");
  const textColorBrand = useColorModeValue("brand.500", "white");
  const brandStars = useColorModeValue("brand.500", "brand.400");

  // Handle password reset
  const handlePasswordReset = (event) => {
    event.preventDefault();
    // Add password reset logic here (API call, validation, etc.)
    // On successful submission:
    alert('Password reset link sent to your email!');
    // Optionally redirect to sign in page
    // navigate('/auth/sign-in');
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
              Forgot Password
            </Heading>
            <Text
              mb="20px"
              ms="4px"
              color={textColorSecondary}
              fontWeight="400"
              fontSize="md"
            >
              Enter your email address and we'll send you a reset link!
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
            {/* FORM STARTS HERE */}
            <form onSubmit={handlePasswordReset}>
              <FormControl>
                <FormLabel
                  display="flex"
                  ms="4px"
                  fontSize="sm"
                  fontWeight="500"
                  color={textColor}
                  mb="8px"
                >
                  Email Address<Text color={brandStars}>*</Text>
                </FormLabel>
                <Input
                  isRequired={true}
                  variant="auth"
                  fontSize="sm"
                  ms={{ base: "0px", md: "0px" }}
                  type="email"
                  placeholder="Enter your email address"
                  mb="20px"
                  fontWeight="500"
                  size="lg"
                />
                <Button
                  type="submit"
                  fontSize="sm"
                  variant="brand"
                  fontWeight="500"
                  w="100%"
                  h="50"
                  mb="20px"
                >
                  Send Reset Link
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
                Remember your password?
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
              <Text color={textColorDetails} fontWeight="400" fontSize="14px" mt="10px">
                Don't have an account?
                <NavLink to="/auth/sign-up">
                  <Text
                    color={textColorBrand}
                    as="span"
                    ms="5px"
                    fontWeight="500"
                  >
                    Sign Up
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

export default ForgotPassword;
