import {
  Controller, Get, Post, Delete,
  Param, Body, Request,
  UseGuards, HttpCode, HttpStatus, ParseIntPipe
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EnrollmentsService, JoinCourseDto } from './enrollments.service';

@UseGuards(AuthGuard('jwt'))
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly service: EnrollmentsService) {}

  /** GET /api/v1/enrollments/me */
  @Get('me')
  getMyEnrollments(@Request() req: any) {
    return this.service.getEnrolledCourses(req.user.sub);
  }

  /** GET /api/v1/enrollments/join/:token/preview */
  @Get('join/:token/preview')
  previewJoin(@Param('token') token: string) {
    return this.service.getJoinPreview(token);
  }

  /** POST /api/v1/enrollments/join */
  @Post('join')
  @HttpCode(HttpStatus.CREATED)
  joinByInvite(@Body() dto: JoinCourseDto, @Request() req: any) {
    return this.service.joinByInvite(req.user.sub, dto.inviteToken);
  }

  /** DELETE /api/v1/enrollments/:id */
  @Delete(':id')
  unenroll(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.unenroll(req.user.sub, id);
  }
}
