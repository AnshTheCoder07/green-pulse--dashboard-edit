// Chakra Imports
import {
  Box,
  Flex,
  Text,
  useColorModeValue,
  Button,
  Icon,
  Avatar,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";
import PropTypes from "prop-types";
import React, { useState, useEffect } from "react";
import { MdAccountBalanceWallet, MdSettings, MdNotifications } from "react-icons/md";
import { useNavigate } from "react-router-dom";

export default function WalletNavbar(props) {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    window.addEventListener("scroll", changeNavbar);

    return () => {
      window.removeEventListener("scroll", changeNavbar);
    };
  });

  const { secondary, message, brandText } = props;

  // Handle profile settings navigation
  const handleProfileSettings = () => {
    navigate('/admin/profile');
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/auth/sign-in');
  };

  // Here are all the props that may change depending on navbar's type or state.(secondary, variant, scrolled)
  let mainText = useColorModeValue("navy.700", "white");
  let secondaryText = useColorModeValue("gray.700", "white");
  let navbarPosition = "fixed";
  let navbarFilter = "none";
  let navbarBackdrop = "none";
  let navbarShadow = "none";
  let navbarBg = "transparent";
  let navbarBorder = "transparent";
  let secondaryMargin = "0px";
  let paddingX = "15px";
  let gap = "0px";
  
  const changeNavbar = () => {
    if (window.scrollY > 1) {
      setScrolled(true);
    } else {
      setScrolled(false);
    }
  };

  return (
    <Box
      position={navbarPosition}
      boxShadow={navbarShadow}
      bg={navbarBg}
      borderColor={navbarBorder}
      filter={navbarFilter}
      backdropFilter={navbarBackdrop}
      backgroundPosition='center'
      backgroundSize='cover'
      borderRadius='16px'
      borderWidth='1.5px'
      borderStyle='solid'
      transitionDelay='0s, 0s, 0s, 0s'
      transitionDuration=' 0.25s, 0.25s, 0.25s, 0s'
      transition-property='box-shadow, background-color, filter, border'
      transitionTimingFunction='linear, linear, linear, linear'
      alignItems={{ xl: "center" }}
      display={secondary ? "block" : "flex"}
      minH='75px'
      justifyContent={{ xl: "center" }}
      lineHeight='25.6px'
      mx='auto'
      mt={secondaryMargin}
      pb='8px'
      right={{ base: "12px", md: "30px", lg: "30px", xl: "30px" }}
      px={{
        sm: paddingX,
        md: "10px",
      }}
      ps={{
        xl: "12px",
      }}
      pt='8px'
      top={{ base: "12px", md: "16px", xl: "18px" }}
      w={{
        base: "25vw",
        md: "25vw",
        lg: "25vw",
        xl: "25vw",
        "2xl": "25vw",
      }}>
      <Flex
        w='100%'
        flexDirection={{
          sm: "column",
          md: "row",
        }}
        alignItems={{ xl: "center" }}
        mb={gap}>
        <Box ms='auto' w={{ sm: "100%", md: "unset" }}>
          <Flex align="center" gap="10px">
            <Button
              variant="no-hover"
              bg="transparent"
              p="0px"
              minW="unset"
              minH="unset"
              h="18px"
              w="max-content"
            >
              <Icon
                me="10px"
                h="18px"
                w="18px"
                color={mainText}
                as={MdNotifications}
              />
            </Button>
            <Menu>
              <MenuButton p="0px">
                <Avatar
                  _hover={{ cursor: 'pointer' }}
                  color="white"
                  name="Adela Parkson"
                  bg="#11047A"
                  size="sm"
                  w="40px"
                  h="40px"
                />
              </MenuButton>
              <MenuList
                boxShadow="14px 17px 40px 4px rgba(112, 144, 176, 0.18)"
                p="0px"
                mt="10px"
                borderRadius="20px"
                bg="white"
                border="none"
              >
                <Flex w="100%" mb="0px">
                  <Text
                    ps="20px"
                    pt="16px"
                    pb="10px"
                    w="100%"
                    borderBottom="1px solid"
                    borderColor="#E6ECFA"
                    fontSize="sm"
                    fontWeight="700"
                    color={mainText}
                  >
                    👋&nbsp; Hey, Adela
                  </Text>
                </Flex>
                <Flex flexDirection="column" p="10px">
                  <MenuItem
                    _hover={{ bg: 'none' }}
                    _focus={{ bg: 'none' }}
                    borderRadius="8px"
                    px="14px"
                    onClick={handleProfileSettings}
                  >
                    <Text fontSize="sm">Profile Settings</Text>
                  </MenuItem>
                  <MenuItem
                    _hover={{ bg: 'none' }}
                    _focus={{ bg: 'none' }}
                    color="red.400"
                    borderRadius="8px"
                    px="14px"
                    onClick={handleLogout}
                  >
                    <Text fontSize="sm">Log out</Text>
                  </MenuItem>
                </Flex>
              </MenuList>
            </Menu>
          </Flex>
        </Box>
      </Flex>
      {secondary ? <Text color='white'>{message}</Text> : null}
    </Box>
  );
}

WalletNavbar.propTypes = {
  brandText: PropTypes.string,
  variant: PropTypes.string,
  secondary: PropTypes.bool,
  fixed: PropTypes.bool,
  onOpen: PropTypes.func,
};
