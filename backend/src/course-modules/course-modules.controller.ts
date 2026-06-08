import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Request,
  UseGuards, HttpCode, HttpStatus, ParseIntPipe, Query
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  CourseModulesService,
  CreateCourseModuleDto,
  UpdateCourseModuleDto
} from './course-modules.service';

@UseGuards(AuthGuard('jwt'))
@Controller('course-modules')
export class CourseModulesController {
  constructor(private readonly service: CourseModulesService) {}

  /** GET /api/v1/course-modules/mine  — all modules for the logged-in teacher grouped by course */
  @Get('mine')
  getMyModules(@Request() req: any) {
    return this.service.getModulesByTeacher(req.user.sub);
  }

  /** GET /api/v1/course-modules/by-course/:courseId  — public: any authenticated user (for students) */
  @Get('by-course/:courseId')
  getByCourse(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.service.getModulesByCourse(courseId);
  }

  /** POST /api/v1/course-modules  — teacher creates a module */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCourseModuleDto, @Request() req: any) {
    return this.service.create(req.user.sub, dto);
  }

  /** PATCH /api/v1/course-modules/:id  — teacher updates a module */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseModuleDto,
    @Request() req: any
  ) {
    return this.service.update(req.user.sub, id, dto);
  }

  /** DELETE /api/v1/course-modules/:id */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(req.user.sub, id);
  }
}
