import {
  Injectable, ConflictException,
  NotFoundException, BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import { Enrollment } from './entities/enrollment.entity';
import { Course } from '../courses/entities/course.entity';
import { User } from '../auth/entities/user.entity';
import { CoursesService } from '../courses/courses.service';

export class JoinCourseDto {
  inviteToken: string;
}

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollRepo: Repository<Enrollment>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly coursesService: CoursesService,
  ) {}

  /** Join a class using the teacher's invite link token */
  async joinByInvite(studentId: number, rawToken: string) {
    const inviteToken = this.extractInviteToken(rawToken);
    const user = await this.userRepo.findOne({ where: { id: studentId } });
    if (!user || user.role !== 'STUDENT') {
      throw new BadRequestException('Only student accounts can join a class.');
    }

    const course = await this.coursesService.findByInviteToken(inviteToken);

    const existing = await this.enrollRepo.findOne({
      where: { studentId, courseId: course.id },
    });
    if (existing) {
      throw new ConflictException(`You are already in "${course.code}".`);
    }

    const enrollment = this.enrollRepo.create({ studentId, courseId: course.id });
    await this.enrollRepo.save(enrollment);
    return {
      message: `Joined ${course.code} successfully.`,
      enrollmentId: enrollment.id,
      courseId: course.id,
      courseCode: course.code,
    };
  }

  /** Preview class info before joining */
  async getJoinPreview(rawToken: string) {
    const inviteToken = this.extractInviteToken(rawToken);
    return this.coursesService.getInvitePreview(inviteToken);
  }

  /** Get all enrolled courses for a student with teacher name */
  async getEnrolledCourses(studentId: number) {
    const enrollments = await this.enrollRepo.find({ where: { studentId } });
    if (!enrollments.length) return [];

    const courseIds = enrollments.map(e => e.courseId);
    const courses = await this.courseRepo.find({ where: { id: In(courseIds) } });

    const teacherIds = courses.map(c => c.teacherId).filter((id): id is number => !!id);
    const teachers = teacherIds.length
      ? await this.userRepo.find({ where: { id: In(teacherIds) } })
      : [];
    const teacherMap = new Map(teachers.map(t => [t.id, `${t.firstName} ${t.lastName}`]));

    return enrollments.map(e => {
      const course = courses.find(c => c.id === e.courseId)!;
      return {
        enrollmentId: e.id,
        courseId: course.id,
        code: course.code,
        name: course.name,
        credits: course.credits,
        assignedTeacher: course.teacherId
          ? (teacherMap.get(course.teacherId) || 'Unassigned')
          : 'Unassigned',
        enrolledAt: e.createdAt,
        ...this.coursesService.scheduleFields(course),
      };
    });
  }

  /** Drop (unenroll) a course */
  async unenroll(studentId: number, enrollmentId: number) {
    const enrollment = await this.enrollRepo.findOne({
      where: { id: enrollmentId, studentId },
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found or does not belong to you.');
    }
    await this.enrollRepo.remove(enrollment);
    return { message: 'Course dropped successfully.' };
  }

  private extractInviteToken(input: string) {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new BadRequestException('Invite link or class code is required.');
    }
    const match = trimmed.match(/\/join\/([a-f0-9]+)/i);
    if (match) return match[1];
    if (/^[a-f0-9]{32}$/i.test(trimmed)) return trimmed.toLowerCase();
    throw new BadRequestException('Invalid invite link. Paste the full link from your teacher.');
  }
}
