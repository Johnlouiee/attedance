import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseModule } from './entities/course-module.entity';
import { Course } from '../courses/entities/course.entity';
import { CourseModulesService } from './course-modules.service';
import { CourseModulesController } from './course-modules.controller';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [TypeOrmModule.forFeature([CourseModule, Course]), CoursesModule],
  providers: [CourseModulesService],
  controllers: [CourseModulesController],
  exports: [CourseModulesService],
})
export class CourseModulesModule {}
