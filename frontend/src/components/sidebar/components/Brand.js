import React from "react";
import { Flex, Image, Text, Box } from "@chakra-ui/react";
import { HSeparator } from "components/separator/Separator";
import carbonLogo from "assets/img/auth/auth.png";

export default function SidebarBrand() {
  return (
    <Flex align="center" direction="column">
      <Box
        position="relative"
        borderRadius="50%"
        overflow="hidden"
        w="80px"
        h="80px"
        my="20px"
        border="4px solid"
        borderColor="green.400"
        boxShadow="0 6px 16px rgba(0, 0, 0, 0.15)"
      >
        <Image 
          src={carbonLogo} 
          h="100%" 
          w="100%" 
          objectFit="cover"
          transform="scale(1.2)"
          transformOrigin="center"
        />
      </Box>
      <Text fontWeight="bold" fontSize="lg" color="green.500" mb="12px">
        GreenPulse
      </Text>
      <HSeparator mb="20px" />
    </Flex>
  );
}
