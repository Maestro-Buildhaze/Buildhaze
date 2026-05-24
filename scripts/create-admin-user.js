#!/usr/bin/env node
/**
 * Creează user admin pentru dashboard
 * Usage: node create-admin-user.js <email> <password>
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node create-admin-user.js <email> <password>');
    process.exit(1);
  }

  const [email, password] = args;

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Creează sau updatează admin
  const admin = await prisma.client.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      passwordHash,
      businessName: 'Admin',
      slug: 'admin',
      plan: 'enterprise',
      isActive: true,
    },
  });

  console.log('✅ Admin creat:', admin.email);
  console.log('   ID:', admin.id);
  console.log('   Poți intra în dashboard la: /admin');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
