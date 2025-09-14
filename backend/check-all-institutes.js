require('dotenv').config();
const mongoose = require('mongoose');

async function checkAllInstitutes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    const db = mongoose.connection.db;

    // Check institutes collection
    console.log('\n=== INSTITUTES COLLECTION ===');
    try {
      const institutesCollection = db.collection('institutes');
      const institutesData = await institutesCollection.find({}).toArray();
      console.log(`Found ${institutesData.length} institutes:`);
      institutesData.forEach((inst, idx) => {
        console.log(`${idx + 1}. ${inst.name || inst._id} (ID: ${inst._id})`);
      });
    } catch (error) {
      console.log('Error accessing institutes collection:', error.message);
    }

    // Check users collection for institutes
    console.log('\n=== USERS COLLECTION - INSTITUTES ===');
    try {
      const usersCollection = db.collection('users');
      const userInstitutes = await usersCollection.distinct('institute');
      console.log(`Found ${userInstitutes.length} institutes in users collection:`);
      userInstitutes.forEach((inst, idx) => {
        console.log(`${idx + 1}. ${typeof inst === 'object' ? inst.name || JSON.stringify(inst) : inst}`);
      });
    } catch (error) {
      console.log('Error accessing users collection:', error.message);
    }

    // Check carbonbiometrics collection
    console.log('\n=== CARBONBIOMETRICS COLLECTION ===');
    try {
      const carbonbiometricsCollection = db.collection('carbonbiometrics');
      const carbonInstitutes = await carbonbiometricsCollection.distinct('institute');
      console.log(`Found ${carbonInstitutes.length} institutes in carbonbiometrics:`);
      carbonInstitutes.forEach((inst, idx) => {
        console.log(`${idx + 1}. ${inst}`);
      });
    } catch (error) {
      console.log('Error accessing carbonbiometrics collection:', error.message);
    }

    // Check carbondatas collection
    console.log('\n=== CARBONDATAS COLLECTION ===');
    try {
      const carbondatasCollection = db.collection('carbondatas');
      const carbonDataInstitutes = await carbondatasCollection.distinct('institute');
      console.log(`Found ${carbonDataInstitutes.length} institutes in carbondatas:`);
      carbonDataInstitutes.forEach((inst, idx) => {
        console.log(`${idx + 1}. ${typeof inst === 'object' ? inst.name || JSON.stringify(inst) : inst}`);
      });
    } catch (error) {
      console.log('Error accessing carbondatas collection:', error.message);
    }

    // Check energy collection
    console.log('\n=== ENERGY COLLECTION ===');
    try {
      const energyCollection = db.collection('energy');
      const energyInstitutes = await energyCollection.distinct('institute');
      console.log(`Found ${energyInstitutes.length} institutes in energy:`);
      energyInstitutes.forEach((inst, idx) => {
        console.log(`${idx + 1}. ${typeof inst === 'object' ? inst.name || JSON.stringify(inst) : inst}`);
      });
    } catch (error) {
      console.log('Error accessing energy collection:', error.message);
    }

    await mongoose.connection.close();
    console.log('\nConnection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllInstitutes();