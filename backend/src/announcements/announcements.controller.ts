import {
  Controller, Get, Post, Delete,
  Param, Body, Request,
  UseGuards, HttpCode, HttpStatus, ParseIntPipe
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { AnnouncementsService, CreateAnnouncementDto } from './announcements.service';
import { User } from '../auth/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('announcements')
export class AnnouncementsController {
  constructor(
    private readonly service: AnnouncementsService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollRepo: Repository<Enrollment>,
  ) {}

  /** POST /api/v1/announcements */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAnnouncementDto, @Request() req: any) {
    const user = await this.userRepo.findOne({ where: { id: req.user.sub } });
    const name = user ? `${user.firstName} ${user.lastName}` : req.user.email;
    return this.service.createAnnouncement(dto, {
      id: req.user.sub,
      name,
      role: req.user.role,
    });
  }

  /** GET /api/v1/announcements/me — fetch relevant announcements for current user */
  @Get('me')
  async getForMe(@Request() req: any) {
    const role: string = req.user.role;
    if (role === 'ADMIN') {
      return this.service.getAll();
    } else if (role === 'TEACHER') {
      const courses = await this.courseRepo.find({ where: { teacherId: req.user.sub } });
      const codes = courses.map(c => c.code);
      return this.service.getForTeacher(codes);
    } else {
      const enrollments = await this.enrollRepo.find({ where: { studentId: req.user.sub } });
      const courseIds = enrollments.map(e => e.courseId);
      const courses = courseIds.length ? await this.courseRepo.find({ where: { id: In(courseIds) } }) : [];
      const codes = courses.map(c => c.code);
      return this.service.getForStudent(codes);
    }
  }

  /** GET /api/v1/announcements/all — all announcements (admin) */
  @Get('all')
  getAll() {
    return this.service.getAll();
  }

  /** DELETE /api/v1/announcements/:id */
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.deleteAnnouncement(id, req.user.sub, req.user.role);
  }
}
