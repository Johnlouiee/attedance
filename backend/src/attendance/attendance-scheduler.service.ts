import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Course } from '../courses/entities/course.entity';
import {
  AttendanceSession,
  AttendanceSessionStatus,
} from './entities/attendance-session.entity';
import { AttendanceService } from './attendance.service';
import { User } from '../auth/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AttendanceSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AttendanceSchedulerService.name);
  private intervalId?: NodeJS.Timeout;

  private transporter: nodemailer.Transporter | null = null;

  constructor(
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(AttendanceSession)
    private readonly sessionRepo: Repository<AttendanceSession>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly attendanceService: AttendanceService,
    private readonly configService: ConfigService,
  ) {
    const mailUser = this.configService.get<string>('MAIL_USER') || 'pachott@attenguard.com';
    const mailPass = this.configService.get<string>('MAIL_PASS');

    if (mailPass) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // STARTTLS
        auth: {
          user: mailUser,
          pass: mailPass,
        },
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3',
        },
      });
    }
  }

  onModuleInit() {
    this.tick();
    this.intervalId = setInterval(() => this.tick(), 60_000);
  }

  onModuleDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private async tick() {
    try {
      const courses = await this.courseRepo.find({
        where: { teacherAssignmentStatus: 'accepted' },
      });

      const now = new Date();
      const day = now.getDay();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      for (const course of courses) {
        if (course.enableAutoStart === false) continue;
        if (!course.teacherId || !course.classStartTime || !course.classEndTime) continue;

        const teacherExists = await this.userRepo.count({ where: { id: course.teacherId } });
        if (!teacherExists) {
          await this.courseRepo.update({ id: course.id }, { teacherId: null, teacherAssignmentStatus: null });
          this.logger.warn(`Unassigned course ${course.code} from non-existent teacher with ID ${course.teacherId}`);
          continue;
        }

        const days = (course.classDays || '1,2,3,4,5')
          .split(',')
          .map(d => Number(d.trim()))
          .filter(d => !Number.isNaN(d));
        if (!days.includes(day)) continue;

        const startMinutes = this.parseTime(course.classStartTime);
        const endMinutes = this.parseTime(course.classEndTime);
        const autoStartMinutes = startMinutes + (course.autoStartOffsetMinutes ?? 5);

        const active = await this.sessionRepo.findOne({
          where: { courseId: course.id, status: AttendanceSessionStatus.ACTIVE },
        });

        if (currentMinutes >= endMinutes && active) {
          await this.attendanceService.finalizeSessionForScheduler(active.id);
          continue;
        }

        if (
          currentMinutes >= autoStartMinutes &&
          currentMinutes < endMinutes &&
          !active
        ) {
          const durationMinutes = Math.max(1, endMinutes - currentMinutes);
          const lateAfterMinutes = Math.min(5, durationMinutes);
          await this.attendanceService.startSessionForScheduler(course.teacherId, {
            courseId: course.id,
            durationMinutes,
            lateAfterMinutes,
          });
          this.logger.log(
            `Auto-started attendance for ${course.code} (${course.classStartTime}-${course.classEndTime})`,
          );

          // Email notification to the teacher
          try {
            const teacher = await this.userRepo.findOne({ where: { id: course.teacherId } });
            if (teacher && teacher.email && teacher.isEmailVerified) {
              const displayTime = `${course.classStartTime} – ${course.classEndTime}`;
              const mailUser = this.configService.get<string>('MAIL_USER') || 'pachott@attenguard.com';
              const mailPass = this.configService.get<string>('MAIL_PASS');
              const subject = `⏰ Class Start Notice: ${course.code} is starting now!`;
              const htmlBody = `
                  <div style="font-family: 'Inter', sans-serif; max-width: 580px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <div style="background: linear-gradient(135deg, #0f172a, #1e3a5f); padding: 2rem; text-align: center;">
                      <h1 style="color: #60a5fa; margin: 0; font-size: 1.75rem; font-weight: bold;">🛡 AttenGuard</h1>
                      <p style="color: #94a3b8; margin: 0.5rem 0 0;">Class Schedule Reminder</p>
                    </div>
                    <div style="padding: 2rem 2.5rem;">
                      <h2 style="color: #0f172a; font-size: 1.3rem;">Your Attendance Session has Auto-Started!</h2>
                      <p style="color: #475569; line-height: 1.6;">
                        Hello <strong>${teacher.firstName}</strong>,<br/><br/>
                        This is a friendly reminder that your class **${course.code} — ${course.name}** has started (${displayTime}).
                        The attendance session has been automatically started. Students can now check-in via QR scan.
                      </p>
                    </div>
                  </div>
                `;

              if (mailPass && this.transporter) {
                await this.transporter.sendMail({
                  from: `"AttenGuard System" <${mailUser}>`,
                  to: teacher.email,
                  subject,
                  html: htmlBody,
                });
                this.logger.log(`Sent class start notice email to teacher: ${teacher.email}`);
              } else {
                await this.simulateBackgroundEmail(teacher.email, subject, htmlBody, course.code);
              }
            }
          } catch (mailError) {
            this.logger.error('Failed to send class start notification email to teacher', mailError as Error);
          }
        }
      }
    } catch (error) {
      this.logger.error('Attendance scheduler tick failed', error as Error);
    }
  }

  private parseTime(value: string) {
    const [h, m] = value.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  private async simulateBackgroundEmail(to: string, subject: string, htmlContent: string, courseCode: string) {
    const defaultSender = this.configService.get<string>('MAIL_USER') || 'pachott@attenguard.com';
    const previewHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; background-color: #f1f5f9; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
          .header { background: #f8fafc; padding: 16px; font-size: 13px; color: #475569; border-bottom: 1px solid #e2e8f0; }
          .row { margin-bottom: 6px; display: flex; }
          .label { font-weight: 600; width: 80px; color: #64748b; }
          .value { color: #0f172a; }
          .body { padding: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="row"><span class="label">From:</span><span class="value">"AttenGuard System" &lt;${defaultSender}&gt;</span></div>
            <div class="row"><span class="label">To:</span><span class="value">${to}</span></div>
            <div class="row"><span class="label">Subject:</span><span class="value">${subject}</span></div>
          </div>
          <div class="body">${htmlContent}</div>
        </div>
      </body>
      </html>
    `;

    try {
      const tempDir = path.join(process.cwd(), 'temp-emails');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const safeCode = courseCode.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `scheduler-${safeCode}-${Date.now()}.html`;
      const filePath = path.join(tempDir, filename);

      fs.writeFileSync(filePath, previewHtml, 'utf8');
      this.logger.log(`[Dev Mailer] Class start notice saved to: ${filePath}`);
    } catch (err: any) {
      this.logger.error(`[Dev Mailer] Failed to write background notification email: ${err.message}`);
    }
  }
}
