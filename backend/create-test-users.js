require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

// Sample test users for different institutes
const testUsers = [
  {
    institute: 'Indian Institute of Technology Bombay',
    fullName: 'Dr. Rajesh Kumar',
    email: 'rajesh.kumar@iitb.ac.in',
    password: 'password123',
    position: 'Faculty',
    department: 'Computer Science'
  },
  {
    institute: 'Indian Institute of Technology Delhi',
    fullName: 'Prof. Priya Sharma',
    email: 'priya.sharma@iitd.ac.in', 
    password: 'password123',
    position: 'Faculty',
    department: 'Electrical Engineering'
  },
  {
    institute: 'Indian Institute of Science Bangalore',
    fullName: 'Dr. Arjun Patel',
    email: 'arjun.patel@iisc.ac.in',
    password: 'password123',
    position: 'Research Fellow',
    department: 'Physics'
  },
  {
    institute: 'Malaviya National Institute of Technology Jaipur',
    fullName: 'Ms. Anita Singh',
    email: 'anita.singh@mnit.ac.in',
    password: 'password123',
    position: 'Student',
    department: 'Mechanical Engineering'
  },
  {
    institute: 'National Institute of Technology Karnataka Surathkal',
    fullName: 'Mr. Vikram Reddy',
    email: 'vikram.reddy@nitk.edu.in',
    password: 'password123',
    position: 'Student', 
    department: 'Chemical Engineering'
  }
];

async function createTestUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('Creating test users for different institutes...\n');

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`✓ User ${userData.email} already exists for ${userData.institute}`);
        continue;
      }

      // Create new user
      const user = new User(userData);
      await user.save();
      
      console.log(`✅ Created user: ${userData.fullName}`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Institute: ${userData.institute}`);
      console.log(`   Position: ${userData.position}`);
      console.log(`   Password: password123 (for testing)`);
      console.log('');
    }

    console.log('📊 Testing institute data isolation...\n');

    // Test with each user's institute
    const CarbonBiometric = require('./models/CarbonBiometric');
    
    for (const userData of testUsers) {
      const dashboardData = await CarbonBiometric.getDashboardData(userData.institute);
      const departmentData = await CarbonBiometric.getDepartmentData(userData.institute);
      
      console.log(`=== ${userData.institute} (${userData.email}) ===`);
      
      if (dashboardData && dashboardData.length > 0) {
        console.log(`✅ Has carbon data - CO₂ Savings: ${dashboardData[0].co2Savings} tonnes`);
        console.log(`   Wallet Balance: ${dashboardData[0].walletBalance}`);
        console.log(`   Energy Efficiency: ${dashboardData[0].avgEnergyEfficiency}%`);
      } else {
        console.log('❌ No carbon data found');
      }
      
      if (departmentData && departmentData.length > 0) {
        console.log(`   Departments: ${departmentData.length} (${departmentData.map(d => d.departmentName).join(', ')})`);
      }
      console.log('');
    }

    await mongoose.connection.close();
    console.log('Test users creation complete!');
    
    console.log('\n📋 You can now login with these test accounts:');
    testUsers.forEach(user => {
      console.log(`  ${user.email} / password123 (${user.institute})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestUsers();