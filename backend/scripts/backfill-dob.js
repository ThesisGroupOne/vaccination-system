// One-off: set date_of_birth for existing animals from their stored age (years)
const path = require('path');
const prisma = require(path.join(__dirname, '../config/db'));

async function main() {
  const animals = await prisma.animal.findMany({
    where: { date_of_birth: null },
    select: { animal_id: true, age: true, nickname: true },
  });
  console.log(`Backfilling DOB for ${animals.length} animals...`);

  for (const a of animals) {
    const months = Math.max(0, Math.round((a.age || 0) * 12));
    const dob = new Date();
    dob.setMonth(dob.getMonth() - months);
    dob.setHours(0, 0, 0, 0);
    await prisma.animal.update({
      where: { animal_id: a.animal_id },
      data: { date_of_birth: dob },
    });
    console.log(`  #${a.animal_id} ${a.nickname || 'Unnamed'}: ${months} months -> DOB ${dob.toISOString().slice(0, 10)}`);
  }

  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
