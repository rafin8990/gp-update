import pool from '../utils/dbClient';
import bcrypt from 'bcryptjs';
import config from '../config';

interface SeedUser {
  name: string;
  username: string;
  email?: string;
  mobile_no?: string;
  password: string;
  role?: string;
}

const dummyUsers: SeedUser[] = [
  {
    name: 'Super Admin',
    username: 'superadmin',
    email: 'superadmin@example.com',
    mobile_no: '+8801712345678',
    password: 'superadmin123',
    role: 'super_admin',
  },
  {
    name: 'Admin User',
    username: 'admin',
    email: 'admin@example.com',
    mobile_no: '+8801712345679',
    password: 'admin123',
    role: 'admin',
  },
  {
    name: 'John Doe',
    username: 'johndoe',
    email: 'john.doe@example.com',
    mobile_no: '+8801712345680',
    password: 'user123',
    role: 'user',
  },
  {
    name: 'Jane Smith',
    username: 'janesmith',
    email: 'jane.smith@example.com',
    mobile_no: '+8801712345681',
    password: 'user123',
    role: 'user',
  },
  {
    name: 'Manager User',
    username: 'manager',
    email: 'manager@example.com',
    mobile_no: '+8801712345682',
    password: 'manager123',
    role: 'admin',
  },
  {
    name: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
    mobile_no: '+8801712345683',
    password: 'test123',
    role: 'user',
  },
];

const seedUsers = async () => {
  try {
    console.log('🌱 Starting user seeding...\n');

    // Check if users already exist
    const existingUsers = await pool.query('SELECT username FROM users');
    const existingUsernames = new Set(existingUsers.rows.map((row) => row.username));

    let createdCount = 0;
    let skippedCount = 0;

    for (const user of dummyUsers) {
      if (existingUsernames.has(user.username)) {
        console.log(`⏭️  Skipped: ${user.username} (already exists)`);
        skippedCount++;
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(
        user.password,
        Number(config.bycrypt_salt_rounds) || 12
      );

      // Insert user
      const query = `
        INSERT INTO users (name, username, email, mobile_no, password, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, username, email, role
      `;

      const values = [
        user.name,
        user.username,
        user.email || null,
        user.mobile_no || null,
        hashedPassword,
        user.role || 'user',
      ];

      const result = await pool.query(query, values);
      const createdUser = result.rows[0];

      console.log(`✅ Created: ${createdUser.username} (${createdUser.name}) - Role: ${createdUser.role}`);
      createdCount++;
    }

    console.log('\n📊 Seeding Summary:');
    console.log(`   Created: ${createdCount} users`);
    console.log(`   Skipped: ${skippedCount} users (already exist)`);
    console.log(`   Total: ${dummyUsers.length} users\n`);

    if (createdCount > 0) {
      console.log('🔐 Default Passwords:');
      dummyUsers.forEach((user) => {
        if (!existingUsernames.has(user.username)) {
          console.log(`   ${user.username}: ${user.password}`);
        }
      });
      console.log('');
    }

    console.log('✨ User seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
};

// Run seeder
seedUsers()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
