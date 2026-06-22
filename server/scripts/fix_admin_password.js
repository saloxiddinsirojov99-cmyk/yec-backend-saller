const prisma = require('../lib/prisma');
const { hashPassword } = require('../utils/crypto');

(async () => {
  const email = 'admin@yecgilam.uz';
  const plain = 'admin123';
  const hash = hashPassword(plain);
  const updated = await prisma.user.updateMany({
    where: { email },
    data: { password_hash: hash }
  });
  console.log('✅ Updated admin password hash for', email, 'rows affected:', updated.count);
  await prisma.$disconnect();
})();
