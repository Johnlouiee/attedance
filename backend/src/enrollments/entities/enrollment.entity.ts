import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Unique
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';

@Entity('enrollments')
@Unique(['studentId', 'courseId'])
export class Enrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  studentId: number;

  @Column()
  courseId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @CreateDateColumn()
  createdAt: Date;
}
