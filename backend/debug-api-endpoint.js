require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { getDashboardData } = require('./controllers/carbonDataController');

async function debugApiEndpoint() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test with a known working user
    const user = await User.findOne({ email: 'anamika123@gmail.com' });
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('Testing with user:', user.email);
    console.log('User institute:', user.institute);

    // Create a mock request object like what the API would receive
    const mockReq = {
      user: {
        _id: user._id
      },
      userInstitute: user.institute
    };

    // Create a mock response object
    let responseData = null;
    let statusCode = null;
    const mockRes = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
          }
        };
      }
    };

    console.log('\n=== Calling getDashboardData ===');
    
    // Call the actual controller function
    await getDashboardData(mockReq, mockRes);
    
    console.log('Status code:', statusCode);
    console.log('Response data:', JSON.stringify(responseData, null, 2));

    await mongoose.connection.close();
    console.log('\nAPI endpoint test complete!');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugApiEndpoint();