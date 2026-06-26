import {
  Controller, Get, Post, Delete, Patch, Param, Body,
  UseGuards, Request, HttpCode, HttpStatus, ParseIntPipe
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';

@UseGuards(AuthGuard('jwt'))
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('students')
  getStudents() {
    return this.adminService.getStudents();
  }

  @Get('teachers')
  getTeachers() {
    return this.adminService.getTeachers();
  }

  @Post('teacher')
  @HttpCode(HttpStatus.CREATED)
  createTeacher(@Body() dto: { firstName: string; lastName: string; teacherId: string; password: string }) {
    return this.adminService.createTeacher(dto);
  }

  @Patch('users/:id/toggle-status')
  toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.toggleStatus(id);
  }

  @Delete('users/:id')
  deleteUser(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.adminService.deleteUser(id, req.user.sub);
  }
}
