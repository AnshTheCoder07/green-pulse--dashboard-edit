// Quick script to complete population for all 14 Indian institutes
require('dotenv').config();
const mongoose = require('mongoose');
const CarbonBiometric = require('./models/CarbonBiometric');
const EnergyConsumption = require('./models/EnergyConsumption');

const indianInstitutes = [
  'Indian Institute of Information Technology Hyderabad',
  'Indian Institute of Science Bangalore', 
  'Indian Institute of Science Education and Research Kolkata',
  'Indian Institute of Science Education and Research Pune',
  'Indian Institute of Space Science and Technology Thiruvananthapuram',
  'Indian Institute of Technology Bombay',
  'Indian Institute of Technology Delhi',
  'Indian Institute of Technology Kanpur',
  'Indian Institute of Technology Kharagpur', 
  'Indian Institute of Technology Madras',
  'Malaviya National Institute of Technology Jaipur',
  'National Institute of Technology Karnataka Surathkal',
  'National Institute of Technology Tiruchirappalli',
  'National Institute of Technology Warangal'
];

const departments = ['Computer Science', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering'];

async function completePopulation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check which institutes already have data
    const existingInstitutes = await CarbonBiometric.distinct('institute');
    console.log('Existing institutes:', existingInstitutes);

    const missingInstitutes = indianInstitutes.filter(inst => !existingInstitutes.includes(inst));
    console.log('Missing institutes:', missingInstitutes);

    // Create data for missing institutes quickly
    for (const institute of missingInstitutes) {
      console.log(`Creating data for ${institute}...`);
      
      const instituteMultiplier = (indianInstitutes.indexOf(institute) + 1) * 0.1 + 1;
      
      // Create 50 records per institute for quick setup
      for (let i = 0; i < 50; i++) {
        const timestamp = new Date();
        timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * 180)); // Random last 6 months
        
        const department = departments[Math.floor(Math.random() * departments.length)];
        
        const carbonBiometric = new CarbonBiometric({
          institute: institute,
          timestamp: timestamp,
          co2Emissions: Math.random() * 15 * instituteMultiplier + 8,
          co2Savings: Math.random() * 80 * instituteMultiplier + 20,
          carbonFootprint: Math.random() * 300 * instituteMultiplier + 150,
          carbonOffset: Math.random() * 30 * instituteMultiplier + 10,
          energyConsumption: Math.random() * 1200 + 600,
          renewableEnergyUsage: Math.random() * 300 * instituteMultiplier + 80,
          gridEnergyUsage: Math.random() * 1000 + 500,
          carbonBudget: {
            allocated: 1200 + Math.random() * 800 * instituteMultiplier,
            used: Math.random() * 1000 * instituteMultiplier + 300,
            remaining: Math.random() * 500 * instituteMultiplier + 150
          },
          carbonWallet: {
            balance: Math.random() * 2500 * instituteMultiplier + 800
          },
          energyEfficiency: Math.random() * 25 + 75,
          carbonEfficiency: Math.random() * 30 + 70,
          buildingName: 'Academic Building ' + (Math.floor(Math.random() * 3) + 1),
          departmentName: department,
          deviceId: `sensor_${institute.replace(/\s+/g, '_').toLowerCase()}_${i}`,
          sensorData: {
            temperature: Math.random() * 15 + 25,
            humidity: Math.random() * 40 + 40,
            airQuality: Math.random() * 150 + 50
          },
          dataSource: 'sensor'
        });

        await carbonBiometric.save();
      }
    }

    // Verify all institutes now have data
    const finalInstitutes = await CarbonBiometric.distinct('institute');
    console.log(`Final institutes count: ${finalInstitutes.length}`);
    console.log('All institutes:', finalInstitutes.sort());

    await mongoose.connection.close();
    console.log('Population complete!');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

completePopulation();