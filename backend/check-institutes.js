require('dotenv').config();
const mongoose = require('mongoose');
const CarbonBiometric = require('./models/CarbonBiometric');

async function checkInstitutes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const institutes = await CarbonBiometric.distinct('institute');
    console.log(`Total institutes found: ${institutes.length}`);
    console.log('Available institutes:');
    institutes.forEach((inst, idx) => {
      console.log(`${idx + 1}. ${inst}`);
    });

    // Check sample data for each institute
    console.log('\nSample data for each institute:');
    for (const institute of institutes) {
      const count = await CarbonBiometric.countDocuments({ institute });
      const departments = await CarbonBiometric.distinct('departmentName', { institute });
      console.log(`  ${institute}: ${count} documents, Departments: [${departments.join(', ')}]`);
    }

    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkInstitutes();