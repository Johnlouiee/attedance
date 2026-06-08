import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import * as dotenv from 'dotenv';
import { User, UserRole, UserStatus } from './auth/entities/user.entity';
import { Course } from './courses/entities/course.entity';

dotenv.config();

const SUBJECTS: Array<{
  code: string;
  name: string;
  credits: number;
  teacherEmail: string;
  classStartTime: string;
  classEndTime: string;
}> = [
  { code: 'CS-101', name: 'Introduction to Programming', credits: 3, teacherEmail: 'teacher1@attengard.edu', classStartTime: '08:00', classEndTime: '09:30' },
  { code: 'CS-201', name: 'Data Structures', credits: 3, teacherEmail: 'teacher1@attengard.edu', classStartTime: '10:00', classEndTime: '11:30' },
  { code: 'CS-301', name: 'Algorithms', credits: 4, teacherEmail: 'teacher2@attengard.edu', classStartTime: '13:30', classEndTime: '14:30' },
  { code: 'MATH-101', name: 'Calculus I', credits: 3, teacherEmail: 'teacher2@attengard.edu', classStartTime: '09:00', classEndTime: '10:30' },
  { code: 'MATH-201', name: 'Linear Algebra', credits: 3, teacherEmail: 'teacher3@attengard.edu', classStartTime: '11:00', classEndTime: '12:30' },
  { code: 'ENG-101', name: 'Technical Writing', credits: 2, teacherEmail: 'teacher3@attengard.edu', classStartTime: '14:00', classEndTime: '15:30' },
  { code: 'PHY-101', name: 'General Physics', credits: 4, teacherEmail: 'teacher1@attengard.edu', classStartTime: '13:00', classEndTime: '14:30' },
  { code: 'CHEM-101', name: 'General Chemistry', credits: 4, teacherEmail: 'teacher2@attengard.edu', classStartTime: '15:00', classEndTime: '16:30' },
  { code: 'BIO-101', name: 'General Biology', credits: 3, teacherEmail: 'teacher3@attengard.edu', classStartTime: '08:30', classEndTime: '10:00' },
  { code: 'IT-201', name: 'Web Development', credits: 3, teacherEmail: 'teacher1@attengard.edu', classStartTime: '15:30', classEndTime: '17:00' },
];

const TEACHERS = [
  { firstName: 'Maria', lastName: 'Santos', email: 'teacher1@attengard.edu' },
  { firstName: 'James', lastName: 'Carter', email: 'teacher2@attengard.edu' },
  { firstName: 'Elena', lastName: 'Reyes', email: 'teacher3@attengard.edu' },
];

/**
 * Seed Script — creates admin, demo teachers, and 10 subjects with class schedules.
 * Run with: npm run seed
 */
async function seed() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [User, Course],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('Connected to database.');

  await dataSource.query(
    `UPDATE courses SET inviteToken = NULL WHERE inviteToken = '' OR TRIM(inviteToken) = ''`,
  );

  const userRepo = dataSource.getRepository(User);
  const courseRepo = dataSource.getRepository(Course);
  const passwordHash = await bcrypt.hash('Demo@1234!', 12);

  const admin = await userRepo.findOne({ where: { email: 'admin@attengard.edu' } });
  if (!admin) {
    await userRepo.save(userRepo.create({
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@attengard.edu',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    }));
    console.log('Admin created: admin@attengard.edu / Demo@1234!');
  } else {
    console.log('Admin already exists.');
  }

  const teacherMap = new Map<string, User>();
  for (const teacher of TEACHERS) {
    let user = await userRepo.findOne({ where: { email: teacher.email } });
    if (!user) {
      user = await userRepo.save(userRepo.create({
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        passwordHash,
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
      }));
      console.log(`Teacher created: ${teacher.email}`);
    } else {
      console.log(`Teacher already exists: ${teacher.email}`);
    }
    teacherMap.set(teacher.email, user);
  }

  let createdCourses = 0;
  let updatedCourses = 0;
  for (const subject of SUBJECTS) {
    const teacher = teacherMap.get(subject.teacherEmail);
    if (!teacher) continue;

    const existing = await courseRepo.findOne({ where: { code: subject.code } });
    if (existing) {
      existing.classStartTime = subject.classStartTime;
      existing.classEndTime = subject.classEndTime;
      existing.classDays = '1,2,3,4,5';
      existing.autoStartOffsetMinutes = 5;
      if (!existing.inviteToken?.trim()) {
        existing.inviteToken = randomBytes(16).toString('hex');
      }
      await courseRepo.save(existing);
      updatedCourses += 1;
      console.log(`Course schedule updated: ${subject.code} (${subject.classStartTime}-${subject.classEndTime})`);
      continue;
    }

    await courseRepo.save(courseRepo.create({
      code: subject.code,
      name: subject.name,
      credits: subject.credits,
      teacherId: teacher.id,
      teacherAssignmentStatus: 'accepted',
      description: `${subject.name} — demo subject for attendance testing.`,
      classStartTime: subject.classStartTime,
      classEndTime: subject.classEndTime,
      classDays: '1,2,3,4,5',
      autoStartOffsetMinutes: 5,
      inviteToken: randomBytes(16).toString('hex'),
    }));
    createdCourses += 1;
    console.log(`Course created: ${subject.code} — ${subject.name}`);
  }

  console.log(`Done. ${createdCourses} new, ${updatedCourses} schedule(s) updated.`);
  console.log('Demo teacher password: Demo@1234!');
  console.log('Attendance auto-starts 5 minutes after class start (e.g. 13:35 for 13:30 class).');

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
