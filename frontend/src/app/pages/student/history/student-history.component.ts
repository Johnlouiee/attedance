import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AdminApiService,
  CourseEnrollment,
  CourseHistoryStudentSession,
  CourseHistoryStudentView,
} from '../../../services/admin-api.service';


interface CourseTab {
  courseId: number;
  code: string;
  name: string;
  sessions: CourseHistoryStudentSession[];
  loaded: boolean;
  loading: boolean;
  error: boolean;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  totalCount: number;
}

@Component({
  selector: 'app-student-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container animate-fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Attendance History</h1>
          <p class="page-subtitle">Track your attendance record across all enrolled classes.</p>
        </div>
      </div>

      <!-- Loading state -->
      <div class="global-loader" *ngIf="loadingCourses">
        <span class="spinner"></span>
        <span>Loading your courses...</span>
      </div>

      <!-- No courses -->
      <div class="empty-state card" *ngIf="!loadingCourses && courseTabs.length === 0">
        <div class="empty-icon">📚</div>
        <h3>No enrolled classes</h3>
        <p>Join a class first to see your attendance history.</p>
      </div>

      <!-- Main content -->
      <div class="layout" *ngIf="!loadingCourses && courseTabs.length > 0">
        <!-- Sidebar: Course list -->
        <aside class="sidebar">
          <p class="sidebar-label">YOUR CLASSES</p>
          <button
            *ngFor="let tab of courseTabs"
            class="course-btn"
            [class.active]="selectedCourseId === tab.courseId"
            (click)="selectCourse(tab)"
          >
            <span class="course-btn-code">{{ tab.code }}</span>
            <span class="course-btn-name">{{ tab.name }}</span>
            <span class="course-btn-pct" [ngClass]="pctClass(tab.totalCount > 0 ? Math.round(((tab.presentCount + tab.lateCount) / tab.totalCount) * 100) : null)">
              {{ tab.totalCount > 0 ? Math.round(((tab.presentCount + tab.lateCount) / tab.totalCount) * 100) + '%' : '—' }}
            </span>
          </button>
        </aside>

        <!-- Right panel: Session list -->
        <section class="detail-panel" *ngIf="selectedTab">
          <!-- Course header -->
          <div class="course-header">
            <div class="course-header-left">
              <span class="code-badge">{{ selectedTab.code }}</span>
              <h2 class="course-name">{{ selectedTab.name }}</h2>
            </div>
            <div class="stats-row" *ngIf="!selectedTab.loading && selectedTab.loaded">
              <div class="stat-chip present">
                <span class="stat-val">{{ selectedTab.presentCount }}</span>
                <span class="stat-lbl">Present</span>
              </div>
              <div class="stat-chip late">
                <span class="stat-val">{{ selectedTab.lateCount }}</span>
                <span class="stat-lbl">Late</span>
              </div>
              <div class="stat-chip absent">
                <span class="stat-val">{{ selectedTab.absentCount }}</span>
                <span class="stat-lbl">Absent</span>
              </div>
              <div class="stat-chip total">
                <span class="stat-val">{{ selectedTab.totalCount }}</span>
                <span class="stat-lbl">Total</span>
              </div>
            </div>
          </div>

          <!-- Loading -->
          <div class="section-loader" *ngIf="selectedTab.loading">
            <span class="spinner"></span> Loading sessions...
          </div>

          <!-- Error -->
          <div class="alert-error" *ngIf="selectedTab.error">
            <span>⚠️ Failed to load attendance history for this class.</span>
          </div>

          <!-- Empty sessions -->
          <div class="empty-sessions" *ngIf="!selectedTab.loading && !selectedTab.error && selectedTab.sessions.length === 0">
            <div class="empty-icon">🗓️</div>
            <p>No completed sessions yet for this class.</p>
          </div>

          <!-- Session table -->
          <div class="sessions-wrapper" *ngIf="!selectedTab.loading && !selectedTab.error && selectedTab.sessions.length > 0">
            <div class="progress-bar-wrap">
              <div class="progress-bar-track">
                <div
                  class="progress-bar-fill"
                  [style.width.%]="selectedTab.totalCount > 0 ? ((selectedTab.presentCount + selectedTab.lateCount) / selectedTab.totalCount) * 100 : 0"
                  [ngClass]="pctClass(selectedTab.totalCount > 0 ? Math.round(((selectedTab.presentCount + selectedTab.lateCount) / selectedTab.totalCount) * 100) : null)"
                ></div>
              </div>
              <span class="progress-label">
                {{ selectedTab.totalCount > 0 ? Math.round(((selectedTab.presentCount + selectedTab.lateCount) / selectedTab.totalCount) * 100) : 0 }}% attendance rate
              </span>
            </div>

            <table class="session-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Check-in Time</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of selectedTab.sessions; let i = index">
                  <td class="session-num">{{ selectedTab.sessions.length - i }}</td>
                  <td class="date-col">{{ s.startedAt | date:'MMM d, y' }}</td>
                  <td class="time-col">{{ s.startedAt | date:'h:mm a' }}</td>
                  <td>
                    <span class="status-badge" *ngIf="s.status" [ngClass]="s.status.toLowerCase()">
                      <span class="status-dot"></span>
                      {{ s.status }}
                    </span>
                    <span class="status-badge unknown" *ngIf="!s.status">
                      <span class="status-dot"></span>
                      No Record
                    </span>
                  </td>
                  <td class="checkin-col">
                    <span *ngIf="s.scannedAt">{{ s.scannedAt | date:'h:mm a' }}</span>
                    <span class="muted" *ngIf="!s.scannedAt">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page-container { display: flex; flex-direction: column; gap: 1.5rem; font-family: 'Inter', sans-serif; }
    .page-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0 0 0.25rem; }
    .page-subtitle { color: #64748b; margin: 0; font-size: 0.95rem; }

    .global-loader, .section-loader {
      display: flex; align-items: center; gap: 0.75rem; color: #64748b; font-size: 0.95rem; padding: 1.5rem;
    }
    .spinner {
      width: 18px; height: 18px; border: 2.5px solid #e2e8f0; border-top-color: #6366f1;
      border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state.card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
      padding: 3rem; text-align: center;
    }
    .empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .empty-state h3 { color: #1e293b; margin: 0 0 0.5rem; }
    .empty-state p { color: #64748b; margin: 0; }

    .layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 1.25rem;
      align-items: start;
    }

    /* Sidebar */
    .sidebar {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      position: sticky;
      top: 1.5rem;
    }
    .sidebar-label {
      font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em;
      color: #94a3b8; padding: 1rem 1.25rem 0.5rem; margin: 0;
      text-transform: uppercase;
    }
    .course-btn {
      width: 100%; display: flex; flex-direction: column; align-items: flex-start;
      padding: 0.85rem 1.25rem; background: none; border: none;
      border-bottom: 1px solid #f1f5f9; cursor: pointer;
      transition: background 0.15s; text-align: left; gap: 0.2rem;
      position: relative;
    }
    .course-btn:last-child { border-bottom: none; }
    .course-btn:hover { background: #f8fafc; }
    .course-btn.active { background: #eff6ff; }
    .course-btn.active::before {
      content: ''; position: absolute; left: 0; top: 0; bottom: 0;
      width: 3px; background: #6366f1; border-radius: 0 2px 2px 0;
    }
    .course-btn-code {
      font-size: 0.7rem; font-weight: 800; color: #6366f1;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .course-btn.active .course-btn-code { color: #4f46e5; }
    .course-btn-name { font-size: 0.88rem; font-weight: 600; color: #1e293b; line-height: 1.3; }
    .course-btn-pct {
      font-size: 0.75rem; font-weight: 700; padding: 0.15rem 0.45rem;
      border-radius: 999px; margin-top: 0.2rem;
    }
    .course-btn-pct.pct-high { background: #dcfce7; color: #166534; }
    .course-btn-pct.pct-mid { background: #fef9c3; color: #854d0e; }
    .course-btn-pct.pct-low { background: #fee2e2; color: #991b1b; }
    .course-btn-pct.pct-none { background: #f1f5f9; color: #94a3b8; }

    /* Detail panel */
    .detail-panel {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
    }

    .course-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 1.25rem 1.5rem; background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
      border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; gap: 1rem;
    }
    .course-header-left { display: flex; flex-direction: column; gap: 0.25rem; }
    .code-badge {
      display: inline-block; background: #4f46e5; color: #fff;
      font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.6rem;
      border-radius: 6px; letter-spacing: 0.05em; width: fit-content;
    }
    .course-name { margin: 0; font-size: 1.15rem; font-weight: 700; color: #0f172a; }

    .stats-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .stat-chip {
      display: flex; flex-direction: column; align-items: center;
      padding: 0.5rem 1rem; border-radius: 12px; min-width: 60px;
      border: 1.5px solid transparent;
    }
    .stat-chip.present { background: #dcfce7; border-color: #86efac; }
    .stat-chip.late { background: #fef9c3; border-color: #fde047; }
    .stat-chip.absent { background: #fee2e2; border-color: #fca5a5; }
    .stat-chip.total { background: #f1f5f9; border-color: #e2e8f0; }
    .stat-val { font-size: 1.2rem; font-weight: 800; color: #0f172a; }
    .stat-lbl { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }

    /* Progress bar */
    .sessions-wrapper { padding: 1.25rem 1.5rem 1.5rem; }
    .progress-bar-wrap { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
    .progress-bar-track {
      flex: 1; height: 8px; background: #f1f5f9; border-radius: 999px; overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%; border-radius: 999px; transition: width 0.5s ease;
    }
    .progress-bar-fill.pct-high { background: linear-gradient(90deg, #34d399, #10b981); }
    .progress-bar-fill.pct-mid { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
    .progress-bar-fill.pct-low { background: linear-gradient(90deg, #f87171, #ef4444); }
    .progress-bar-fill.pct-none { background: #e2e8f0; }
    .progress-label { font-size: 0.8rem; font-weight: 700; color: #64748b; white-space: nowrap; }

    /* Table */
    .session-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .session-table th {
      text-align: left; padding: 0.6rem 1rem; background: #f8fafc;
      color: #64748b; font-size: 0.72rem; text-transform: uppercase;
      letter-spacing: 0.05em; font-weight: 700; border-bottom: 1px solid #e2e8f0;
    }
    .session-table td {
      padding: 0.85rem 1rem; border-bottom: 1px solid #f1f5f9; color: #1e293b;
    }
    .session-table tr:last-child td { border-bottom: none; }
    .session-table tbody tr { transition: background 0.15s; }
    .session-table tbody tr:hover { background: #f8fafc; }
    .session-num { font-weight: 700; color: #94a3b8; font-size: 0.8rem; }
    .date-col { font-weight: 600; color: #1e293b; }
    .time-col { color: #64748b; }
    .checkin-col { color: #475569; font-weight: 500; }
    .muted { color: #cbd5e1; }

    /* Status badges */
    .status-badge {
      display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 0.3rem 0.75rem; border-radius: 999px;
      font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
    }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; }
    .status-badge.present { background: #dcfce7; color: #166534; }
    .status-badge.present .status-dot { background: #22c55e; }
    .status-badge.late { background: #fef9c3; color: #854d0e; }
    .status-badge.late .status-dot { background: #eab308; }
    .status-badge.absent { background: #fee2e2; color: #991b1b; }
    .status-badge.absent .status-dot { background: #ef4444; }
    .status-badge.unknown { background: #f1f5f9; color: #94a3b8; }
    .status-badge.unknown .status-dot { background: #cbd5e1; }

    .alert-error {
      margin: 1.25rem 1.5rem; padding: 0.9rem 1rem; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 10px; color: #b91c1c; font-size: 0.9rem;
    }
    .empty-sessions { padding: 3rem 1.5rem; text-align: center; color: #94a3b8; }
    .empty-sessions .empty-icon { font-size: 2rem; margin-bottom: 0.5rem; }
    .empty-sessions p { margin: 0; font-size: 0.95rem; }

    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 700px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar { position: static; }
      .stats-row { gap: 0.5rem; }
    }
  `]
})
export class StudentHistoryComponent implements OnInit {
  Math = Math;
  loadingCourses = true;
  courseTabs: CourseTab[] = [];
  selectedCourseId: number | null = null;

  get selectedTab(): CourseTab | undefined {
    return this.courseTabs.find(t => t.courseId === this.selectedCourseId);
  }

  constructor(private apiService: AdminApiService) {}

  ngOnInit() {
    this.apiService.getMyEnrollments().subscribe({
      next: (enrollments) => {
        this.courseTabs = enrollments.map(e => ({
          courseId: e.courseId,
          code: e.code,
          name: e.name,
          sessions: [],
          loaded: false,
          loading: false,
          error: false,
          presentCount: 0,
          lateCount: 0,
          absentCount: 0,
          totalCount: 0,
        }));
        this.loadingCourses = false;
        if (this.courseTabs.length > 0) {
          this.selectCourse(this.courseTabs[0]);
        }
      },
      error: () => {
        this.loadingCourses = false;
      }
    });
  }

  selectCourse(tab: CourseTab) {
    this.selectedCourseId = tab.courseId;
    if (!tab.loaded && !tab.loading) {
      this.loadCourseHistory(tab);
    }
  }

  loadCourseHistory(tab: CourseTab) {
    tab.loading = true;
    tab.error = false;
    this.apiService.getCourseAttendanceHistory(tab.courseId).subscribe({
      next: (data: any) => {
        const view = data as CourseHistoryStudentView;
        tab.sessions = view.sessions || [];
        tab.presentCount = tab.sessions.filter(s => s.status === 'PRESENT').length;
        tab.lateCount = tab.sessions.filter(s => s.status === 'LATE').length;
        tab.absentCount = tab.sessions.filter(s => s.status === 'ABSENT').length;
        tab.totalCount = tab.sessions.length;
        tab.loaded = true;
        tab.loading = false;
      },
      error: () => {
        tab.error = true;
        tab.loading = false;
      }
    });
  }

  pctClass(pct: number | null): string {
    if (pct == null) return 'pct-none';
    if (pct >= 90) return 'pct-high';
    if (pct >= 75) return 'pct-mid';
    return 'pct-low';
  }
}
