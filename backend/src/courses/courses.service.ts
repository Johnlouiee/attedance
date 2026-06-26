import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import { randomBytes } from 'crypto';
import { Course } from './entities/course.entity';
import { User, UserRole } from '../auth/entities/user.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';

export class CreateCourseDto {
  code: string;
  name: string;
  credits?: number;
  teacherId?: number;
  teacherAssignmentStatus?: 'pending' | 'accepted' | 'declined' | null;
  classStartTime?: string;
  classEndTime?: string;
  classDays?: string;
  autoStartOffsetMinutes?: number;
  enableAutoStart?: boolean;
}

export class CreateTeacherCourseDto {
  code: string;
  name: string;
  classStartTime: string;
  classEndTime: string;
  classDays?: string;
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Enrollment)
    private readonly enrollRepo: Repository<Enrollment>,
  ) {}

  async findAll() {
    const courses = await this.courseRepo.find({ order: { code: 'ASC' } });
    const teacherIds = courses.map(c => c.teacherId).filter((id): id is number => !!id);
    const teachers = teacherIds.length 
      ? await this.userRepo.find({ where: { id: In(teacherIds) } }) 
      : [];
    const teacherMap = new Map(teachers.map(t => [t.id, `${t.firstName} ${t.lastName}`]));

    return courses.map(c => ({
      id: c.id,
      code: c.code,
      name: c.name,
      credits: c.credits,
      teacherId: c.teacherId,
      assignedTeacher: c.teacherId ? (teacherMap.get(c.teacherId) || 'Unassigned') : 'Unassigned',
      teacherAssignmentStatus: c.teacherAssignmentStatus,
      studentCount: 0,
    }));
  }

  async findByTeacher(teacherId: number | string) {
    const tid = Number(teacherId);
    const courses = await this.courseRepo.find({
      where: { teacherId: tid, teacherAssignmentStatus: 'accepted' },
      order: { code: 'ASC' },
    });
    for (const course of courses) {
      if (!course.inviteToken || !course.inviteTokenExpiresAt) {
        course.inviteToken = course.inviteToken || this.generateInviteToken();
        course.inviteTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await this.courseRepo.save(course);
      }
    }
    return courses.map(c => this.toTeacherCourse(c));
  }

  private toTeacherCourse(c: Course) {
    const isExpired = c.inviteTokenExpiresAt ? (new Date() > new Date(c.inviteTokenExpiresAt)) : false;
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      credits: c.credits,
      teacherId: c.teacherId,
      teacherAssignmentStatus: c.teacherAssignmentStatus,
      classStartTime: c.classStartTime,
      classEndTime: c.classEndTime,
      classDays: c.classDays,
      autoStartOffsetMinutes: c.autoStartOffsetMinutes,
      enableAutoStart: c.enableAutoStart,
      scheduleLabel: this.formatScheduleLabel(c),
      inviteToken: c.inviteToken,
      inviteTokenExpiresAt: c.inviteTokenExpiresAt,
      inviteLink: this.getInviteLink(c.inviteToken),
      isInviteExpired: isExpired,
    };
  }

  private getLocalIp(): string {
    const interfaces = require('os').networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    return 'localhost';
  }

  getInviteLink(token: string | null): string {
    if (!token) return '';
    let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    if (frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1')) {
      const localIp = this.getLocalIp();
      frontendUrl = frontendUrl.replace('localhost', localIp).replace('127.0.0.1', localIp);
    }
    return `${frontendUrl}/student/join/${token}`;
  }

  generateInviteToken() {
    return randomBytes(16).toString('hex');
  }

  async findByInviteToken(token: string) {
    const course = await this.courseRepo.findOne({
      where: { inviteToken: token.trim() },
    });
    if (!course) throw new NotFoundException('Invalid or expired invite link.');
    if (!course.teacherId || course.teacherAssignmentStatus !== 'accepted') {
      throw new BadRequestException('This class is not open for enrollment.');
    }
    if (course.inviteTokenExpiresAt && new Date() > new Date(course.inviteTokenExpiresAt)) {
      throw new BadRequestException('This invitation link has expired. Please request a new link from your teacher.');
    }
    return course;
  }

  async getInvitePreview(token: string) {
    const course = await this.findByInviteToken(token);
    const teacher = course.teacherId
      ? await this.userRepo.findOne({ where: { id: course.teacherId } })
      : null;
    return {
      courseId: course.id,
      code: course.code,
      name: course.name,
      credits: course.credits,
      assignedTeacher: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned',
      ...this.scheduleFields(course),
      inviteToken: course.inviteToken,
      isInviteExpired: course.inviteTokenExpiresAt ? (new Date() > new Date(course.inviteTokenExpiresAt)) : false,
    };
  }

  formatScheduleLabel(course: Pick<Course, 'classStartTime' | 'classEndTime'>) {
    if (!course.classStartTime || !course.classEndTime) return null;
    return `${this.formatDisplayTime(course.classStartTime)} – ${this.formatDisplayTime(course.classEndTime)}`;
  }

  scheduleFields(course: Course) {
    return {
      classStartTime: course.classStartTime,
      classEndTime: course.classEndTime,
      classDays: course.classDays,
      autoStartOffsetMinutes: course.autoStartOffsetMinutes,
      scheduleLabel: this.formatScheduleLabel(course),
    };
  }

  private normalizeTime24(value: string) {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      throw new BadRequestException('Class time must be in HH:MM format (e.g. 13:30).');
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) {
      throw new BadRequestException('Invalid class time.');
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private resolveSchedule(dto: CreateCourseDto) {
    const start = dto.classStartTime?.trim();
    const end = dto.classEndTime?.trim();
    if (dto.teacherId && (!start || !end)) {
      throw new BadRequestException('Class start and end times are required when creating a course.');
    }
    if (!start && !end) {
      return { classStartTime: null, classEndTime: null, classDays: '1,2,3,4,5', autoStartOffsetMinutes: 5 };
    }
    if (!start || !end) {
      throw new BadRequestException('Both class start time and end time are required.');
    }
    const classStartTime = this.normalizeTime24(start);
    const classEndTime = this.normalizeTime24(end);
    const startMinutes = this.parseTime24(classStartTime);
    const endMinutes = this.parseTime24(classEndTime);
    if (endMinutes <= startMinutes) {
      throw new BadRequestException('Class end time must be after start time.');
    }
    return {
      classStartTime,
      classEndTime,
      classDays: dto.classDays?.trim() || '1,2,3,4,5',
      autoStartOffsetMinutes: dto.autoStartOffsetMinutes ?? 5,
    };
  }

  private parseTime24(value: string) {
    const [h, m] = value.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  private formatDisplayTime(time24: string) {
    const [hStr, mStr] = time24.split(':');
    let h = Number(hStr);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }

  async findPendingAssignments(teacherId: number) {
    const courses = await this.courseRepo.find({
      where: { teacherId, teacherAssignmentStatus: 'pending' },
      order: { code: 'ASC' },
    });
    return courses.map(c => ({
      id: c.id,
      code: c.code,
      name: c.name,
      credits: c.credits,
      teacherId: c.teacherId,
      teacherAssignmentStatus: c.teacherAssignmentStatus,
    }));
  }

  async acceptAssignment(courseId: number, teacherId: number) {
    const course = await this.courseRepo.findOne({ where: { id: courseId, teacherId } });
    if (!course) {
      throw new NotFoundException(`Course assignment not found.`);
    }
    course.teacherAssignmentStatus = 'accepted';
    if (!course.inviteToken) {
      course.inviteToken = this.generateInviteToken();
      course.inviteTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    }
    await this.courseRepo.save(course);
    return { message: 'Course assignment accepted.', course };
  }

  async declineAssignment(courseId: number, teacherId: number) {
    const course = await this.courseRepo.findOne({ where: { id: courseId, teacherId } });
    if (!course) {
      throw new NotFoundException(`Course assignment not found.`);
    }
    course.teacherAssignmentStatus = 'declined';
    await this.courseRepo.save(course);
    return { message: 'Course assignment declined.', course };
  }

  async createForTeacher(teacherId: number, dto: CreateTeacherCourseDto) {
    return this.create({
      code: dto.code,
      name: dto.name,
      classStartTime: dto.classStartTime,
      classEndTime: dto.classEndTime,
      classDays: dto.classDays,
      teacherId: Number(teacherId),
      teacherAssignmentStatus: 'accepted',
      credits: 3,
    });
  }

  async regenerateInviteToken(courseId: number, userPayload: { sub: number; role: string }) {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Course not found.');
    }
    if (userPayload.role === 'TEACHER' && course.teacherId !== Number(userPayload.sub)) {
      throw new ForbiddenException('You can only regenerate invite links for your own courses.');
    }
    course.inviteToken = this.generateInviteToken();
    course.inviteTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.courseRepo.save(course);
    return this.toTeacherCourse(course);
  }

  async create(dto: CreateCourseDto) {
    const codeUpper = dto.code.toUpperCase().trim();
    if (!dto.name?.trim()) {
      throw new BadRequestException('Course title is required.');
    }
    const existing = await this.courseRepo.findOne({ where: { code: codeUpper } });
    if (existing) {
      throw new ConflictException(`Course with code ${codeUpper} already exists.`);
    }

    const schedule = this.resolveSchedule(dto);
    const creditsNum = Number(dto.credits);
    const credits =
      dto.credits == null || Number.isNaN(creditsNum)
        ? 3
        : Math.min(6, Math.max(1, creditsNum));

    const course = this.courseRepo.create({
      code: codeUpper,
      name: dto.name.trim(),
      credits,
      teacherId: dto.teacherId != null ? Number(dto.teacherId) : undefined,
      teacherAssignmentStatus: dto.teacherAssignmentStatus !== undefined
        ? dto.teacherAssignmentStatus
        : (dto.teacherId ? 'accepted' : null),
      inviteToken: this.generateInviteToken(),
      inviteTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      enableAutoStart: dto.enableAutoStart !== undefined ? dto.enableAutoStart : true,
      ...schedule,
    });

    const saved = await this.courseRepo.save(course);
    return { ...saved, scheduleLabel: this.formatScheduleLabel(saved) };
  }

  async update(id: number, dto: Partial<CreateCourseDto>, userPayload: { sub: number; role: string }) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException(`Course not found.`);
    }

    if (userPayload.role === 'TEACHER' && course.teacherId !== Number(userPayload.sub)) {
      throw new ForbiddenException('You can only update your own courses.');
    }

    if (dto.code) {
      const codeUpper = dto.code.toUpperCase().trim();
      if (codeUpper !== course.code) {
        const existing = await this.courseRepo.findOne({ where: { code: codeUpper } });
        if (existing) {
          throw new ConflictException(`Course with code ${codeUpper} already exists.`);
        }
        course.code = codeUpper;
      }
    }

    if (dto.name !== undefined) {
      course.name = dto.name.trim();
    }

    if (dto.credits !== undefined) {
      const creditsNum = Number(dto.credits);
      course.credits = Number.isNaN(creditsNum)
        ? 3
        : Math.min(6, Math.max(1, creditsNum));
    }

    if (dto.classStartTime !== undefined || dto.classEndTime !== undefined) {
      const start = dto.classStartTime ?? course.classStartTime;
      const end = dto.classEndTime ?? course.classEndTime;
      if (start && end) {
        course.classStartTime = this.normalizeTime24(start);
        course.classEndTime = this.normalizeTime24(end);
        const startMinutes = this.parseTime24(course.classStartTime);
        const endMinutes = this.parseTime24(course.classEndTime);
        if (endMinutes <= startMinutes) {
          throw new BadRequestException('Class end time must be after start time.');
        }
      }
    }

    if (dto.classDays !== undefined) {
      course.classDays = dto.classDays.trim();
    }

    if (dto.autoStartOffsetMinutes !== undefined) {
      course.autoStartOffsetMinutes = dto.autoStartOffsetMinutes;
    }

    if (dto.enableAutoStart !== undefined) {
      course.enableAutoStart = dto.enableAutoStart;
    }

    if (userPayload.role === 'ADMIN') {
      if (dto.teacherId !== undefined) {
        course.teacherId = dto.teacherId != null ? Number(dto.teacherId) : null as any;
      }
      if (dto.teacherAssignmentStatus !== undefined) {
        course.teacherAssignmentStatus = dto.teacherAssignmentStatus;
      }
    }

    const saved = await this.courseRepo.save(course);
    return { ...saved, scheduleLabel: this.formatScheduleLabel(saved) };
  }

  async remove(id: number, userPayload: { sub: number; role: string }) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException(`Course not found.`);
    }
    if (userPayload.role === 'TEACHER' && course.teacherId !== Number(userPayload.sub)) {
      throw new ForbiddenException('You can only delete your own courses.');
    }
    await this.courseRepo.remove(course);
    return { message: 'Course deleted.' };
  }

  async getRoster(courseId: number, userPayload: { sub: number; role: string }) {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course not found.`);
    }
    if (userPayload.role === 'TEACHER' && course.teacherId !== Number(userPayload.sub)) {
      throw new ForbiddenException('You can only view rosters for your own courses.');
    }

    const enrollments = await this.enrollRepo.find({
      where: { courseId },
      order: { createdAt: 'DESC' },
    });

    if (enrollments.length === 0) return [];

    const studentIds = enrollments.map(e => e.studentId);
    const students = await this.userRepo.find({
      where: { id: In(studentIds) },
    });

    return enrollments.map(e => {
      const student = students.find(s => s.id === e.studentId);
      return {
        enrollmentId: e.id,
        studentId: student ? student.id : e.studentId,
        firstName: student ? student.firstName : 'Unknown',
        lastName: student ? student.lastName : 'Student',
        email: student ? student.email : 'N/A',
        studentNumber: student ? student.studentId : 'N/A',
        enrolledAt: e.createdAt,
      };
    });
  }

  async enrollStudent(courseId: number, studentIdOrEmail: string, userPayload: { sub: number; role: string }) {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course not found.`);
    }
    if (userPayload.role === 'TEACHER' && course.teacherId !== Number(userPayload.sub)) {
      throw new ForbiddenException('You can only enroll students in your own courses.');
    }

    const trimmed = studentIdOrEmail.trim();
    if (!trimmed) {
      throw new BadRequestException('Student ID or Email is required.');
    }

    const student = await this.userRepo.findOne({
      where: [
        { studentId: trimmed, role: UserRole.STUDENT },
        { email: trimmed, role: UserRole.STUDENT },
      ],
    });

    if (!student) {
      throw new NotFoundException('No active student account found with this ID or Email.');
    }

    const existing = await this.enrollRepo.findOne({
      where: { courseId, studentId: student.id },
    });
    if (existing) {
      throw new ConflictException(`Student ${student.firstName} ${student.lastName} is already enrolled in this course.`);
    }

    const enrollment = this.enrollRepo.create({
      courseId,
      studentId: student.id,
    });
    await this.enrollRepo.save(enrollment);

    return {
      message: `Enrolled ${student.firstName} ${student.lastName} successfully.`,
      enrollment: {
        enrollmentId: enrollment.id,
        studentId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        studentNumber: student.studentId,
        enrolledAt: enrollment.createdAt,
      },
    };
  }

  async unenrollStudent(courseId: number, enrollmentId: number, userPayload: { sub: number; role: string }) {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course not found.`);
    }
    if (userPayload.role === 'TEACHER' && course.teacherId !== Number(userPayload.sub)) {
      throw new ForbiddenException('You can only remove students from your own courses.');
    }

    const enrollment = await this.enrollRepo.findOne({
      where: { id: enrollmentId, courseId },
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found in this course.');
    }

    await this.enrollRepo.remove(enrollment);
    return { message: 'Student removed from course successfully.' };
  }
}
