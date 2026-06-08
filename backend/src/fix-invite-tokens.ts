import { DataSource } from 'typeorm';
import { randomBytes } from 'crypto';
import * as dotenv from 'dotenv';
import { Course } from './courses/entities/course.entity';

dotenv.config();

/**
 * Repairs duplicate empty inviteToken values that break the unique index.
 * Run once: npm run fix:invite-tokens
 */
async function fixInviteTokens() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [Course],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('Connected. Normalizing invite tokens...');

  await dataSource.query(
    `UPDATE courses SET inviteToken = NULL WHERE inviteToken = '' OR TRIM(inviteToken) = ''`,
  );

  const courseRepo = dataSource.getRepository(Course);
  const courses = await courseRepo.find();
  let updated = 0;

  for (const course of courses) {
    const token = course.inviteToken?.trim();
    if (!token) {
      course.inviteToken = randomBytes(16).toString('hex');
      await courseRepo.save(course);
      updated += 1;
      console.log(`Token set for ${course.code}`);
    }
  }

  console.log(`Done. ${updated} course(s) received new invite tokens.`);
  await dataSource.destroy();
}

fixInviteTokens().catch((err) => {
  console.error('Fix failed:', err);
  process.exit(1);
});
