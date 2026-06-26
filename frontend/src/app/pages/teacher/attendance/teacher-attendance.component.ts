import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  AdminApiService,
  TeacherAttendanceTracking,
  CourseHistoryTeacherView,
  CourseHistoryTeacherSession,
} from '../../../services/admin-api.service';

type ViewMode = 'by-course' | 'all-students' | 'history';

interface CourseHistoryTab {
  courseId: number;
  code: string;
  name: string;
  data: CourseHistoryTeacherView | null;
  loading: boolean;
  loaded: boolean;
  error: boolean;
  expandedSessions: Set<number>;
}

@Component({
  selector: 'app-teacher-attendance',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-container animate-fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Track Attendance</h1>
          <p class="page-subtitle">View attendance rates and history from completed class sessions.</p>
        </div>
        <div class="view-tags">
          <button type="button" class="view-tag" [class.active]="viewMode === 'by-course'" (click)="viewMode = 'by-course'">
            <i class="pi pi-book"></i> By course
          </button>
          <button type="button" class="view-tag" [class.active]="viewMode === 'all-students'" (click)="viewMode = 'all-students'">
            <i class="pi pi-users"></i> All students
          </button>
          <button type="button" class="view-tag" [class.active]="viewMode === 'history'" (click)="switchToHistory()">
            <i class="pi pi-calendar"></i> Session history
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div class="card-panel loading-state" *ngIf="loading">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Loading attendance data...</span>
      </div>

      <!-- Error -->
      <div class="card-panel alert-error" *ngIf="loadError">
        <i class="pi pi-exclamation-circle"></i> {{ loadError }}
      </div>

      <!-- Empty -->
      <div class="card-panel empty-page" *ngIf="!loading && !loadError && isEmpty">
        <i class="pi pi-chart-bar"></i>
        <h3>No attendance data yet</h3>
        <p>Create a course, have students join, and run at least one attendance session.</p>
        <a routerLink="/teacher/courses" class="btn-link">Go to My Courses</a>
      </div>

      <!-- ===================== BY COURSE ===================== -->
      <ng-container *ngIf="!loading && !loadError && viewMode === 'by-course'">
        <div class="course-block" *ngFor="let course of tracking.byCourse">
          <div class="course-block-header">
            <div>
              <span class="code-badge">{{ course.code }}</span>
              <h2>{{ course.name }}</h2>
              <p class="meta">
                {{ course.enrolledCount }} student{{ course.enrolledCount === 1 ? '' : 's' }}
                · {{ course.sessionCount }} session{{ course.sessionCount === 1 ? '' : 's' }}
              </p>
            </div>
            <div class="class-pct" [ngClass]="pctClass(course.classAttendancePct)">
              <span class="pct-value">{{ formatPct(course.classAttendancePct) }}</span>
              <span class="pct-label">Class average</span>
            </div>
          </div>

          <div class="students-empty" *ngIf="course.students.length === 0">
            No students enrolled yet. Share your invite link from My Courses.
          </div>

          <table class="roster-table" *ngIf="course.students.length > 0">
            <thead>
              <tr>
                <th>Student</th>
                <th>ID</th>
                <th>Sessions</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of course.students">
                <td>{{ s.studentName }}</td>
                <td>{{ s.studentNumber || '—' }}</td>
                <td>{{ s.sessionsAttended }} / {{ s.sessionsTotal }}</td>
                <td>
                  <span class="pct-pill" [ngClass]="pctClass(s.attendancePct)">{{ formatPct(s.attendancePct) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>

      <!-- ===================== ALL STUDENTS ===================== -->
      <ng-container *ngIf="!loading && !loadError && viewMode === 'all-students'">
        <div class="card-panel all-students-panel" *ngIf="tracking.allStudents.length > 0">
          <table class="roster-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>ID</th>
                <th>Overall</th>
                <th>By class</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of tracking.allStudents">
                <td>{{ s.studentName }}</td>
                <td>{{ s.studentNumber || '—' }}</td>
                <td>
                  <span class="pct-pill" [ngClass]="pctClass(s.overallAttendancePct)">
                    {{ formatPct(s.overallAttendancePct) }}
                  </span>
                </td>
                <td class="course-chips">
                  <span
                    *ngFor="let c of s.courses"
                    class="course-chip"
                    [ngClass]="pctClass(c.attendancePct)"
                    [title]="c.courseName"
                  >
                    {{ c.courseCode }}: {{ formatPct(c.attendancePct) }}
                  </span>
                  <span *ngIf="s.courses.length === 0" class="muted">No classes</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>

      <!-- ===================== SESSION HISTORY ===================== -->
      <ng-container *ngIf="!loading && !loadError && viewMode === 'history'">
        <div class="history-layout">
          <!-- Course sidebar -->
          <aside class="sidebar">
            <p class="sidebar-label">COURSES</p>
            <button
              *ngFor="let tab of historyTabs"
              class="course-btn"
              [class.active]="selectedHistoryCourseId === tab.courseId"
              (click)="selectHistoryCourse(tab)"
            >
              <span class="course-btn-code">{{ tab.code }}</span>
              <span class="course-btn-name">{{ tab.name }}</span>
            </button>
            <div class="sidebar-empty" *ngIf="historyTabs.length === 0">
              No courses available.
            </div>
          </aside>

          <!-- Session detail -->
          <section class="history-detail" *ngIf="selectedHistoryTab">
            <!-- Loading -->
            <div class="section-loader" *ngIf="selectedHistoryTab.loading">
              <span class="spinner"></span> Loading session history...
            </div>

            <!-- Error -->
            <div class="alert-error inline-error" *ngIf="selectedHistoryTab.error">
              ⚠️ Failed to load history for this course.
            </div>

            <!-- No sessions -->
            <div class="empty-sessions-msg" *ngIf="!selectedHistoryTab.loading && !selectedHistoryTab.error && selectedHistoryTab.data && selectedHistoryTab.data.sessions.length === 0">
              <div class="empty-icon">🗓️</div>
              <p>No completed sessions yet for <strong>{{ selectedHistoryTab.name }}</strong>.</p>
            </div>

            <!-- Sessions accordion -->
            <ng-container *ngIf="!selectedHistoryTab.loading && !selectedHistoryTab.error && selectedHistoryTab.data">
              <div class="course-history-header">
                <div>
                  <span class="code-badge-lg">{{ selectedHistoryTab.data.courseCode }}</span>
                  <h2 class="hdr-name">{{ selectedHistoryTab.data.courseName }}</h2>
                </div>
                <span class="session-count-badge">
                  {{ selectedHistoryTab.data.sessions.length }} session{{ selectedHistoryTab.data.sessions.length === 1 ? '' : 's' }}
                </span>
              </div>

              <div class="session-accordion" *ngFor="let s of selectedHistoryTab.data.sessions; let i = index">
                <!-- Session summary row (clickable) -->
                <div class="session-row" (click)="toggleSession(s.sessionId)">
                  <div class="session-row-left">
                    <span class="session-num">#{{ selectedHistoryTab.data.sessions.length - i }}</span>
                    <div class="session-info">
                      <span class="session-date">{{ s.startedAt | date:'EEEE, MMM d, y' }}</span>
                      <span class="session-time">{{ s.startedAt | date:'h:mm a' }} – {{ s.endedAt | date:'h:mm a' }}</span>
                    </div>
                  </div>
                  <div class="session-row-right">
                    <span class="mini-chip present-chip">{{ s.presentCount }} P</span>
                    <span class="mini-chip late-chip">{{ s.lateCount }} L</span>
                    <span class="mini-chip absent-chip">{{ s.absentCount }} A</span>
                    <span class="attend-pct" [ngClass]="pctClass(s.totalCount > 0 ? Math.round(((s.presentCount + s.lateCount) / s.totalCount) * 100) : null)">
                      {{ s.totalCount > 0 ? Math.round(((s.presentCount + s.lateCount) / s.totalCount) * 100) + '%' : 'N/A' }}
                    </span>
                    <i class="pi" [ngClass]="isSessionExpanded(s.sessionId) ? 'pi-chevron-up' : 'pi-chevron-down'" style="color:#94a3b8; font-size:0.85rem;"></i>
                  </div>
                </div>

                <!-- Expanded records -->
                <div class="session-records" *ngIf="isSessionExpanded(s.sessionId)">
                  <div class="records-empty" *ngIf="s.records.length === 0">
                    No attendance records for this session.
                  </div>
                  <table class="records-table" *ngIf="s.records.length > 0">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>ID</th>
                        <th>Status</th>
                        <th>Check-in</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let r of s.records">
                        <td class="student-name">{{ r.studentName }}</td>
                        <td class="student-id">{{ r.studentNumber || '—' }}</td>
                        <td>
                          <span class="status-badge" [ngClass]="r.status.toLowerCase()">
                            <span class="status-dot"></span>
                            {{ r.status }}
                          </span>
                        </td>
                        <td class="checkin-time">
                          <span *ngIf="r.scannedAt">{{ r.scannedAt | date:'h:mm a' }}</span>
                          <span class="muted" *ngIf="!r.scannedAt">—</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </ng-container>
          </section>

          <!-- Placeholder if no tab selected -->
          <section class="history-detail empty-detail" *ngIf="!selectedHistoryTab">
            <div class="empty-icon">📋</div>
            <p>Select a course to view session history.</p>
          </section>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .page-container { display: flex; flex-direction: column; gap: 1.25rem; font-family: 'Inter', sans-serif; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
    .page-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0 0 0.25rem; }
    .page-subtitle { color: #64748b; margin: 0; font-size: 0.95rem; }
    .view-tags { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .view-tag {
      display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 0.5rem 1rem; border-radius: 999px; border: 1.5px solid #cbd5e1;
      background: #fff; color: #475569; font-size: 0.85rem; font-weight: 700; cursor: pointer;
      transition: all 0.15s;
    }
    .view-tag:hover { border-color: #818cf8; color: #4f46e5; }
    .view-tag.active { background: #1e3a8a; border-color: #1e3a8a; color: #fff; }
    .card-panel {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.25rem 1.5rem;
    }
    .loading-state { display: flex; align-items: center; justify-content: center; gap: 0.75rem; color: #64748b; }
    .alert-error { color: #b91c1c; background: #fef2f2; border-color: #fecaca; display: flex; gap: 0.5rem; align-items: center; }
    .empty-page { text-align: center; padding: 2.5rem; }
    .empty-page i { font-size: 2.5rem; color: #93c5fd; margin-bottom: 0.75rem; display: block; }
    .btn-link { color: #2563eb; font-weight: 700; text-decoration: none; }

    /* By-course view */
    .course-block {
      background: #fff; border: 1px solid #bfdbfe; border-radius: 16px; overflow: hidden;
      box-shadow: 0 4px 12px rgba(59,130,246,0.06);
    }
    .course-block-header {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;
      padding: 1.25rem 1.5rem; background: #eff6ff; border-bottom: 1px solid #bfdbfe; flex-wrap: wrap;
    }
    .code-badge {
      background: #1e3a8a; color: #fff; font-size: 0.75rem; font-weight: 800;
      padding: 0.15rem 0.55rem; border-radius: 6px; display: inline-block; margin-bottom: 0.35rem;
    }
    .course-block-header h2 { margin: 0 0 0.25rem; font-size: 1.1rem; color: #0f172a; }
    .meta { margin: 0; font-size: 0.85rem; color: #64748b; }
    .class-pct {
      text-align: center; padding: 0.65rem 1rem; border-radius: 12px; min-width: 100px;
      background: #f1f5f9; border: 1px solid #e2e8f0;
    }
    .class-pct.pct-high { background: #dcfce7; border-color: #86efac; }
    .class-pct.pct-mid { background: #fef3c7; border-color: #fcd34d; }
    .class-pct.pct-low { background: #fee2e2; border-color: #fca5a5; }
    .pct-value { display: block; font-size: 1.35rem; font-weight: 800; color: #0f172a; }
    .pct-label { font-size: 0.72rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .students-empty { padding: 1.25rem 1.5rem; color: #64748b; font-size: 0.9rem; }
    .roster-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .roster-table th {
      text-align: left; padding: 0.75rem 1.5rem; background: #f8fafc;
      color: #475569; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em;
    }
    .roster-table td { padding: 0.85rem 1.5rem; border-top: 1px solid #f1f5f9; color: #1e293b; }
    .pct-pill {
      display: inline-block; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.8rem; font-weight: 800;
    }
    .pct-pill.pct-high { background: #dcfce7; color: #166534; }
    .pct-pill.pct-mid { background: #fef3c7; color: #92400e; }
    .pct-pill.pct-low { background: #fee2e2; color: #991b1b; }
    .pct-pill.pct-none { background: #f1f5f9; color: #64748b; }
    .course-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .course-chip { font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 6px; background: #f1f5f9; color: #334155; }
    .course-chip.pct-high { background: #dcfce7; color: #166534; }
    .course-chip.pct-mid { background: #fef3c7; color: #92400e; }
    .course-chip.pct-low { background: #fee2e2; color: #991b1b; }
    .muted { color: #94a3b8; font-size: 0.85rem; }
    .all-students-panel { padding: 0; overflow: hidden; }

    /* History view */
    .history-layout {
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: 1.25rem;
      align-items: start;
    }
    .sidebar {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;
      position: sticky; top: 1.5rem;
    }
    .sidebar-label {
      font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em;
      color: #94a3b8; padding: 1rem 1.25rem 0.5rem; margin: 0; text-transform: uppercase;
    }
    .sidebar-empty { padding: 1rem 1.25rem; color: #94a3b8; font-size: 0.88rem; }
    .course-btn {
      width: 100%; display: flex; flex-direction: column; align-items: flex-start;
      padding: 0.85rem 1.25rem; background: none; border: none;
      border-bottom: 1px solid #f1f5f9; cursor: pointer;
      transition: background 0.15s; text-align: left; gap: 0.2rem; position: relative;
    }
    .course-btn:last-child { border-bottom: none; }
    .course-btn:hover { background: #f8fafc; }
    .course-btn.active { background: #eff6ff; }
    .course-btn.active::before {
      content: ''; position: absolute; left: 0; top: 0; bottom: 0;
      width: 3px; background: #1e3a8a; border-radius: 0 2px 2px 0;
    }
    .course-btn-code { font-size: 0.7rem; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.05em; }
    .course-btn-name { font-size: 0.88rem; font-weight: 600; color: #1e293b; line-height: 1.3; }

    /* Detail panel */
    .history-detail {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;
      min-height: 300px;
    }
    .empty-detail { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; padding: 3rem; }
    .empty-detail .empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }

    .section-loader {
      display: flex; align-items: center; gap: 0.75rem; padding: 1.5rem;
      color: #64748b; font-size: 0.9rem;
    }
    .spinner {
      width: 16px; height: 16px; border: 2px solid #e2e8f0; border-top-color: #4f46e5;
      border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .inline-error {
      margin: 1.25rem 1.5rem; padding: 0.85rem 1rem;
      background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px;
      color: #b91c1c; font-size: 0.9rem; display: block;
    }

    .course-history-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 1.25rem 1.5rem; background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%);
      border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; gap: 1rem;
    }
    .code-badge-lg {
      display: inline-block; background: #1e3a8a; color: #fff;
      font-size: 0.75rem; font-weight: 800; padding: 0.2rem 0.65rem; border-radius: 6px;
      margin-bottom: 0.3rem;
    }
    .hdr-name { margin: 0; font-size: 1.1rem; font-weight: 700; color: #0f172a; }
    .session-count-badge {
      background: #e0e7ff; color: #3730a3; font-size: 0.78rem; font-weight: 700;
      padding: 0.3rem 0.75rem; border-radius: 999px;
    }

    /* Accordion sessions */
    .session-accordion {
      border-bottom: 1px solid #f1f5f9;
    }
    .session-accordion:last-child { border-bottom: none; }

    .session-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1rem 1.5rem; cursor: pointer; transition: background 0.15s;
      gap: 1rem; flex-wrap: wrap;
    }
    .session-row:hover { background: #f8fafc; }
    .session-row-left { display: flex; align-items: center; gap: 0.85rem; }
    .session-num {
      font-weight: 800; color: #94a3b8; font-size: 0.8rem;
      min-width: 28px; text-align: center;
    }
    .session-info { display: flex; flex-direction: column; gap: 0.15rem; }
    .session-date { font-size: 0.92rem; font-weight: 700; color: #1e293b; }
    .session-time { font-size: 0.8rem; color: #64748b; }

    .session-row-right { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
    .mini-chip {
      font-size: 0.72rem; font-weight: 800; padding: 0.2rem 0.55rem; border-radius: 999px;
    }
    .present-chip { background: #dcfce7; color: #166534; }
    .late-chip { background: #fef9c3; color: #854d0e; }
    .absent-chip { background: #fee2e2; color: #991b1b; }
    .attend-pct {
      font-size: 0.8rem; font-weight: 800; padding: 0.2rem 0.55rem; border-radius: 6px;
    }
    .attend-pct.pct-high { background: #dcfce7; color: #166534; }
    .attend-pct.pct-mid { background: #fef3c7; color: #92400e; }
    .attend-pct.pct-low { background: #fee2e2; color: #991b1b; }
    .attend-pct.pct-none { background: #f1f5f9; color: #94a3b8; }

    /* Expanded records */
    .session-records { border-top: 1px solid #f1f5f9; background: #fafbff; }
    .records-empty { padding: 1rem 1.5rem; color: #94a3b8; font-size: 0.88rem; }
    .records-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .records-table th {
      text-align: left; padding: 0.55rem 1.5rem; background: #f1f5f9;
      color: #64748b; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;
    }
    .records-table td { padding: 0.75rem 1.5rem; border-bottom: 1px solid #f1f5f9; }
    .records-table tr:last-child td { border-bottom: none; }
    .records-table tbody tr:hover { background: #f0f4ff; }
    .student-name { font-weight: 600; color: #1e293b; }
    .student-id { color: #64748b; font-size: 0.82rem; }
    .checkin-time { color: #475569; }

    /* Status badges */
    .status-badge {
      display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 0.28rem 0.65rem; border-radius: 999px;
      font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
    }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; }
    .status-badge.present { background: #dcfce7; color: #166534; }
    .status-badge.present .status-dot { background: #22c55e; }
    .status-badge.late { background: #fef9c3; color: #854d0e; }
    .status-badge.late .status-dot { background: #eab308; }
    .status-badge.absent { background: #fee2e2; color: #991b1b; }
    .status-badge.absent .status-dot { background: #ef4444; }

    .empty-sessions-msg { padding: 3rem 1.5rem; text-align: center; color: #94a3b8; }
    .empty-sessions-msg .empty-icon { font-size: 2rem; margin-bottom: 0.5rem; }
    .empty-sessions-msg p { margin: 0; font-size: 0.95rem; }

    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 700px) {
      .history-layout { grid-template-columns: 1fr; }
      .sidebar { position: static; }
      .session-row { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class TeacherAttendanceComponent implements OnInit {
  Math = Math;
  loading = true;
  loadError = '';
  viewMode: ViewMode = 'by-course';
  tracking: TeacherAttendanceTracking = { byCourse: [], allStudents: [] };

  historyTabs: CourseHistoryTab[] = [];
  selectedHistoryCourseId: number | null = null;

  get selectedHistoryTab(): CourseHistoryTab | undefined {
    return this.historyTabs.find(t => t.courseId === this.selectedHistoryCourseId);
  }

  constructor(private api: AdminApiService) {}

  ngOnInit() {
    this.load();
  }

  get isEmpty(): boolean {
    return !this.tracking.byCourse.length && !this.tracking.allStudents.length;
  }

  load() {
    this.loading = true;
    this.loadError = '';
    this.api.getTeacherAttendanceTracking().subscribe({
      next: (data) => {
        this.tracking = data;
        // Build history tabs from course data
        this.historyTabs = data.byCourse.map(c => ({
          courseId: c.courseId,
          code: c.code,
          name: c.name,
          data: null,
          loading: false,
          loaded: false,
          error: false,
          expandedSessions: new Set<number>(),
        }));
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Could not load attendance tracking.';
        this.loading = false;
      },
    });
  }

  switchToHistory() {
    this.viewMode = 'history';
    if (this.historyTabs.length > 0 && !this.selectedHistoryCourseId) {
      this.selectHistoryCourse(this.historyTabs[0]);
    }
  }

  selectHistoryCourse(tab: CourseHistoryTab) {
    this.selectedHistoryCourseId = tab.courseId;
    if (!tab.loaded && !tab.loading) {
      this.loadHistoryForCourse(tab);
    }
  }

  loadHistoryForCourse(tab: CourseHistoryTab) {
    tab.loading = true;
    tab.error = false;
    this.api.getCourseAttendanceHistory(tab.courseId).subscribe({
      next: (data: any) => {
        tab.data = data as CourseHistoryTeacherView;
        tab.loaded = true;
        tab.loading = false;
      },
      error: () => {
        tab.error = true;
        tab.loading = false;
      }
    });
  }

  toggleSession(sessionId: number) {
    const tab = this.selectedHistoryTab;
    if (!tab) return;
    if (tab.expandedSessions.has(sessionId)) {
      tab.expandedSessions.delete(sessionId);
    } else {
      tab.expandedSessions.add(sessionId);
    }
  }

  isSessionExpanded(sessionId: number): boolean {
    return this.selectedHistoryTab?.expandedSessions.has(sessionId) ?? false;
  }

  formatPct(pct: number | null): string {
    if (pct == null) return 'N/A';
    return `${pct}%`;
  }

  pctClass(pct: number | null): string {
    if (pct == null) return 'pct-none';
    if (pct >= 90) return 'pct-high';
    if (pct >= 75) return 'pct-mid';
    return 'pct-low';
  }
}
