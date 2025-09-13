import React from 'react';
import { Icon } from '@chakra-ui/react';
import {
  MdBarChart,
  MdPerson,
  MdForest,
  MdPublic,
  MdEmojiEvents,
} from 'react-icons/md';

// Use folder names—these will use the index.jsx in each folder
import MainDashboard from 'views/admin/default';

import DataTables from 'views/admin/dataTables';
import Profile from 'views/admin/profile';
import Leaderboard from 'views/admin/leaderboard';
import Wallet from 'views/admin/wallet';


const routes = [
  {
    name: 'Carbon Dashboard',
    layout: '/admin',
    path: '/dashboard',
    icon: <Icon as={MdForest} width="20px" height="20px" color="inherit" />,
    component: <MainDashboard />,
  },
  {
    name: 'Ledger',
    layout: '/admin',
    path: '/ledger',
    icon: <Icon as={MdBarChart} width="20px" height="20px" color="inherit" />,
    component: <DataTables />,
  },
  {
    name: 'Profile',
    layout: '/admin',
    path: '/profile',
    icon: <Icon as={MdPerson} width="20px" height="20px" color="inherit" />,
    component: <Profile />,
  },
  {
    name: 'Leaderboard',
    layout: '/admin',
    path: '/leaderboard',
    icon: <Icon as={MdEmojiEvents} width="20px" height="20px" color="inherit" />,
    component: <Leaderboard />,
  },
  {
    name: 'Wallet',
    layout: '/admin',
    path: '/wallet',
    icon: <Icon as={MdPublic} width="20px" height="20px" color="inherit" />,
    component: <Wallet />,
  },
];

export default routes;
