import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../auth/entities/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
        role: true, status: true, studentId: true, profilePhoto: true, createdAt: true,
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
        studentId: true, role: true, status: true, profilePhoto: true, createdAt: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getTeachers() {
    return this.userRepo.find({
      where: { role: UserRole.TEACHER },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        role: true, status: true, profilePhoto: true, createdAt: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  // ─── CREATE TEACHER ──────────────────────────────────────────
  async createTeacher(dto: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    studentId?: string;
  }) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An account with this email already exists.');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const teacher = this.userRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      studentId: dto.studentId || undefined,
      passwordHash,
      role: UserRole.TEACHER,
      status: UserStatus.ACTIVE,
    });
    await this.userRepo.save(teacher);
    return { message: 'Teacher account created successfully.', userId: teacher.id };
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
    await this.userRepo.remove(user);
    return { message: 'User deleted successfully.' };
  }
}
