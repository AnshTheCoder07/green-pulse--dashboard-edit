/*eslint-disable*/
import React from "react";
import {
  Flex,
  Link,
  List,
  ListItem,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";

export default function Footer() {
  let textColor = useColorModeValue("gray.400", "white");
  let linkColor = useColorModeValue({ base: "gray.600", lg: "gray.400" }, "white");

  return (
    <Flex
      zIndex='3'
      flexDirection={{
        base: "column",
        lg: "row",
      }}
      alignItems={{
        base: "center",
        xl: "start",
      }}
      justifyContent='space-between'
      px={{ base: "30px", md: "30px" }}
      pb='30px'>
      
      <Text
        color={textColor}
        textAlign={{
          base: "center",
          xl: "start",
        }}
        mb={{ base: "20px", lg: "0px" }}>
        &copy; {new Date().getFullYear()}
        <Text as='span' fontWeight='500' ms='4px'>
          Green Pulse. Made with love by
          <Link
            mx='3px'
            color={textColor}
            href='https://drive.google.com/file/d/11xRC9ym31ENCyx0t_a6Rh7CpLPN4VAfA/view?usp=sharing'
            target='_blank'
            fontWeight='700'>
            Phoenix!
          </Link>
        </Text>
      </Text>

      <List display='flex'>
        <ListItem
          me={{
            base: "20px",
            md: "44px",
          }}>
          <Link
            fontWeight='500'
            color={linkColor}
            href='mailto:2022ucp1896@mnit.ac.in'>
            Support
          </Link>
        </ListItem>

        <ListItem
          me={{
            base: "20px",
            md: "44px",
          }}>
          <Link
            fontWeight='500'
            color={linkColor}
            href='https://opensource.org/license/mit'>
            License
          </Link>
        </ListItem>

        <ListItem
          me={{
            base: "20px",
            md: "44px",
          }}>
          <Link
            fontWeight='500'
            color={linkColor}
            href='https://www.termsfeed.com/live/d6f645e6-f8a1-40ff-a1a0-e7977903471e'>
            Terms of Use
          </Link>
        </ListItem>

        <ListItem>
          <Link
            fontWeight='500'
            color={linkColor}
            href='https://www.github.com/roysubhrajit113/green-pulse'>
            GitHub
          </Link>
        </ListItem>
      </List>
    </Flex>
  );
}
