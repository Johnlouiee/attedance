import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { AttendanceSession } from './attendance-session.entity';
import { User } from '../../auth/entities/user.entity';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  ABSENT = 'ABSENT',
}

@Entity('attendance_records')
@Unique(['sessionId', 'studentId'])
export class AttendanceRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sessionId: number;

  @Column()
  courseId: number;

  @Column()
  studentId: number;

  @Column({ type: 'enum', enum: AttendanceStatus })
  status: AttendanceStatus;

  @Column({ nullable: true, type: 'datetime' })
  scannedAt: Date | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
  latitude: number | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
  longitude: number | null;

  @ManyToOne(() => AttendanceSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: AttendanceSession;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @CreateDateColumn()
  createdAt: Date;
}
