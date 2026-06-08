import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum AnnouncementTarget {
  ALL      = 'ALL',
  TEACHERS = 'TEACHERS',
  STUDENTS = 'STUDENTS',
  COURSE   = 'COURSE',
}

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column()
  authorId: number;

  @Column()
  authorName: string;

  @Column()
  authorRole: string;

  @Column({ type: 'enum', enum: AnnouncementTarget, default: AnnouncementTarget.ALL })
  targetAudience: AnnouncementTarget;

  /** Populated only when targetAudience === COURSE */
  @Column({ nullable: true })
  courseCode: string;

  @CreateDateColumn()
  createdAt: Date;
}
