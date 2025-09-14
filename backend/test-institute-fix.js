require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const CarbonBiometric = require('./models/CarbonBiometric');
const { getInstituteDisplayName } = require('./middleware/instituteAuth');

async function testInstituteFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test with users who have object-type institutes
    const testUsers = [
      'anamika123@gmail.com',  // IIT Bombay (object)
      'mehwish.qureshi2020@gmail.com',  // MNIT Jaipur (object)
      'rajesh.kumar@iitb.ac.in'  // IIT Bombay (string)
    ];

    for (const userEmail of testUsers) {
      console.log(`\n=== Testing ${userEmail} ===`);
      
      const user = await User.findOne({ email: userEmail });
      if (!user) {
        console.log('User not found');
        continue;
      }

      console.log(`User institute type: ${typeof user.institute}`);
      console.log(`User institute value: ${typeof user.institute === 'object' ? JSON.stringify(user.institute) : user.institute}`);
      
      // Apply the fix logic
      const instituteDisplayName = getInstituteDisplayName(user.institute);
      const instituteNameForQuery = typeof user.institute === 'object' && user.institute.name 
        ? user.institute.name 
        : String(user.institute);
      
      console.log(`Display name: ${instituteDisplayName}`);
      console.log(`Query name: ${instituteNameForQuery}`);
      
      // Test if carbon data exists
      const carbonData = await CarbonBiometric.getDashboardData(instituteNameForQuery);
      const departmentData = await CarbonBiometric.getDepartmentData(instituteNameForQuery);
      
      console.log(`Carbon data found: ${carbonData && carbonData.length > 0 ? 'YES' : 'NO'}`);
      console.log(`Department data found: ${departmentData && departmentData.length > 0 ? 'YES' : 'NO'}`);
      
      if (carbonData && carbonData.length > 0) {
        console.log(`  CO₂ Savings: ${carbonData[0].co2Savings} tonnes`);
        console.log(`  Wallet Balance: ${carbonData[0].walletBalance}`);
      }
      
      if (departmentData && departmentData.length > 0) {
        console.log(`  Departments: ${departmentData.length} found`);
      }
    }

    await mongoose.connection.close();
    console.log('\nTest complete!');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testInstituteFix();