import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import { Announcement, AnnouncementTarget } from './entities/announcement.entity';

export class CreateAnnouncementDto {
  title: string;
  message: string;
  targetAudience: AnnouncementTarget;
  courseCode?: string;
}

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepo: Repository<Announcement>,
  ) {}

  async createAnnouncement(dto: CreateAnnouncementDto, author: { id: number; name: string; role: string }) {
    const ann = this.announcementRepo.create({
      title: dto.title,
      message: dto.message,
      targetAudience: dto.targetAudience,
      courseCode: dto.courseCode ?? undefined,
      authorId: author.id,
      authorName: author.name,
      authorRole: author.role,
    });
    return this.announcementRepo.save(ann);
  }

  /** Returns announcements visible to a STUDENT */
  async getForStudent(studentCourses: string[]) {
    const targets: AnnouncementTarget[] = [AnnouncementTarget.ALL, AnnouncementTarget.STUDENTS];

    // Course-specific announcements for courses the student is enrolled in
    const qb = this.announcementRepo.createQueryBuilder('a')
      .where('a.authorRole IN (:...roles)', { roles: ['TEACHER', 'ADMIN'] })
      .andWhere(
        '(a.targetAudience IN (:...targets) OR (a.targetAudience = :course AND a.courseCode IN (:...codes)))',
        {
          targets,
          course: AnnouncementTarget.COURSE,
          codes: studentCourses.length ? studentCourses : ['__none__'],
        },
      )
      .orderBy('a.createdAt', 'DESC');

    return qb.getMany();
  }

  /** Returns announcements visible to a TEACHER */
  async getForTeacher(teacherCourseCodes: string[]) {
    const targets: AnnouncementTarget[] = [AnnouncementTarget.ALL, AnnouncementTarget.TEACHERS];

    const qb = this.announcementRepo.createQueryBuilder('a')
      .where(
        '(a.targetAudience IN (:...targets) OR (a.targetAudience = :course AND a.courseCode IN (:...codes)))',
        {
          targets,
          course: AnnouncementTarget.COURSE,
          codes: teacherCourseCodes.length ? teacherCourseCodes : ['__none__'],
        },
      )
      .orderBy('a.createdAt', 'DESC');

    return qb.getMany();
  }

  /** Returns ALL announcements for admin */
  async getAll() {
    return this.announcementRepo.find({ order: { createdAt: 'DESC' } });
  }

  async deleteAnnouncement(id: number, requesterId: number, requesterRole: string) {
    const ann = await this.announcementRepo.findOne({ where: { id } });
    if (!ann) throw new NotFoundException('Announcement not found.');
    if (requesterRole !== 'ADMIN' && ann.authorId !== requesterId) {
      throw new ForbiddenException('You can only delete your own announcements.');
    }
    await this.announcementRepo.remove(ann);
    return { message: 'Announcement deleted.' };
  }
}
