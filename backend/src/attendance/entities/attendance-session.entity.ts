import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Course } from '../../courses/entities/course.entity';
import { User } from '../../auth/entities/user.entity';

export enum AttendanceSessionStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

@Entity('attendance_sessions')
export class AttendanceSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  courseId: number;

  @Column()
  teacherId: number;

  @Column({ type: 'enum', enum: AttendanceSessionStatus, default: AttendanceSessionStatus.ACTIVE })
  status: AttendanceSessionStatus;

  @Column({ type: 'datetime' })
  startedAt: Date;

  @Column({ type: 'datetime' })
  lateAfter: Date;

  @Column({ type: 'datetime' })
  endsAt: Date;

  @Column({ default: 30 })
  qrRefreshSeconds: number;

  @Column()
  tokenSecret: string;

  @Column({ length: 64, nullable: true })
  checkInCode: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
  latitude: number | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
  longitude: number | null;

  @Column({ nullable: true, type: 'int' })
  radiusMeters: number | null;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
