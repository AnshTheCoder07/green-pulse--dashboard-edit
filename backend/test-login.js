require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function testLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test with known users
    const testUsers = [
      'rajesh.kumar@iitb.ac.in',
      'anamika123@gmail.com', 
      'mehwish.qureshi2020@gmail.com'
    ];

    for (const userEmail of testUsers) {
      console.log(`\n=== Testing Login for ${userEmail} ===`);
      
      const user = await User.findOne({ email: userEmail });
      if (!user) {
        console.log('❌ User not found');
        continue;
      }

      console.log(`✅ User found`);
      console.log(`Institute type: ${typeof user.institute}`);
      console.log(`Institute value:`, user.institute);
      
      // Test password comparison
      const isPasswordValid = await user.comparePassword('password123');
      console.log(`Password valid: ${isPasswordValid ? 'YES' : 'NO'}`);
      
      // Show what institute should be sent for login
      if (typeof user.institute === 'string') {
        console.log(`Login should send institute as string: "${user.institute}"`);
      } else if (typeof user.institute === 'object') {
        console.log(`Login should send institute object or name: "${user.institute.name}"`);
        console.log(`Or institute ID: "${user.institute.id}"`);
      }
    }

    await mongoose.connection.close();
    console.log('\nLogin test complete!');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testLogin();