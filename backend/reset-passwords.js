require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function resetPasswords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const usersToReset = [
      'anamika123@gmail.com',
      'mehwish.qureshi2020@gmail.com', 
      'anamika12@gmail.com',
      'testuser@gmail.com',
      '2022ucp1896@mnit.ac.in'
    ];

    console.log('Resetting passwords to "password123" for existing users...\n');

    for (const email of usersToReset) {
      const user = await User.findOne({ email });
      if (!user) {
        console.log(`❌ User ${email} not found`);
        continue;
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash('password123', 12);
      user.password = hashedPassword;
      await user.save();

      console.log(`✅ Reset password for ${email}`);
      console.log(`   Institute: ${typeof user.institute === 'object' ? user.institute.name : user.institute}`);
    }

    await mongoose.connection.close();
    console.log('\n🎉 Password reset complete!');
    console.log('\nYou can now login with these accounts using password123:');
    usersToReset.forEach(email => console.log(`  ${email} / password123`));
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetPasswords();