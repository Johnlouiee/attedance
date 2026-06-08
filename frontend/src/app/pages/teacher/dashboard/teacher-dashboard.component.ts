import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminApiService, AttendanceSession, TeacherCourse } from '../../../services/admin-api.service';
import { AuthService } from '../../../services/auth.service';
import { buildStudentJoinUrl } from '../../../utils/invite.util';
import QRCode from 'qrcode';

interface DashboardClass extends TeacherCourse {
  attendancePct: number;
  attendanceStarted: boolean;
  activeSession?: AttendanceSession | null;
  attendanceLoading?: boolean;
  attendanceError?: string;
  qrDataUrl?: string;
  uploadedQrUrl?: string;
}

interface AgendaItem {
  time: string;
  type: string;
  title: string;
  detail: string;
  isActive: boolean;
  isDone: boolean;
  isUpcoming: boolean;
  countdown: string;
  startMinutes: number;
  endMinutes: number;
  autoStartMinutes: number;
}

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-container animate-fade-in">

      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">Teacher Dashboard</h1>
          <div class="header-subtitle-row">
            <p class="page-subtitle">Welcome back, {{ teacherName }}. Here's your overview for today.</p>
            <a routerLink="/teacher/courses" [queryParams]="{ create: 'true' }" class="create-course-tag">
              <i class="pi pi-plus"></i> Create Course
            </a>
          </div>
        </div>
        <div class="header-date">
          <i class="pi pi-calendar"></i>
          <span>{{ todayDate }}</span>
        </div>
      </div>

      <!-- Today's Agenda -->
      <div class="card-panel">
        <div class="panel-header">
          <h2>Today's Agenda</h2>
          <span class="date-chip"><i class="pi pi-clock"></i> {{ todayDate }}</span>
        </div>
        <div class="agenda-empty" *ngIf="!loadingCourses && todayAgenda.length === 0">
          <i class="pi pi-calendar"></i>
          <p>No classes scheduled for today.</p>
        </div>
        <div class="agenda-timeline" *ngIf="todayAgenda.length > 0">
          <div
            class="agenda-item"
            *ngFor="let item of todayAgenda"
            [ngClass]="{'is-active': item.isActive, 'is-done': item.isDone}"
          >
            <div class="time-col">
              <span class="time-label">{{ item.time }}</span>
              <div class="time-line"></div>
            </div>
            <div class="agenda-card" [ngClass]="{'agenda-card-active': item.isActive, 'agenda-card-done': item.isDone}">
              <div class="agenda-top">
                <span class="type-badge" [ngClass]="'badge-' + item.type">
                  <i class="pi" [ngClass]="item.type === 'class' ? 'pi-book' : item.type === 'office' ? 'pi-user' : 'pi-users'"></i>
                  {{ item.type | titlecase }}
                </span>
                <span class="live-chip" *ngIf="item.isActive">
                  <span class="live-dot"></span> NOW
                </span>
                <span class="countdown-chip" *ngIf="item.isUpcoming">
                  <i class="pi pi-clock"></i> in {{ item.countdown }}
                </span>
              </div>
              <p class="agenda-title">{{ item.title }}</p>
              <p class="agenda-detail">{{ item.detail }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Your Classes -->
      <div class="card-panel classes-panel">
          <div class="panel-header">
            <h2>Your Classes</h2>
            <a routerLink="/teacher/courses" class="btn-link">
              <i class="pi pi-book"></i> My Courses
            </a>
          </div>

          <div *ngIf="loadingCourses" class="loading-state">
            <i class="pi pi-spin pi-spinner"></i>
            <span>Loading your courses...</span>
          </div>

          <div *ngIf="!loadingCourses && classes.length === 0" class="empty-state">
            <i class="pi pi-book"></i>
            <p>No courses yet.</p>
            <small><a routerLink="/teacher/courses" class="empty-link">Create a course</a> to get an invite link, then add modules inside each class.</small>
          </div>

          <div class="class-list" *ngIf="!loadingCourses && classes.length > 0">
            <div class="class-card" *ngFor="let cls of classes">
              <div class="class-top">
                <div class="class-info">
                  <span class="course-code-badge">{{ cls.code }}</span>
                  <h3 class="course-name">{{ cls.name }}</h3>
                  <p class="course-credits"><i class="pi pi-bookmark"></i> {{ cls.credits }} credits</p>
                  <p class="course-schedule" *ngIf="cls.scheduleLabel">
                    <i class="pi pi-clock"></i> {{ cls.scheduleLabel }}
                    <span class="schedule-days-pill">{{ formatDays(cls.classDays) }}</span>
                    <span class="auto-hint">· Auto-starts {{ getAutoStartLabel(cls) }}</span>
                  </p>
                  <div class="invite-box" *ngIf="cls.inviteToken">
                    <span class="invite-label"><i class="pi pi-link"></i> Student invite link</span>
                    <code class="invite-url">{{ getJoinUrl(cls) }}</code>
                    <button type="button" class="copy-invite-btn" (click)="copyInviteLink(cls)">
                      <i class="pi" [ngClass]="copiedCourseId === cls.id ? 'pi-check' : 'pi-copy'"></i>
                      {{ copiedCourseId === cls.id ? 'Copied' : 'Copy link' }}
                    </button>
                  </div>
                </div>
                <div class="class-metrics">
                  <span class="attendance-badge" [ngClass]="getAttendanceClass(cls.attendancePct)">
                    <i class="pi pi-check-circle"></i>
                    {{ cls.attendancePct }}% Present
                  </span>
                </div>
              </div>

              <!-- Nav Shortcuts -->
              <div class="class-shortcuts">
                <button class="shortcut-btn">
                  <i class="pi pi-list"></i> Roster
                </button>
                <button class="shortcut-btn">
                  <i class="pi pi-chart-bar"></i> Analytics
                </button>
                <a routerLink="/teacher/modules" class="shortcut-btn">
                  <i class="pi pi-folder"></i> Materials
                </a>
              </div>

              <!-- Start Attendance -->
              <div class="class-footer">
                <button
                  class="btn-attendance"
                  [ngClass]="{'btn-attendance-active': cls.attendanceStarted}"
                  [disabled]="cls.attendanceLoading"
                  (click)="toggleAttendance(cls)"
                >
                  <i class="pi" [ngClass]="cls.attendanceLoading ? 'pi-spin pi-spinner' : (cls.attendanceStarted ? 'pi-stop-circle' : 'pi-play-circle')"></i>
                  {{ cls.attendanceStarted ? 'End Attendance' : (cls.activeSession ? 'Attendance Open' : 'Start Attendance') }}
                </button>
              </div>

              <div class="attendance-session-box" *ngIf="cls.activeSession as session">
                <div class="attendance-session-top">
                  <span class="live-chip"><span class="live-dot"></span> ATTENDANCE OPEN</span>
                  <span class="session-time">Ends {{ session.endsAt | date:'shortTime' }}</span>
                </div>
                <div class="qr-display">
                  <div class="qr-image-wrap">
                    <img
                      *ngIf="cls.uploadedQrUrl || cls.qrDataUrl"
                      [src]="cls.uploadedQrUrl || cls.qrDataUrl"
                      alt="Attendance QR code"
                      class="qr-image"
                    />
                    <span class="qr-rotate-badge">
                      <i class="pi pi-refresh"></i> Refreshes every 1 min
                    </span>
                  </div>
                  <div class="manual-code">
                    <span class="qr-label">Phrase Code</span>
                    <strong>{{ formatPhraseCode(session.checkInCode) }}</strong>
                    <div class="qr-actions">
                      <a *ngIf="cls.qrDataUrl" [href]="cls.qrDataUrl" [download]="cls.code + '-attendance-qr.png'" class="download-qr">
                        <i class="pi pi-download"></i> Download QR
                      </a>
                      <label class="upload-qr-btn">
                        <i class="pi pi-upload"></i> Upload QR
                        <input type="file" accept="image/*" (change)="onTeacherQrUpload($event, cls)" hidden />
                      </label>
                      <button *ngIf="cls.uploadedQrUrl" type="button" class="reset-qr-btn" (click)="clearUploadedQr(cls)">
                        Use generated QR
                      </button>
                    </div>
                  </div>
                </div>
                <p class="qr-note"><i class="pi pi-shield"></i> QR rotates every <strong>1 minute</strong> for security. Students must scan the latest code before attendance ends.</p>
              </div>

              <p class="attendance-error" *ngIf="cls.attendanceError">{{ cls.attendanceError }}</p>
            </div>
          </div>
        </div>
    </div>
  `,
  styles: [`
    /* ─── Base ──────────────────────────────────────────────────── */
    .page-container { display: flex; flex-direction: column; gap: 1.75rem; font-family: 'Inter', sans-serif; }

    .page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
    .page-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0 0 0.25rem 0; letter-spacing: -0.025em; }
    .header-subtitle-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.25rem; }
    .page-subtitle { color: #64748b; font-size: 0.95rem; margin: 0; }
    .create-course-tag {
      display: inline-flex; align-items: center; gap: 0.35rem;
      background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe;
      border-radius: 20px; padding: 0.25rem 0.75rem; font-size: 0.8rem;
      font-weight: 700; text-decoration: none; transition: all 0.2s ease; cursor: pointer;
    }
    .create-course-tag:hover {
      background: #dbeafe; border-color: #3b82f6; transform: translateY(-1px);
    }
    .create-course-tag i { font-size: 0.75rem; }
    .header-date {
      display: flex; align-items: center; gap: 0.4rem;
      background: #eff6ff; border: 1px solid #bfdbfe;
      border-radius: 10px; padding: 0.5rem 1rem;
      font-size: 0.85rem; font-weight: 600; color: #1e40af;
      white-space: nowrap;
    }

    /* ─── Card Panel ─────────────────────────────────────────────── */
    .card-panel {
      background: #ffffff;
      border: 1px solid #bfdbfe;
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 4px 12px rgba(59,130,246,0.06);
    }
    .panel-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1.25rem;
    }
    .panel-header h2 { font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0; }

    /* ─── Utilities ──────────────────────────────────────────────── */
    .btn-link {
      display: inline-flex; align-items: center; gap: 0.35rem;
      background: transparent; border: none; color: #2563eb;
      font-size: 0.85rem; font-weight: 600; cursor: pointer; text-decoration: none;
    }
    .btn-link:hover { color: #1e3a8a; }
    .empty-link { color: #2563eb; font-weight: 600; text-decoration: none; }
    .empty-link:hover { text-decoration: underline; }

    .tag-blue {
      font-size: 0.72rem; font-weight: 700;
      background: #dbeafe; color: #1e40af;
      border-radius: 6px; padding: 0.15rem 0.55rem;
    }

    .date-chip {
      display: inline-flex; align-items: center; gap: 0.35rem;
      font-size: 0.8rem; font-weight: 600; color: #2563eb;
    }

    .loading-state {
      display: flex; align-items: center; gap: 0.75rem;
      color: #64748b; font-size: 0.9rem; padding: 2rem 0;
      justify-content: center;
    }
    .loading-state i { color: #3b82f6; font-size: 1.25rem; }

    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 2.5rem 1rem;
      color: #94a3b8; text-align: center;
    }
    .empty-state i { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .empty-state p { font-size: 0.95rem; margin: 0 0 0.25rem 0; color: #64748b; }
    .empty-state small { font-size: 0.8rem; color: #94a3b8; }

    /* ─── Alerts ─────────────────────────────────────────────────── */
    .alerts-banner {
      background: #fff; border: 1px solid #bfdbfe;
      border-radius: 16px; padding: 1.25rem 1.5rem;
      box-shadow: 0 2px 8px rgba(59,130,246,0.08);
    }
    .alerts-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 0.9rem;
    }
    .alerts-title {
      font-size: 0.9rem; font-weight: 700; color: #0f172a;
      display: flex; align-items: center; gap: 0.45rem;
    }
    .alerts-title i { color: #3b82f6; }
    .alerts-list { display: flex; flex-direction: column; gap: 0.6rem; }
    .alert-item {
      display: flex; align-items: center; gap: 0.75rem;
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 10px; padding: 0.6rem 0.9rem;
    }
    .alert-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .dot-absence { background: #ef4444; }
    .dot-grade   { background: #f59e0b; }
    .alert-body { flex: 1; font-size: 0.85rem; color: #374151; display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .alert-body strong { font-weight: 700; color: #0f172a; }
    .btn-outline-sm {
      font-size: 0.78rem; font-weight: 600; color: #1e40af;
      border: 1px solid #93c5fd; background: #ffffff;
      border-radius: 6px; padding: 0.2rem 0.55rem; cursor: pointer;
      transition: background 0.2s;
    }
    .btn-outline-sm:hover { background: #dbeafe; }

    /* ─── Agenda ──────────────────────────────────────────────────── */
    .agenda-empty {
      text-align: center;
      padding: 2rem;
      color: #64748b;
    }
    .agenda-empty i { font-size: 2rem; color: #94a3b8; display: block; margin-bottom: 0.5rem; }
    .course-schedule {
      margin: 0.35rem 0 0;
      font-size: 0.82rem;
      color: #1d4ed8;
      font-weight: 600;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem;
    }
    .schedule-days-pill {
      font-size: 0.72rem; font-weight: 700;
      background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe;
      border-radius: 6px; padding: 0.1rem 0.45rem; display: inline-block;
    }
    .auto-hint { color: #64748b; font-weight: 500; }
    .invite-box {
      margin-top: 0.65rem;
      padding: 0.75rem;
      background: #f0fdf4;
      border: 1px dashed #86efac;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .invite-label { font-size: 0.75rem; font-weight: 800; color: #166534; display: flex; align-items: center; gap: 0.35rem; }
    .invite-url {
      font-size: 0.72rem;
      color: #14532d;
      word-break: break-all;
      background: #ffffff;
      padding: 0.45rem 0.5rem;
      border-radius: 6px;
      border: 1px solid #bbf7d0;
    }
    .copy-invite-btn {
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #16a34a;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 0.4rem 0.75rem;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
    }
    .classes-panel { width: 100%; }
    .agenda-timeline { display: flex; flex-direction: column; }
    .agenda-item { display: flex; gap: 1rem; }
    .time-col { display: flex; flex-direction: column; align-items: center; width: 64px; flex-shrink: 0; }
    .time-label { font-size: 0.78rem; font-weight: 700; color: #475569; white-space: nowrap; }
    .time-line { flex: 1; width: 2px; background: #bfdbfe; margin: 4px 0; min-height: 12px; }
    .agenda-item:last-child .time-line { display: none; }

    .agenda-card {
      flex: 1; border: 1px solid #bfdbfe; border-radius: 12px;
      padding: 0.7rem 1rem; margin-bottom: 0.75rem;
      background: #ffffff; transition: box-shadow 0.2s;
    }
    .agenda-card-active { border-color: #3b82f6; background: #eff6ff; }
    .agenda-card-done { opacity: 0.5; background: #f8fafc; }

    .agenda-top { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem; }
    .type-badge {
      font-size: 0.72rem; font-weight: 700; border-radius: 6px;
      padding: 0.18rem 0.55rem; display: flex; align-items: center; gap: 0.25rem;
    }
    .badge-class   { background: #dbeafe; color: #1e40af; }
    .badge-office  { background: #dbeafe; color: #1e40af; }
    .badge-meeting { background: #eff6ff; color: #2563eb; }

    .live-chip {
      display: flex; align-items: center; gap: 0.3rem; margin-left: auto;
      font-size: 0.72rem; font-weight: 800; color: #ef4444; letter-spacing: 0.05em;
    }
    .live-dot {
      width: 7px; height: 7px; border-radius: 50%; background: #ef4444;
      animation: pulse 1.5s infinite;
    }
    .countdown-chip {
      display: flex; align-items: center; gap: 0.25rem; margin-left: auto;
      font-size: 0.75rem; font-weight: 600; color: #64748b;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

    .agenda-title { font-size: 0.88rem; font-weight: 700; color: #0f172a; margin: 0 0 0.15rem 0; }
    .agenda-detail { font-size: 0.78rem; color: #64748b; margin: 0; }

    /* ─── Dashboard Grid ─────────────────────────────────────────── */
    .dashboard-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }

    /* ─── Class Cards ────────────────────────────────────────────── */
    .class-list { display: flex; flex-direction: column; gap: 1rem; }
    .class-card {
      border: 1px solid #bfdbfe; border-radius: 14px;
      padding: 1rem 1.25rem;
      display: flex; flex-direction: column; gap: 0.75rem;
      transition: background 0.2s, box-shadow 0.2s;
    }
    .class-card:hover { background: #eff6ff; box-shadow: 0 4px 12px rgba(59,130,246,0.08); }

    .class-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .class-info { display: flex; flex-direction: column; gap: 0.2rem; }
    .course-code-badge {
      display: inline-block;
      background: #dbeafe; color: #1e40af;
      font-size: 0.75rem; font-weight: 800; letter-spacing: 0.05em;
      border-radius: 6px; padding: 0.18rem 0.6rem;
      align-self: flex-start;
    }
    .course-name { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0; }
    .course-credits { font-size: 0.8rem; color: #64748b; margin: 0; display: flex; align-items: center; gap: 0.3rem; }

    .class-metrics { display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; }
    .attendance-badge {
      font-size: 0.8rem; font-weight: 700;
      display: flex; align-items: center; gap: 0.3rem;
      border-radius: 8px; padding: 0.2rem 0.6rem;
    }
    .attendance-high { color: #166534; background: #dcfce7; }
    .attendance-mid  { color: #92400e; background: #fef3c7; }
    .attendance-low  { color: #991b1b; background: #fee2e2; }

    /* Shortcuts */
    .class-shortcuts { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .shortcut-btn {
      display: inline-flex; align-items: center; gap: 0.35rem;
      font-size: 0.78rem; font-weight: 600;
      color: #1e40af; background: #eff6ff;
      border: 1px solid #bfdbfe; border-radius: 8px;
      padding: 0.28rem 0.7rem; cursor: pointer; text-decoration: none;
      transition: background 0.2s, color 0.2s;
    }
    .shortcut-btn:hover { background: #dbeafe; color: #1e3a8a; }

    /* Start Attendance CTA */
    .class-footer { display: flex; justify-content: flex-end; }
    .btn-attendance {
      display: inline-flex; align-items: center; gap: 0.45rem;
      font-size: 0.875rem; font-weight: 700;
      background: #1e3a8a; color: #ffffff;
      border: none; border-radius: 10px;
      padding: 0.5rem 1.1rem; cursor: pointer;
      transition: background 0.2s, transform 0.15s;
    }
    .btn-attendance:hover { background: #1d4ed8; transform: translateY(-1px); }
    .btn-attendance-active { background: #ef4444 !important; }
    .btn-attendance-active:hover { background: #dc2626 !important; }
    .btn-attendance:disabled { opacity: 0.7; cursor: wait; transform: none; }
    .attendance-session-box {
      border: 1px solid #86efac;
      background: #f0fdf4;
      border-radius: 12px;
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .attendance-session-top { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .session-time { font-size: 0.78rem; font-weight: 700; color: #166534; }
    .qr-display {
      background: #ffffff;
      border: 1px dashed #22c55e;
      border-radius: 10px;
      padding: 0.75rem;
      display: grid;
      grid-template-columns: 148px 1fr;
      gap: 1rem;
      align-items: center;
    }
    @media (max-width: 560px) {
      .qr-display { grid-template-columns: 1fr; justify-items: center; text-align: center; }
      .qr-actions { justify-content: center; }
    }
    .qr-image { width: 148px; height: 148px; border-radius: 8px; border: 1px solid #dcfce7; object-fit: contain; }
    .manual-code { display: flex; flex-direction: column; gap: 0.45rem; }
    .qr-label { font-size: 0.72rem; font-weight: 800; color: #166534; text-transform: uppercase; }
    .manual-code strong {
      font-size: clamp(1.35rem, 4vw, 2rem);
      color: #0f172a;
      line-height: 1.3;
      font-weight: 800;
    }
    .qr-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .download-qr, .upload-qr-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      width: fit-content;
      color: #166534;
      font-size: 0.82rem;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
    }
    .upload-qr-btn { border: none; background: transparent; padding: 0; }
    .reset-qr-btn {
      border: 1px solid #bbf7d0;
      background: #f0fdf4;
      color: #166534;
      border-radius: 8px;
      padding: 0.25rem 0.55rem;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
    }
    .qr-note { margin: 0; font-size: 0.76rem; color: #15803d; display: flex; align-items: center; gap: 0.35rem; }
    .qr-note i { color: #16a34a; }
    .qr-image-wrap { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
    .qr-rotate-badge {
      display: inline-flex; align-items: center; gap: 0.3rem;
      background: #dbeafe; color: #1e40af;
      font-size: 0.68rem; font-weight: 700;
      border-radius: 20px; padding: 0.18rem 0.6rem;
      border: 1px solid #93c5fd;
      white-space: nowrap;
    }
    .qr-rotate-badge i { font-size: 0.65rem; }
    .attendance-error { margin: 0; color: #b91c1c; font-size: 0.82rem; font-weight: 600; }

    /* ─── Submissions Sidebar ────────────────────────────────────── */
    .pending-badge {
      display: inline-flex; align-items: center; gap: 0.35rem;
      font-size: 0.78rem; font-weight: 700;
      background: #dbeafe; color: #1e40af;
      border-radius: 8px; padding: 0.2rem 0.6rem;
    }
    .submissions-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .submission-card {
      border: 1px solid #bfdbfe; border-radius: 12px;
      padding: 0.9rem 1rem; display: flex; flex-direction: column; gap: 0.6rem;
      transition: background 0.2s;
    }
    .submission-card:hover { background: #eff6ff; }
    .sub-info { display: flex; flex-direction: column; gap: 0.3rem; }
    .sub-title { font-size: 0.88rem; font-weight: 700; color: #0f172a; margin: 0; }
    .sub-meta { font-size: 0.75rem; color: #64748b; margin: 0; display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; }
    .sub-footer { display: flex; align-items: center; justify-content: space-between; }
    .ungraded-pill {
      font-size: 0.72rem; font-weight: 700;
      background: #dbeafe; color: #1e40af;
      border-radius: 8px; padding: 0.18rem 0.6rem;
    }
    .btn-primary-sm {
      display: inline-flex; align-items: center; gap: 0.3rem;
      font-size: 0.8rem; font-weight: 700;
      background: #1e3a8a; color: #ffffff;
      border: none; border-radius: 8px;
      padding: 0.3rem 0.8rem; cursor: pointer;
      transition: background 0.2s, transform 0.15s;
    }
    .btn-primary-sm:hover { background: #1d4ed8; transform: translateY(-1px); }

    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 900px) {
      .dashboard-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class TeacherDashboardComponent implements OnInit, OnDestroy {
  todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  teacherName = 'Teacher';

  loadingCourses = true;
  classes: DashboardClass[] = [];
  copiedCourseId: number | null = null;

  private countdownInterval: any;
  private qrRefreshInterval: any;
  private sessionSyncInterval: any;

  todayAgenda: AgendaItem[] = [];

  constructor(
    private apiService: AdminApiService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const user = this.authService.getUser();
    if (user) {
      this.teacherName = `${user.firstName} ${user.lastName}`;
    }

    this.loadMyCourses();

    this.countdownInterval = setInterval(() => this.updateAgendaState(), 30_000);
    this.sessionSyncInterval = setInterval(() => {
      this.classes.forEach(cls => this.syncActiveSession(cls));
    }, 30_000);
  }

  ngOnDestroy() {
    clearInterval(this.countdownInterval);
    clearInterval(this.qrRefreshInterval);
    clearInterval(this.sessionSyncInterval);
  }

  loadMyCourses() {
    this.loadingCourses = true;
    this.apiService.getMyCourses().subscribe({
      next: (courses) => {
        this.classes = courses.map(c => ({
          ...c,
          attendancePct: 0,        // will be real data once attendance system is built
          attendanceStarted: false,
          activeSession: null,
          attendanceLoading: false,
          attendanceError: '',
          qrDataUrl: ''
        }));
        this.classes.forEach(cls => this.syncActiveSession(cls));
        this.buildTodayAgenda();
        this.startQrRefreshLoop();
        this.loadingCourses = false;
      },
      error: (err) => {
        console.error('Failed to load teacher courses', err);
        this.loadingCourses = false;
      }
    });
  }

  getJoinUrl(cls: TeacherCourse) {
    return cls.inviteToken ? buildStudentJoinUrl(cls.inviteToken) : '';
  }

  copyInviteLink(cls: TeacherCourse) {
    if (!cls.inviteToken) return;
    const url = buildStudentJoinUrl(cls.inviteToken);
    navigator.clipboard.writeText(url).then(() => {
      this.copiedCourseId = cls.id;
      setTimeout(() => {
        if (this.copiedCourseId === cls.id) this.copiedCourseId = null;
      }, 2500);
    });
  }

  buildTodayAgenda() {
    const day = new Date().getDay();
    this.todayAgenda = this.classes
      .filter(c => c.classStartTime && c.classEndTime)
      .filter(c => (c.classDays || '1,2,3,4,5').split(',').map(n => Number(n.trim())).includes(day))
      .map(c => {
        const startMinutes = this.parseTime24(c.classStartTime!);
        const endMinutes = this.parseTime24(c.classEndTime!);
        const autoStartMinutes = startMinutes + (c.autoStartOffsetMinutes ?? 5);
        return {
          time: this.formatMinutes12(startMinutes),
          type: 'class',
          title: `${c.code}: ${c.name}`,
          detail: c.scheduleLabel || '',
          isActive: false,
          isDone: false,
          isUpcoming: false,
          countdown: '',
          startMinutes,
          endMinutes,
          autoStartMinutes,
        };
      })
      .sort((a, b) => a.startMinutes - b.startMinutes);
    this.updateAgendaState();
  }

  updateAgendaState() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    this.todayAgenda.forEach(item => {
      item.isDone = currentMinutes >= item.endMinutes;
      item.isActive = currentMinutes >= item.autoStartMinutes && currentMinutes < item.endMinutes;
      item.isUpcoming = currentMinutes < item.autoStartMinutes;
      if (item.isUpcoming) {
        const diff = item.autoStartMinutes - currentMinutes;
        item.countdown = diff >= 60 ? `${Math.floor(diff / 60)}h ${diff % 60}m` : `${diff}m`;
      }
    });

    this.classes.forEach(cls => {
      cls.attendanceStarted = !!cls.activeSession && cls.activeSession.status === 'ACTIVE';
    });
  }

  getAutoStartLabel(cls: TeacherCourse) {
    if (!cls.classStartTime) return '';
    const minutes = this.parseTime24(cls.classStartTime) + (cls.autoStartOffsetMinutes ?? 5);
    return this.formatMinutes12(minutes);
  }

  private parseTime24(value: string) {
    const [h, m] = value.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  private formatMinutes12(totalMinutes: number) {
    let h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  getAttendanceClass(pct: number): string {
    if (pct >= 90) return 'attendance-high';
    if (pct >= 75) return 'attendance-mid';
    return 'attendance-low';
  }

  toggleAttendance(cls: DashboardClass) {
    cls.attendanceError = '';
    cls.attendanceLoading = true;

    if (cls.attendanceStarted && cls.activeSession) {
      this.apiService.endAttendanceSession(cls.activeSession.id).subscribe({
        next: () => {
          cls.attendanceStarted = false;
          cls.activeSession = null;
          cls.qrDataUrl = '';
          cls.attendanceLoading = false;
        },
        error: (err) => {
          cls.attendanceError = err.error?.message || 'Failed to end attendance.';
          cls.attendanceLoading = false;
        }
      });
      return;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const durationMinutes = cls.classEndTime
      ? Math.max(1, this.parseTime24(cls.classEndTime) - currentMinutes)
      : 55;
    const lateAfterMinutes = Math.min(5, durationMinutes);

    this.apiService.startAttendanceSession({
      courseId: cls.id,
      durationMinutes,
      lateAfterMinutes,
    }).subscribe({
      next: (session) => {
        cls.activeSession = session;
        cls.attendanceStarted = session.status === 'ACTIVE';
        this.renderQr(cls);
        this.updateAgendaState();
        cls.attendanceLoading = false;
      },
      error: (err) => {
        cls.attendanceError = err.error?.message || 'Failed to start attendance.';
        cls.attendanceLoading = false;
      }
    });
  }

  private syncActiveSession(cls: DashboardClass) {
    this.apiService.getActiveAttendanceSession(cls.id).subscribe({
      next: (session) => {
        cls.activeSession = session;
        cls.attendanceStarted = !!session && session.status === 'ACTIVE';
        if (session?.status === 'ACTIVE') this.renderQr(cls);
        else cls.qrDataUrl = '';
        this.updateAgendaState();
      },
      error: () => {
        cls.activeSession = null;
        cls.attendanceStarted = false;
      }
    });
  }

  private startQrRefreshLoop() {
    clearInterval(this.qrRefreshInterval);
    this.qrRefreshInterval = setInterval(() => {
      this.classes
        .filter(cls => cls.activeSession && cls.attendanceStarted)
        .forEach(cls => {
          this.apiService.getAttendanceToken(cls.activeSession!.id).subscribe({
            next: (session) => {
              if (session.status === 'CLOSED') {
                cls.activeSession = null;
                cls.attendanceStarted = false;
                cls.qrDataUrl = '';
              } else {
                cls.activeSession = session;
                this.renderQr(cls);
              }
            },
            error: () => {
              this.syncActiveSession(cls);
            }
          });
        });
    }, 60_000);
  }

  formatPhraseCode(code?: string) {
    if (!code) return '';
    return code
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  onTeacherQrUpload(event: Event, cls: DashboardClass) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (cls.uploadedQrUrl) URL.revokeObjectURL(cls.uploadedQrUrl);
    cls.uploadedQrUrl = URL.createObjectURL(file);
  }

  clearUploadedQr(cls: DashboardClass) {
    if (cls.uploadedQrUrl) URL.revokeObjectURL(cls.uploadedQrUrl);
    cls.uploadedQrUrl = '';
  }

  private renderQr(cls: DashboardClass) {
    if (!cls.activeSession?.qrPayload) {
      cls.qrDataUrl = '';
      return;
    }
    QRCode.toDataURL(cls.activeSession.qrPayload, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    }).then((dataUrl) => {
      cls.qrDataUrl = dataUrl;
    }).catch(() => {
      cls.qrDataUrl = '';
    });
  }

  formatDays(classDays?: string): string {
    if (!classDays) return 'Mon–Fri';
    const dayMap: { [key: number]: string } = {
      1: 'Mon',
      2: 'Tue',
      3: 'Wed',
      4: 'Thu',
      5: 'Fri',
      6: 'Sat',
      0: 'Sun'
    };
    const parts = classDays.split(',').map(n => n.trim()).filter(Boolean).map(Number);
    if (parts.length === 5 && [1,2,3,4,5].every(d => parts.includes(d))) {
      return 'Mon–Fri';
    }
    if (parts.length === 7) {
      return 'Everyday';
    }
    return parts.map(d => dayMap[d] || '').filter(Boolean).join(', ');
  }

}
