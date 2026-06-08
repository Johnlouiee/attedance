import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { In, QueryFailedError } from 'typeorm';
import { createHmac, randomBytes } from 'crypto';
import {
  AttendanceSession,
  AttendanceSessionStatus,
} from './entities/attendance-session.entity';
import { AttendanceRecord, AttendanceStatus } from './entities/attendance-record.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { User } from '../auth/entities/user.entity';

export class StartAttendanceDto {
  courseId: number;
  durationMinutes?: number;
  lateAfterMinutes?: number;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
}

export class ScanAttendanceDto {
  token: string;
  latitude?: number;
  longitude?: number;
}

export class CheckInAttendanceDto {
  code: string;
  latitude?: number;
  longitude?: number;
}

@Injectable()
export class AttendanceService {
  private readonly codeAdjectives = [
    'Swift', 'Bright', 'Calm', 'Golden', 'Silver', 'Coral', 'Azure', 'Crimson',
    'Gentle', 'Misty', 'Sunny', 'Quiet', 'Bold', 'Lucky', 'Noble', 'Rustic',
    'Velvet', 'Amber', 'Ivory', 'Jade', 'Lunar', 'Marble', 'Northern', 'Ocean',
    'Prairie', 'Royal', 'Silent', 'Steady', 'Timber', 'Vivid',
  ];

  private readonly codeNouns = [
    'Falcon', 'River', 'Maple', 'Harbor', 'Summit', 'Cedar', 'Breeze', 'Comet',
    'Dolphin', 'Eagle', 'Forest', 'Garden', 'Horizon', 'Island', 'Juniper', 'Kite',
    'Lagoon', 'Meadow', 'Nebula', 'Orchid', 'Pebble', 'Quartz', 'Raven', 'Sparrow',
    'Thunder', 'Valley', 'Willow', 'Zephyr', 'Beacon', 'Canyon',
  ];

  constructor(
    @InjectRepository(AttendanceSession)
    private readonly sessionRepo: Repository<AttendanceSession>,
    @InjectRepository(AttendanceRecord)
    private readonly recordRepo: Repository<AttendanceRecord>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async startSession(teacherId: number, dto: StartAttendanceDto) {
    const course = await this.courseRepo.findOne({ where: { id: Number(dto.courseId) } });
    if (!course) throw new NotFoundException('Course not found.');
    if (course.teacherId !== teacherId) throw new ForbiddenException('You do not own this course.');

    await this.closeExpiredSessionsForCourse(course.id);

    const existing = await this.sessionRepo.findOne({
      where: { courseId: course.id, status: AttendanceSessionStatus.ACTIVE },
    });
    if (existing) {
      if (!existing.checkInCode) {
        await this.finalizeSession(existing);
      } else {
        return this.withToken(existing, course);
      }
    }

    const now = new Date();
    const durationMinutes = this.clamp(dto.durationMinutes ?? 3, 1, 240);
    const lateAfterMinutes = this.clamp(dto.lateAfterMinutes ?? durationMinutes, 0, durationMinutes);
    const session = this.sessionRepo.create({
      courseId: course.id,
      teacherId,
      status: AttendanceSessionStatus.ACTIVE,
      startedAt: now,
      lateAfter: new Date(now.getTime() + lateAfterMinutes * 60000),
      endsAt: new Date(now.getTime() + durationMinutes * 60000),
      qrRefreshSeconds: durationMinutes * 60,
      tokenSecret: randomBytes(24).toString('hex'),
      checkInCode: await this.generateUniqueCode(),
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      radiusMeters: dto.radiusMeters ?? null,
    });

    const saved = await this.sessionRepo.save(session);
    return this.withToken(saved, course);
  }

  async endSession(teacherId: number, sessionId: number) {
    const session = await this.getTeacherSession(teacherId, sessionId);
    return this.finalizeSession(session);
  }

  async startSessionForScheduler(teacherId: number, dto: StartAttendanceDto) {
    return this.startSession(teacherId, dto);
  }

  async finalizeSessionForScheduler(sessionId: number) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) return null;
    return this.finalizeSession(session);
  }

  async getActiveCourseSession(user: any, courseId: number) {
    await this.closeExpiredSessionsForCourse(courseId);
    const session = await this.sessionRepo.findOne({
      where: { courseId, status: AttendanceSessionStatus.ACTIVE },
      order: { startedAt: 'DESC' },
    });
    if (!session) return null;

    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found.');

    if (user.role === 'TEACHER' && Number(course.teacherId) !== Number(user.sub)) {
      throw new ForbiddenException('You do not own this course.');
    }
    if (user.role === 'STUDENT') {
      await this.assertEnrolled(user.sub, courseId);
      return this.toSessionResponse(session, course, false);
    }
    return this.toSessionResponse(session, course, user.role === 'TEACHER');
  }

  async getTeacherToken(teacherId: number, sessionId: number) {
    const session = await this.getTeacherSession(teacherId, sessionId);
    if (this.isExpired(session)) {
      return this.finalizeSession(session);
    }
    const course = await this.courseRepo.findOne({ where: { id: session.courseId } });
    if (!course) throw new NotFoundException('Course not found.');
    return this.withToken(session, course);
  }

  async scan(studentId: number, dto: ScanAttendanceDto) {
    const parsed = this.parseToken(dto.token);
    const session = await this.sessionRepo.findOne({ where: { id: parsed.sessionId } });
    if (!session) throw new BadRequestException('Attendance session not found.');

    // Validate token signature against the time-block in the token
    const currentBlock = this.currentTimeBlock();
    const blockAge = currentBlock - parsed.timeBlock;
    if (blockAge > 1 || blockAge < 0) {
      throw new BadRequestException('QR code has expired. Please scan the latest QR code.');
    }

    if (
      this.normalizeCode(session.checkInCode) !== parsed.code ||
      !this.isValidToken(session, parsed.timeBlock, parsed.signature)
    ) {
      throw new BadRequestException('QR code is expired or invalid.');
    }
    return this.recordCheckIn(studentId, session, dto.latitude, dto.longitude);
  }

  async checkInWithCode(studentId: number, courseId: number, dto: CheckInAttendanceDto) {
    await this.closeExpiredSessionsForCourse(courseId);
    const session = await this.sessionRepo.findOne({
      where: {
        courseId,
        status: AttendanceSessionStatus.ACTIVE,
        checkInCode: this.normalizeCode(dto.code),
      },
      order: { startedAt: 'DESC' },
    });
    if (!session) throw new BadRequestException('Invalid or expired attendance code.');
    return this.recordCheckIn(studentId, session, dto.latitude, dto.longitude);
  }

  async getMyActiveSessions(studentId: number) {
    const enrollments = await this.enrollmentRepo.find({ where: { studentId } });
    if (!enrollments.length) return [];

    const courseIds = enrollments.map(e => e.courseId);
    for (const courseId of courseIds) {
      await this.closeExpiredSessionsForCourse(courseId);
    }

    const sessions = await this.sessionRepo.find({
      where: { courseId: In(courseIds), status: AttendanceSessionStatus.ACTIVE },
      order: { endsAt: 'ASC' },
    });
    if (!sessions.length) return [];

    const existingRecords = await this.recordRepo.find({
      where: { studentId, sessionId: In(sessions.map(s => s.id)) },
    });
    const completedSessionIds = new Set(existingRecords.map(record => record.sessionId));
    const availableSessions = sessions.filter(session => !completedSessionIds.has(session.id));
    if (!availableSessions.length) return [];

    const courses = await this.courseRepo.find({ where: { id: In(availableSessions.map(s => s.courseId)) } });
    const courseMap = new Map(courses.map(c => [c.id, c]));
    return availableSessions.map(session => this.toSessionResponse(session, courseMap.get(session.courseId), false));
  }

  private async recordCheckIn(
    studentId: number,
    session: AttendanceSession,
    latitude?: number,
    longitude?: number,
  ) {
    if (this.isExpired(session)) {
      await this.finalizeSession(session);
      throw new BadRequestException('Attendance session has ended.');
    }
    if (session.status !== AttendanceSessionStatus.ACTIVE) {
      throw new BadRequestException('Attendance session is closed.');
    }

    await this.assertEnrolled(studentId, session.courseId);
    this.assertLocation(session, latitude, longitude);

    const existing = await this.recordRepo.findOne({
      where: { sessionId: session.id, studentId },
    });
    if (existing) throw new ConflictException('Attendance already recorded for this session.');

    const now = new Date();
    const status = now > session.lateAfter ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
    const record = this.recordRepo.create({
      sessionId: session.id,
      courseId: session.courseId,
      studentId,
      status,
      scannedAt: now,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    });
    try {
      await this.recordRepo.save(record);
    } catch (error) {
      if (this.isDuplicateEntryError(error)) {
        throw new ConflictException('Attendance already recorded for this session.');
      }
      throw error;
    }
    return { message: `Attendance marked as ${status.toLowerCase()}.`, status, scannedAt: now };
  }

  async getSessionRecords(teacherId: number, sessionId: number) {
    const session = await this.getTeacherSession(teacherId, sessionId);
    if (this.isExpired(session)) await this.finalizeSession(session);

    const records = await this.recordRepo.find({
      where: { sessionId },
      order: { status: 'ASC', createdAt: 'ASC' },
    });
    const studentIds = records.map(r => r.studentId);
    const students = studentIds.length
      ? await this.userRepo.find({ where: { id: In(studentIds) } })
      : [];
    const studentMap = new Map(students.map(s => [s.id, `${s.firstName} ${s.lastName}`]));

    return records.map(r => ({
      id: r.id,
      sessionId: r.sessionId,
      studentId: r.studentId,
      studentName: studentMap.get(r.studentId) || 'Unknown student',
      status: r.status,
      scannedAt: r.scannedAt,
    }));
  }

  async getTeacherTrackingSummary(teacherId: number) {
    const teacherIdNum = Number(teacherId);
    const courses = await this.courseRepo.find({
      where: { teacherId: teacherIdNum, teacherAssignmentStatus: 'accepted' },
      order: { code: 'ASC' },
    });
    if (!courses.length) {
      return { byCourse: [], allStudents: [] };
    }

    const courseIds = courses.map(c => c.id);
    const sessions = await this.sessionRepo.find({
      where: { courseId: In(courseIds), status: AttendanceSessionStatus.CLOSED },
    });
    const sessionIds = sessions.map(s => s.id);
    const records = sessionIds.length
      ? await this.recordRepo.find({ where: { sessionId: In(sessionIds) } })
      : [];

    const sessionsByCourse = new Map<number, AttendanceSession[]>();
    for (const session of sessions) {
      const list = sessionsByCourse.get(session.courseId) || [];
      list.push(session);
      sessionsByCourse.set(session.courseId, list);
    }

    const enrollments = await this.enrollmentRepo.find({ where: { courseId: In(courseIds) } });
    const studentIds = [...new Set(enrollments.map(e => e.studentId))];
    const students = studentIds.length
      ? await this.userRepo.find({ where: { id: In(studentIds) } })
      : [];
    const studentMap = new Map(students.map(s => [s.id, s]));

    const pctForStudentInCourse = (studentId: number, courseId: number) => {
      const courseSessions = sessionsByCourse.get(courseId) || [];
      const total = courseSessions.length;
      if (!total) return { attended: 0, total: 0, pct: null as number | null };
      const courseSessionIds = new Set(courseSessions.map(s => s.id));
      const studentRecords = records.filter(
        r => r.studentId === studentId && courseSessionIds.has(r.sessionId),
      );
      const attended = studentRecords.filter(
        r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE,
      ).length;
      return { attended, total, pct: Math.round((attended / total) * 100) };
    };

    const byCourse = courses.map(course => {
      const courseEnrollments = enrollments.filter(e => e.courseId === course.id);
      const courseSessions = sessionsByCourse.get(course.id) || [];
      const studentRows = courseEnrollments.map(e => {
        const student = studentMap.get(e.studentId);
        const stats = pctForStudentInCourse(e.studentId, course.id);
        return {
          studentId: e.studentId,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
          studentNumber: student?.studentId || '',
          sessionsAttended: stats.attended,
          sessionsTotal: stats.total,
          attendancePct: stats.pct,
        };
      });
      const withPct = studentRows.filter(s => s.attendancePct != null);
      const classPct = withPct.length
        ? Math.round(withPct.reduce((sum, s) => sum + (s.attendancePct || 0), 0) / withPct.length)
        : null;

      return {
        courseId: course.id,
        code: course.code,
        name: course.name,
        enrolledCount: courseEnrollments.length,
        sessionCount: courseSessions.length,
        classAttendancePct: classPct,
        students: studentRows.sort((a, b) => a.studentName.localeCompare(b.studentName)),
      };
    });

    const allStudents = studentIds.map(id => {
      const student = studentMap.get(id);
      const courseStats = courses
        .filter(c => enrollments.some(e => e.studentId === id && e.courseId === c.id))
        .map(c => {
          const stats = pctForStudentInCourse(id, c.id);
          return {
            courseId: c.id,
            courseCode: c.code,
            courseName: c.name,
            sessionsAttended: stats.attended,
            sessionsTotal: stats.total,
            attendancePct: stats.pct,
          };
        });
      const withPct = courseStats.filter(c => c.attendancePct != null);
      const overallPct = withPct.length
        ? Math.round(withPct.reduce((sum, c) => sum + (c.attendancePct || 0), 0) / withPct.length)
        : null;
      return {
        studentId: id,
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        studentNumber: student?.studentId || '',
        overallAttendancePct: overallPct,
        courses: courseStats,
      };
    }).sort((a, b) => a.studentName.localeCompare(b.studentName));

    return { byCourse, allStudents };
  }

  async getMyHistory(studentId: number) {
    const records = await this.recordRepo.find({
      where: { studentId },
      order: { createdAt: 'DESC' },
    });
    if (!records.length) return [];

    const courseIds = [...new Set(records.map(r => r.courseId))];
    const courses = await this.courseRepo.find({ where: { id: In(courseIds) } });
    const courseMap = new Map(courses.map(c => [c.id, c]));
    return records.map(r => {
      const course = courseMap.get(r.courseId);
      return {
        id: r.id,
        courseId: r.courseId,
        courseCode: course?.code || '',
        courseName: course?.name || 'Unknown course',
        status: r.status,
        scannedAt: r.scannedAt,
        createdAt: r.createdAt,
      };
    });
  }

  private async getTeacherSession(teacherId: number, sessionId: number) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Attendance session not found.');
    if (session.teacherId !== teacherId) throw new ForbiddenException('You do not own this session.');
    return session;
  }

  private async finalizeSession(session: AttendanceSession) {
    const fresh = await this.sessionRepo.findOne({ where: { id: session.id } });
    if (!fresh || fresh.status === AttendanceSessionStatus.CLOSED) {
      return this.toSessionResponse(fresh || session, undefined, false);
    }

    const enrollments = await this.enrollmentRepo.find({ where: { courseId: fresh.courseId } });
    const existing = await this.recordRepo.find({ where: { sessionId: fresh.id } });
    const recordedIds = new Set(existing.map(r => r.studentId));

    for (const enrollment of enrollments) {
      if (recordedIds.has(enrollment.studentId)) continue;
      try {
        await this.recordRepo.save(this.recordRepo.create({
          sessionId: fresh.id,
          courseId: fresh.courseId,
          studentId: enrollment.studentId,
          status: AttendanceStatus.ABSENT,
          scannedAt: null,
          latitude: null,
          longitude: null,
        }));
      } catch (error) {
        if (!this.isDuplicateEntryError(error)) throw error;
      }
    }

    fresh.status = AttendanceSessionStatus.CLOSED;
    const saved = await this.sessionRepo.save(fresh);
    return this.toSessionResponse(saved, undefined, false);
  }

  private isDuplicateEntryError(error: unknown) {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError = (error as QueryFailedError & { driverError?: { code?: string } }).driverError;
    return driverError?.code === 'ER_DUP_ENTRY';
  }

  private async closeExpiredSessionsForCourse(courseId: number) {
    const active = await this.sessionRepo.find({
      where: { courseId, status: AttendanceSessionStatus.ACTIVE },
    });
    for (const session of active) {
      if (this.isExpired(session)) await this.finalizeSession(session);
    }
  }

  private async assertEnrolled(studentId: number, courseId: number) {
    const enrollment = await this.enrollmentRepo.findOne({ where: { studentId, courseId } });
    if (!enrollment) throw new ForbiddenException('You are not enrolled in this course.');
  }

  private assertLocation(session: AttendanceSession, latitude?: number, longitude?: number) {
    if (session.latitude === null || session.longitude === null || !session.radiusMeters) return;
    if (latitude === undefined || longitude === undefined) {
      throw new BadRequestException('Location is required for this attendance session.');
    }
    const distance = this.distanceMeters(Number(session.latitude), Number(session.longitude), latitude, longitude);
    if (distance > session.radiusMeters) {
      throw new BadRequestException('You are outside the allowed attendance area.');
    }
  }

  private withToken(session: AttendanceSession, course?: Course) {
    return {
      ...this.toSessionResponse(session, course, true),
      qrPayload: this.generateToken(session),
      qrExpiresAt: session.endsAt,
      checkInCode: session.checkInCode,
    };
  }

  private toSessionResponse(session: AttendanceSession, course?: Course, includeToken = false) {
    return {
      id: session.id,
      courseId: session.courseId,
      courseCode: course?.code,
      courseName: course?.name,
      status: session.status,
      startedAt: session.startedAt,
      lateAfter: session.lateAfter,
      endsAt: session.endsAt,
      qrRefreshSeconds: session.qrRefreshSeconds,
      requiresLocation: session.latitude !== null && session.longitude !== null && !!session.radiusMeters,
      includeToken,
    };
  }

  private generateToken(session: AttendanceSession) {
    const timeBlock = this.currentTimeBlock();
    const signature = this.sign(session, timeBlock);
    return `ATTEND:${session.id}:${session.checkInCode}:${timeBlock}:${signature}`;
  }

  private parseToken(token: string) {
    const parts = token.trim().split(':');
    // Format: ATTEND:<sessionId>:<checkInCode>:<timeBlock>:<signature>
    if (parts.length < 5 || parts[0] !== 'ATTEND') {
      throw new BadRequestException('Invalid QR token format.');
    }
    const sessionId = Number(parts[1]);
    const signature = parts[parts.length - 1];
    const timeBlock = Number(parts[parts.length - 2]);
    const code = this.normalizeCode(parts.slice(2, -2).join(':'));
    if (!Number.isFinite(sessionId) || !Number.isFinite(timeBlock) || !code || !signature) {
      throw new BadRequestException('Invalid QR token format.');
    }
    return { sessionId, code, timeBlock, signature };
  }

  private isValidToken(session: AttendanceSession, timeBlock: number, signature: string) {
    return this.sign(session, timeBlock) === signature;
  }

  private sign(session: AttendanceSession, timeBlock: number) {
    return createHmac('sha256', session.tokenSecret)
      .update(`${session.id}:${session.courseId}:${session.teacherId}:${session.checkInCode}:${timeBlock}`)
      .digest('hex')
      .slice(0, 32);
  }

  /** Returns the current 1-minute time block index (minutes since Unix epoch) */
  private currentTimeBlock(): number {
    return Math.floor(Date.now() / 60000);
  }

  private isExpired(session: AttendanceSession) {
    return Date.now() >= new Date(session.endsAt).getTime();
  }

  private normalizeCode(code: string) {
    return code.trim().replace(/\s+/g, ' ').toUpperCase();
  }

  private async generateUniqueCode() {
    for (let attempt = 0; attempt < 30; attempt++) {
      const adj = this.codeAdjectives[Math.floor(Math.random() * this.codeAdjectives.length)];
      const noun = this.codeNouns[Math.floor(Math.random() * this.codeNouns.length)];
      const code = this.normalizeCode(`${adj} ${noun}`);
      const existing = await this.sessionRepo.findOne({
        where: { checkInCode: code, status: AttendanceSessionStatus.ACTIVE },
      });
      if (!existing) return code;
    }
    return this.normalizeCode(
      `${this.codeAdjectives[0]} ${this.codeNouns[0]} ${randomBytes(2).toString('hex')}`,
    );
  }

  private distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const radius = 6371000;
    const toRad = (value: number) => value * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(Number(value) || min, min), max);
  }
}
