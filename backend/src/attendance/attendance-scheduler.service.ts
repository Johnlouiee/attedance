import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Course } from '../courses/entities/course.entity';
import {
  AttendanceSession,
  AttendanceSessionStatus,
} from './entities/attendance-session.entity';
import { AttendanceService } from './attendance.service';

@Injectable()
export class AttendanceSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AttendanceSchedulerService.name);
  private intervalId?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(AttendanceSession)
    private readonly sessionRepo: Repository<AttendanceSession>,
    private readonly attendanceService: AttendanceService,
  ) {}

  onModuleInit() {
    this.tick();
    this.intervalId = setInterval(() => this.tick(), 60_000);
  }

  onModuleDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private async tick() {
    try {
      const courses = await this.courseRepo.find({
        where: { teacherAssignmentStatus: 'accepted' },
      });

      const now = new Date();
      const day = now.getDay();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      for (const course of courses) {
        if (!course.teacherId || !course.classStartTime || !course.classEndTime) continue;

        const days = (course.classDays || '1,2,3,4,5')
          .split(',')
          .map(d => Number(d.trim()))
          .filter(d => !Number.isNaN(d));
        if (!days.includes(day)) continue;

        const startMinutes = this.parseTime(course.classStartTime);
        const endMinutes = this.parseTime(course.classEndTime);
        const autoStartMinutes = startMinutes + (course.autoStartOffsetMinutes ?? 5);

        const active = await this.sessionRepo.findOne({
          where: { courseId: course.id, status: AttendanceSessionStatus.ACTIVE },
        });

        if (currentMinutes >= endMinutes && active) {
          await this.attendanceService.finalizeSessionForScheduler(active.id);
          continue;
        }

        if (
          currentMinutes >= autoStartMinutes &&
          currentMinutes < endMinutes &&
          !active
        ) {
          const durationMinutes = Math.max(1, endMinutes - currentMinutes);
          const lateAfterMinutes = Math.min(5, durationMinutes);
          await this.attendanceService.startSessionForScheduler(course.teacherId, {
            courseId: course.id,
            durationMinutes,
            lateAfterMinutes,
          });
          this.logger.log(
            `Auto-started attendance for ${course.code} (${course.classStartTime}-${course.classEndTime})`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Attendance scheduler tick failed', error as Error);
    }
  }

  private parseTime(value: string) {
    const [h, m] = value.split(':').map(Number);
    return h * 60 + (m || 0);
  }
}
