/* eslint-disable */

import {
  Box,
  Flex,
  Icon,
  Progress,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import Card from 'components/card/CarbonCard';
import Menu from 'components/menu/MainMenu';
import * as React from 'react';
import { MdCancel, MdCheckCircle, MdOutlineError } from 'react-icons/md';
import { useCarbon } from 'contexts/CarbonContext';

const columnHelper = createColumnHelper();

export default function CarbonComplexTable(props) {
  const { tableData } = props;
  const [sorting, setSorting] = React.useState([]);
  const textColor = useColorModeValue('green.900', 'white');
  const borderColor = useColorModeValue('green.200', 'whiteAlpha.100');
  
  // Get transaction data from carbon context
  const { dashboardData } = useCarbon();
  const transactions = dashboardData?.transactions || [];
  
  // Convert transactions to table format
  const defaultData = transactions.map(tx => ({
    type: tx.type,
    amount: tx.amount,
    txHash: tx.blockchainTxHash || `0x${Math.random().toString(16).substr(2, 64)}`,
    timestamp: tx.timestamp,
    description: tx.description,
    building: tx.building || 'N/A'
  }));

  const columns = [
    columnHelper.accessor('type', {
      id: 'type',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '9px', lg: '11px' }}
          color="green.400"
          fontWeight="600"
        >
          TRANSACTION TYPE
        </Text>
      ),
      cell: (info) => (
        <Flex align="center">
          <Icon
            w="16px"
            h="16px"
            me="6px"
            color={
              info.getValue() === 'energy_consumption'
                ? 'red.500'
                : info.getValue() === 'carbon_offset_purchase'
                ? 'green.500'
                : info.getValue() === 'credit'
                ? 'blue.500'
                : 'gray.500'
            }
            as={
              info.getValue() === 'energy_consumption'
                ? MdCancel
                : info.getValue() === 'carbon_offset_purchase'
                ? MdCheckCircle
                : MdOutlineError
            }
          />
          <Text color={textColor} fontSize="xs" fontWeight="600" noOfLines={1}>
            {info.getValue().replace('_', ' ').toUpperCase()}
          </Text>
        </Flex>
      ),
    }),
    columnHelper.accessor('amount', {
      id: 'amount',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '9px', lg: '11px' }}
          color="green.400"
          fontWeight="600"
        >
          AMOUNT (ENTO)
        </Text>
      ),
      cell: (info) => (
        <Text 
          color={info.row.original.type === 'credit' ? 'green.500' : 'red.500'} 
          fontSize="xs" 
          fontWeight="600" 
          textAlign="right"
        >
          {info.row.original.type === 'credit' ? '+' : '-'}{info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor('txHash', {
      id: 'txHash',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '9px', lg: '11px' }}
          color="green.400"
          fontWeight="600"
        >
          TX HASH
        </Text>
      ),
      cell: (info) => (
        <Text 
          color="blue.500" 
          fontSize="xs" 
          fontWeight="600" 
          fontFamily="mono"
          cursor="pointer"
          _hover={{ textDecoration: 'underline' }}
          onClick={() => {
            // Copy to clipboard or open in blockchain explorer
            navigator.clipboard.writeText(info.getValue());
            alert('Transaction hash copied to clipboard!');
          }}
        >
          {info.getValue().substring(0, 8)}...{info.getValue().substring(56)}
        </Text>
      ),
    }),
    columnHelper.accessor('timestamp', {
      id: 'timestamp',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '9px', lg: '11px' }}
          color="green.400"
          fontWeight="600"
        >
          TIMESTAMP
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="xs" fontWeight="600">
          {new Date(info.getValue()).toLocaleDateString()}
        </Text>
      ),
    }),
  ];
  const [data, setData] = React.useState(() => [...defaultData]);
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
  });
  return (
    <Card
      flexDirection="column"
      w="100%"
      px="0px"
      overflowX={{ sm: 'scroll', lg: 'hidden' }}
    >
      <Flex px="20px" mb="6px" justifyContent="space-between" align="center">
        <Text
          color={textColor}
          fontSize="18px"
          fontWeight="700"
          lineHeight="100%"
        >
          Emission Data - Wallet Ledger
        </Text>
        <Menu />
      </Flex>
      <Box>
        <Table variant="simple" color="green.500" mb="16px" mt="8px" size="sm">
          <Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <Th
                      key={header.id}
                      colSpan={header.colSpan}
                      pe="8px"
                      py="8px"
                      borderColor={borderColor}
                      cursor="pointer"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <Flex
                        justifyContent="space-between"
                        align="center"
                        fontSize={{ sm: '9px', lg: '11px' }}
                        color="green.400"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {{
                          asc: '',
                          desc: '',
                        }[header.column.getIsSorted()] ?? null}
                      </Flex>
                    </Th>
                  );
                })}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {table
              .getRowModel()
              .rows.slice(0, 5)
              .map((row) => {
                return (
                  <Tr key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <Td
                          key={cell.id}
                          fontSize={{ sm: '12px' }}
                          py="8px"
                          px="12px"
                          minW={{ sm: '80px', md: '100px', lg: 'auto' }}
                          borderColor="transparent"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </Td>
                      );
                    })}
                  </Tr>
                );
              })}
          </Tbody>
        </Table>
      </Box>
    </Card>
  );
}
