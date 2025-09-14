const fetch = require('node-fetch');

async function testApiLogin() {
  try {
    console.log('Testing login API...');
    
    // First, let's get the institute data that should be sent
    const instituteData = {
      contact: { email: 'info@iitb.ac.in', phone: '+91-22-2572-2545' },
      id: 'inst_006',
      name: 'Indian Institute of Technology Bombay',
      campusId: 'IIT_BOM',
      location: 'Mumbai',
      address: 'Powai, Mumbai, Maharashtra 400076',
      established: '1958',
      totalBuildings: 134,
      totalStudents: 11000,
      energyCapacity: 75000,
      carbonBudget: 15000
    };

    const loginData = {
      email: 'rajesh.kumar@iitb.ac.in',
      password: 'password123',
      institute: instituteData
    };

    console.log('Sending login request to http://localhost:5000/api/auth/login');
    
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });

    console.log('Response status:', response.status);
    const responseData = await response.json();
    console.log('Response data:', JSON.stringify(responseData, null, 2));

    if (response.status === 200 && responseData.success) {
      console.log('\n✅ LOGIN SUCCESSFUL!');
      console.log('Token received:', responseData.data.token ? 'YES' : 'NO');
      
      // Test the dashboard API with the token
      if (responseData.data.token) {
        console.log('\n=== Testing dashboard API ===');
        const dashboardResponse = await fetch('http://localhost:5000/api/carbon-data/dashboard', {
          headers: {
            'Authorization': `Bearer ${responseData.data.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Dashboard response status:', dashboardResponse.status);
        if (dashboardResponse.status === 200) {
          const dashboardData = await dashboardResponse.json();
          console.log('Dashboard data received:', dashboardData.success ? 'YES' : 'NO');
          if (dashboardData.success) {
            console.log('Institute name:', dashboardData.data.instituteDisplayName);
            console.log('CO2 Savings:', dashboardData.data.co2Savings);
            console.log('Department count:', dashboardData.data.departmentData?.length || 0);
          }
        } else {
          const errorData = await dashboardResponse.json();
          console.log('Dashboard error:', errorData);
        }
      }
    } else {
      console.log('\n❌ LOGIN FAILED');
      console.log('Error:', responseData.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch('http://localhost:5000/api/health');
    console.log('Server health check:', response.status === 200 ? 'OK' : 'FAILED');
    return response.status === 200;
  } catch (error) {
    console.log('❌ Server not responding. Make sure to run "npm start" first.');
    return false;
  }
}

async function runTest() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testApiLogin();
  }
}

runTest();