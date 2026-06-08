import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CourseModule, ModuleType } from './entities/course-module.entity';
import { Course } from '../courses/entities/course.entity';
import { CoursesService } from '../courses/courses.service';

export class CreateCourseModuleDto {
  courseId: number;
  title: string;
  type: string;
  url?: string;
  content?: string;
  description?: string;
}

export class UpdateCourseModuleDto {
  title?: string;
  type?: string;
  url?: string;
  content?: string;
  description?: string;
}

const MODULE_TYPES: ModuleType[] = ['link', 'video', 'file', 'text'];

@Injectable()
export class CourseModulesService {
  constructor(
    @InjectRepository(CourseModule)
    private readonly moduleRepo: Repository<CourseModule>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    private readonly coursesService: CoursesService,
  ) {}

  private normalizeType(raw: string): ModuleType {
    const t = (raw || 'link').toLowerCase();
    if (t === 'drive' || t === 'document') return 'file';
    if (MODULE_TYPES.includes(t as ModuleType)) return t as ModuleType;
    return 'link';
  }

  private buildModuleFields(dto: CreateCourseModuleDto | UpdateCourseModuleDto, requireAll = false) {
    const type = this.normalizeType(dto.type ?? 'link');
    const title = dto.title?.trim();
    if (requireAll && !title) {
      throw new BadRequestException('Module title is required.');
    }

    let url: string | null = dto.url?.trim() || null;
    let content: string | null = dto.content?.trim() || null;

    if (type === 'text') {
      if (requireAll && !content) {
        throw new BadRequestException('Text content is required for text modules.');
      }
      url = url || null;
    } else {
      if (requireAll && !url) {
        throw new BadRequestException('A URL is required for link, video, and file modules.');
      }
      content = null;
    }

    return { type, title, url, content, description: dto.description?.trim() || null };
  }

  async getModulesByCourse(courseId: number) {
    return this.moduleRepo.find({
      where: { courseId },
      order: { createdAt: 'ASC' },
    });
  }

  async getModulesByTeacher(teacherId: number | string) {
    const courses = await this.coursesService.findByTeacher(teacherId);
    if (!courses.length) return [];

    const result: { course: (typeof courses)[number]; modules: CourseModule[] }[] = [];
    for (const course of courses) {
      const modules = await this.moduleRepo.find({
        where: { courseId: course.id },
        order: { createdAt: 'ASC' },
      });
      result.push({ course, modules });
    }
    return result;
  }

  async create(teacherId: number, dto: CreateCourseModuleDto) {
    const tid = Number(teacherId);
    const course = await this.courseRepo.findOne({ where: { id: Number(dto.courseId) } });
    if (!course) throw new NotFoundException('Course not found.');
    if (Number(course.teacherId) !== tid) {
      throw new ForbiddenException('You do not own this course.');
    }

    const fields = this.buildModuleFields(dto, true);
    const mod = this.moduleRepo.create({
      courseId: course.id,
      teacherId: tid,
      title: fields.title!,
      type: fields.type,
      url: fields.url,
      content: fields.content,
      description: fields.description,
    });
    return this.moduleRepo.save(mod);
  }

  async update(teacherId: number, id: number, dto: UpdateCourseModuleDto) {
    const tid = Number(teacherId);
    const mod = await this.moduleRepo.findOne({ where: { id } });
    if (!mod) throw new NotFoundException('Module not found.');
    if (Number(mod.teacherId) !== tid) throw new ForbiddenException('Not your module.');

    const merged = {
      title: dto.title ?? mod.title,
      type: dto.type ?? mod.type,
      url: dto.url !== undefined ? dto.url : mod.url ?? '',
      content: dto.content !== undefined ? dto.content : mod.content ?? '',
      description: dto.description !== undefined ? dto.description : mod.description ?? '',
    };
    const fields = this.buildModuleFields(merged, true);

    mod.title = fields.title!;
    mod.type = fields.type;
    mod.url = fields.url;
    mod.content = fields.content;
    mod.description = fields.description;

    return this.moduleRepo.save(mod);
  }

  async remove(teacherId: number, id: number) {
    const tid = Number(teacherId);
    const mod = await this.moduleRepo.findOne({ where: { id } });
    if (!mod) throw new NotFoundException('Module not found.');
    if (Number(mod.teacherId) !== tid) throw new ForbiddenException('Not your module.');
    await this.moduleRepo.remove(mod);
    return { message: 'Module deleted.' };
  }
}
