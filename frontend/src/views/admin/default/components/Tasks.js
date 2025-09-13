import {
  Box,
  Flex,
  Text,
  Icon,
  useColorModeValue,
  Checkbox,
} from "@chakra-ui/react";
import Card from "components/card/CarbonCard.js";
import Menu from "components/menu/MainMenu";
import IconBox from "components/icons/IconBox";
import { MdCheckBox, MdDragIndicator } from "react-icons/md";
import React from "react";

export default function CarbonTasks(props) {
  const { ...rest } = props;

  // Chakra Color Mode
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const boxBg = useColorModeValue("secondaryGray.300", "navy.700");
  const brandColor = useColorModeValue("brand.500", "brand.400");

  return (
    <Card p="20px" align="center" direction="column" w="100%" {...rest}>
      <Flex alignItems="center" w="100%" mb="30px">
        <IconBox
          me="12px"
          w="38px"
          h="38px"
          bg={boxBg}
          icon={<Icon as={MdCheckBox} color={brandColor} w="24px" h="24px" />}
        />
        <Text color={textColor} fontSize="lg" fontWeight="700">
          Carbon Initiatives
        </Text>
        <Menu ms="auto" />
      </Flex>
      <Box px="11px">
        <Flex mb="20px">
          <Checkbox me="16px" colorScheme="brandScheme" />
          <Text
            fontWeight="bold"
            color={textColor}
            fontSize="md"
            textAlign="start"
          >
            Carbon Footprint Assessment
          </Text>
          <Icon
            ms="auto"
            as={MdDragIndicator}
            color="secondaryGray.600"
            w="24px"
            h="24px"
          />
        </Flex>
        <Flex mb="20px">
          <Checkbox defaultChecked colorScheme="brandScheme" me="16px" />
          <Text
            fontWeight="bold"
            color={textColor}
            fontSize="md"
            textAlign="start"
          >
            Renewable Energy Implementation
          </Text>
          <Icon
            ms="auto"
            as={MdDragIndicator}
            color="secondaryGray.600"
            w="24px"
            h="24px"
          />
        </Flex>
        <Flex mb="20px">
          <Checkbox defaultChecked colorScheme="brandScheme" me="16px" />
          <Text
            fontWeight="bold"
            color={textColor}
            fontSize="md"
            textAlign="start"
          >
            Sustainable Material Sourcing 
          </Text>
          <Icon
            ms="auto"
            as={MdDragIndicator}
            color="secondaryGray.600"
            w="24px"
            h="24px"
          />
        </Flex>
        <Flex mb="20px">
          <Checkbox colorScheme="brandScheme" me="16px" />
          <Text
            fontWeight="bold"
            color={textColor}
            fontSize="md"
            textAlign="start"
          >
            Employee Commuting Program
          </Text>
          <Icon
            ms="auto"
            as={MdDragIndicator}
            color="secondaryGray.600"
            w="24px"
            h="24px"
          />
        </Flex>
        <Flex mb="20px">
          <Checkbox defaultChecked colorScheme="brandScheme" me="16px" />
          <Text
            fontWeight="bold"
            color={textColor}
            fontSize="md"
            textAlign="start"
          >
            Carbon Offset Purchase Plan
          </Text>
          <Icon
            ms="auto"
            as={MdDragIndicator}
            color="secondaryGray.600"
            w="24px"
            h="24px"
          />
        </Flex>
      </Box>
    </Card>
  );
}
