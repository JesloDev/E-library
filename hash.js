import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error("❌ Error: Please provide a password.");
  console.log("Usage: node hash.js <your_password>");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);

console.log("\n==========================================");
console.log(`🔑 Hashing password: "${password}"`);
console.log(`📝 Bcrypt Hash:      ${hash}`);
console.log("==========================================\n");

console.log("Copy and run this SQL query in your Supabase SQL Editor:\n");
console.log(`UPDATE users \nSET password = '${hash}' \nWHERE email = 'dlcf@lasu.edu.ng';\n`);
console.log("------------------------------------------");
