import bcrypt from 'bcryptjs';

async function test() {
  try {
    const hash_123 = '$2a$10$X9eL9hJ/qA1ZR9XKdKvqVOJhoBjYwUeJcJIPzJZLvGp8vRPUD95Me';
    const valid_123 = await bcrypt.compare('password123', hash_123);
    
    console.log('Password "password123" valid:', valid_123);
    
    // Also test database hash if available
    console.log('Test new hash generation:');
    const newHash = await bcrypt.hash('testpass456', 10);
    console.log('New hash for "testpass456":', newHash);
  } catch (error) {
    console.log('Error:', error);
  }
}

test();
