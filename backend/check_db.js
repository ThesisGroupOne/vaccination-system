const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const animals = await prisma.animal.findMany();
        console.log(`Total Animals in DB: ${animals.length}`);
        console.log('Statuses:', animals.map(a => a.status));

        const users = await prisma.user.findMany();
        console.log(`Total Users in DB: ${users.length}`);

        const stock = await prisma.vaccineStock.findMany();
        console.log(`Total Stock Records: ${stock.length}`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
