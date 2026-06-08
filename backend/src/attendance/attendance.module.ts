import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceSchedulerService } from './attendance-scheduler.service';
import { AttendanceSession } from './entities/attendance-session.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendanceSession,
      AttendanceRecord,
      Course,
      Enrollment,
      User,
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceSchedulerService],
})
export class AttendanceModule {}
