import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  AttendanceService,
  CheckInAttendanceDto,
  ScanAttendanceDto,
  StartAttendanceDto,
} from './attendance.service';

@UseGuards(AuthGuard('jwt'))
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Post('sessions/start')
  @HttpCode(HttpStatus.CREATED)
  startSession(@Body() dto: StartAttendanceDto, @Request() req: any) {
    return this.service.startSession(req.user.sub, dto);
  }

  @Post('sessions/:id/end')
  @HttpCode(HttpStatus.OK)
  endSession(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.endSession(req.user.sub, id);
  }

  @Get('courses/:courseId/active-session')
  getActiveCourseSession(@Param('courseId', ParseIntPipe) courseId: number, @Request() req: any) {
    return this.service.getActiveCourseSession(req.user, courseId);
  }

  @Get('sessions/:id/token')
  getToken(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.getTeacherToken(req.user.sub, id);
  }

  @Get('sessions/:id/records')
  getRecords(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.getSessionRecords(req.user.sub, id);
  }

  @Post('scan')
  @HttpCode(HttpStatus.CREATED)
  scan(@Body() dto: ScanAttendanceDto, @Request() req: any) {
    return this.service.scan(req.user.sub, dto);
  }

  @Post('courses/:courseId/check-in')
  @HttpCode(HttpStatus.CREATED)
  checkInWithCode(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: CheckInAttendanceDto,
    @Request() req: any,
  ) {
    return this.service.checkInWithCode(req.user.sub, courseId, dto);
  }

  @Get('active/me')
  getMyActiveSessions(@Request() req: any) {
    return this.service.getMyActiveSessions(req.user.sub);
  }

  @Get('history/me')
  getMyHistory(@Request() req: any) {
    return this.service.getMyHistory(req.user.sub);
  }

  /** GET /api/v1/attendance/teacher/tracking — roster + attendance % by course or all students */
  @Get('teacher/tracking')
  getTeacherTracking(@Request() req: any) {
    return this.service.getTeacherTrackingSummary(req.user.sub);
  }
}
