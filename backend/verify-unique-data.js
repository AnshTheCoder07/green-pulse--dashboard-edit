require('dotenv').config();
const mongoose = require('mongoose');
const CarbonBiometric = require('./models/CarbonBiometric');

async function verifyUniqueData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const institutes = await CarbonBiometric.distinct('institute');
    console.log(`Checking ${institutes.length} institutes for unique data:\n`);

    for (const institute of institutes) {
      // Get sample data for this institute
      const sampleData = await CarbonBiometric.getDashboardData(institute);
      const departmentData = await CarbonBiometric.getDepartmentData(institute);
      
      console.log(`=== ${institute} ===`);
      if (sampleData && sampleData.length > 0) {
        console.log(`  CO₂ Savings: ${sampleData[0].co2Savings} tonnes`);
        console.log(`  Carbon Budget Used: ${sampleData[0].carbonBudgetUsed}`);
        console.log(`  Wallet Balance: ${sampleData[0].walletBalance}`);
        console.log(`  Energy Efficiency: ${sampleData[0].avgEnergyEfficiency}%`);
      }
      
      if (departmentData && departmentData.length > 0) {
        console.log(`  Departments (${departmentData.length}):`);
        departmentData.slice(0, 3).forEach(dept => {
          console.log(`    - ${dept.departmentName}: ${dept.consumption} kWh, ${dept.efficiency}% efficiency`);
        });
      }
      console.log('');
    }

    await mongoose.connection.close();
    console.log('Verification complete!');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyUniqueData();