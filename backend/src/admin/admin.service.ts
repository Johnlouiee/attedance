import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../auth/entities/user.entity';
import { Course } from '../courses/entities/course.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
  ) {}

  // ─── GET STATS ──────────────────────────────────────────────
  async getStats() {
    const totalStudents = await this.userRepo.count({ where: { role: UserRole.STUDENT } });
    const totalTeachers = await this.userRepo.count({ where: { role: UserRole.TEACHER } });
    const totalAdmins   = await this.userRepo.count({ where: { role: UserRole.ADMIN } });
    return { totalStudents, totalTeachers, totalAdmins, total: totalStudents + totalTeachers + totalAdmins };
  }

  // ─── GET ALL USERS ───────────────────────────────────────────
  async getAllUsers() {
    const users = await this.userRepo.find({
      select: {
        id: true, firstName: true, lastName: true, email: true,
        role: true, status: true, studentId: true, contactNumber: true, isEmailVerified: true, profilePhoto: true, createdAt: true,
      },
      order: { createdAt: 'DESC' },
    });
    return users;
  }

  async getStudents() {
    return this.userRepo.find({
      where: { role: UserRole.STUDENT },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        studentId: true, role: true, status: true, contactNumber: true, isEmailVerified: true, profilePhoto: true, createdAt: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getTeachers() {
    return this.userRepo.find({
      where: { role: UserRole.TEACHER },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        studentId: true, role: true, status: true, contactNumber: true, isEmailVerified: true, profilePhoto: true, createdAt: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  // ─── CREATE TEACHER ──────────────────────────────────────────
  async createTeacher(dto: {
    firstName: string;
    lastName: string;
    teacherId?: string;
    password: string;
  }) {
    const teacherId = dto.teacherId?.trim() || await this.generateTeacherId();

    const existing = await this.userRepo.findOne({ where: { studentId: teacherId } });
    if (existing) throw new ConflictException('An account with this Teacher ID already exists.');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const teacher = this.userRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      studentId: teacherId,
      email: null,
      passwordHash,
      role: UserRole.TEACHER,
      status: UserStatus.INACTIVE,
      isEmailVerified: false,
    });
    await this.userRepo.save(teacher);
    return { message: 'Teacher account created successfully.', userId: teacher.id, teacherId };
  }

  private async generateTeacherId(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `T-${year}`;
    for (let seq = 1; seq <= 9999; seq++) {
      const candidate = `${prefix}${String(seq).padStart(3, '0')}`;
      const exists = await this.userRepo.findOne({ where: { studentId: candidate } });
      if (!exists) return candidate;
    }
    // Fallback with random suffix
    return `${prefix}${Math.floor(Math.random() * 9000) + 1000}`;
  }

  // ─── TOGGLE USER STATUS ──────────────────────────────────────
  async toggleStatus(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    user.status = user.status === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;
    await this.userRepo.save(user);
    return { message: `User is now ${user.status}.`, status: user.status };
  }

  // ─── DELETE USER ─────────────────────────────────────────────
  async deleteUser(userId: number, requesterId: number) {
    if (userId === requesterId) throw new ForbiddenException('You cannot delete your own account.');
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    if (user.role === UserRole.TEACHER) {
      await this.courseRepo.update(
        { teacherId: userId },
        { teacherId: null, teacherAssignmentStatus: null }
      );
    }

    await this.userRepo.remove(user);
    return { message: 'User deleted successfully.' };
  }
}
