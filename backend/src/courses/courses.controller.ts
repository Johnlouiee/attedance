import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Request,
  UseGuards, HttpCode, HttpStatus, ParseIntPipe, ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CoursesService, CreateCourseDto, CreateTeacherCourseDto } from './courses.service';

@UseGuards(AuthGuard('jwt'))
@Controller('courses')
export class CoursesController {
  constructor(private readonly service: CoursesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** GET /api/v1/courses/mine — courses assigned to the logged-in teacher */
  @Get('mine')
  findMine(@Request() req: any) {
    return this.service.findByTeacher(req.user.sub);
  }

  /** POST /api/v1/courses/mine — teacher creates their own course */
  @Post('mine')
  @HttpCode(HttpStatus.CREATED)
  createMine(@Body() dto: CreateTeacherCourseDto, @Request() req: any) {
    if (req.user.role !== 'TEACHER') {
      throw new ForbiddenException('Only teachers can create courses here.');
    }
    return this.service.createForTeacher(req.user.sub, dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCourseDto, @Request() req: any) {
    if (req.user.role === 'TEACHER') {
      dto.teacherId = Number(req.user.sub);
      dto.teacherAssignmentStatus = 'accepted';
    }
    return this.service.create(dto);
  }

  /** GET /api/v1/courses/pending — course assignments pending teacher action */
  @Get('pending')
  findPending(@Request() req: any) {
    return this.service.findPendingAssignments(req.user.sub);
  }

  /** POST /api/v1/courses/:id/accept — accept a course assignment */
  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  accept(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.acceptAssignment(id, req.user.sub);
  }

  /** POST /api/v1/courses/:id/decline — decline a course assignment */
  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  decline(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.declineAssignment(id, req.user.sub);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCourseDto,
    @Request() req: any
  ) {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, req.user);
  }

  @Get(':id/roster')
  getRoster(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.getRoster(id, req.user);
  }

  @Post(':id/regenerate-invite')
  @HttpCode(HttpStatus.OK)
  regenerateInvite(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.regenerateInviteToken(id, req.user);
  }

  @Post(':id/enroll')
  @HttpCode(HttpStatus.OK)
  enrollStudent(
    @Param('id', ParseIntPipe) id: number,
    @Body('studentIdOrEmail') studentIdOrEmail: string,
    @Request() req: any
  ) {
    return this.service.enrollStudent(id, studentIdOrEmail, req.user);
  }

  @Delete(':id/unenroll/:enrollmentId')
  unenrollStudent(
    @Param('id', ParseIntPipe) id: number,
    @Param('enrollmentId', ParseIntPipe) enrollmentId: number,
    @Request() req: any
  ) {
    return this.service.unenrollStudent(id, enrollmentId, req.user);
  }
}
