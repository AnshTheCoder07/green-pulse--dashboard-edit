import React from "react";
import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Avatar, Text } from "@chakra-ui/react";

const Leaderboard = ({ data = [] }) => {
  return (
    <Box minH="365px" p={6} bg="navy.800" borderRadius="xl" shadow="md">
      <Heading size="md" color="white" mb={4}>Leaderboard</Heading>
      {data.length === 0 ? (
        <Text color="gray.400">No leaderboard data available.</Text>
      ) : (
        <Table variant="unstyled">
          <Thead>
            <Tr>
              <Th color="gray.300">Rank</Th>
              <Th color="gray.300">User/Project</Th>
              <Th color="gray.300">Projects</Th>
              <Th color="gray.300">Emissions Saved</Th>
            </Tr>
          </Thead>
          <Tbody>
            {data.map((entry, idx) => (
              <Tr key={entry.id || idx}>
                <Td color="white">{idx + 1}</Td>
                <Td>
                  <Avatar src={entry.avatar} size="sm" mr={2} />
                  <Text as="span" color="white" fontWeight="bold">{entry.name}</Text>
                </Td>
                <Td color="white">{entry.projects}</Td>
                <Td color="white">{entry.emissionsSaved} t CO₂</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Box>
  );
};

export default Leaderboard;
