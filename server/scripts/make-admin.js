const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function makeAdmin() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node make-admin.js <user_email>");
    process.exit(1);
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: "admin" },
    });
    console.log(`Successfully elevated ${user.email} to admin!`);
  } catch (err) {
    console.error("Failed to update user:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();
