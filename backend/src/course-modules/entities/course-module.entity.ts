import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn
} from 'typeorm';

/** link & video = URL; file = file/download URL; text = written content in `content` */
export type ModuleType = 'link' | 'video' | 'file' | 'text';

@Entity('course_modules')
export class CourseModule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  courseId: number;

  @Column()
  teacherId: number;

  @Column()
  title: string;

  @Column({ type: 'varchar', length: 20, default: 'link' })
  type: ModuleType;

  @Column({ type: 'text', nullable: true })
  url: string | null;

  /** Body text when type is "text" */
  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
