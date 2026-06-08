import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn
} from 'typeorm';

@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  studentId: number;

  @Column({ default: 'Untitled Note' })
  title: string;

  @Column({ type: 'text' })
  content: string;

  /** Hex color for the sticky card e.g. #fef9c3 */
  @Column({ default: '#fef9c3' })
  color: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
