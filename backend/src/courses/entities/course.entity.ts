import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({
    type: 'varchar',
    length: 32,
    unique: true,
    nullable: true,
    transformer: {
      to: (value: string | null | undefined) => {
        if (value == null) return null;
        const trimmed = String(value).trim();
        return trimmed.length > 0 ? trimmed : null;
      },
      from: (value: string | null) => value,
    },
  })
  inviteToken: string | null;

  @Column({ default: 3 })
  credits: number;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true })
  teacherId: number;

  @Column({
    type: 'varchar',
    length: 30,
    default: 'accepted',
    nullable: true,
  })
  teacherAssignmentStatus: 'pending' | 'accepted' | 'declined' | null;

  /** Class period start, 24h format e.g. "13:30" */
  @Column({ type: 'varchar', length: 5, nullable: true })
  classStartTime: string | null;

  /** Class period end, 24h format e.g. "14:30" */
  @Column({ type: 'varchar', length: 5, nullable: true })
  classEndTime: string | null;

  /** Comma-separated weekday indexes (0=Sun … 6=Sat), e.g. "1,2,3,4,5" */
  @Column({ type: 'varchar', length: 20, default: '1,2,3,4,5' })
  classDays: string;

  /** Minutes after class start to auto-open attendance (default 5 → 1:35 for 1:30 class) */
  @Column({ type: 'int', default: 5 })
  autoStartOffsetMinutes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
