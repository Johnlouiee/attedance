import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminApiService, TeacherAttendanceTracking } from '../../../services/admin-api.service';

type ViewMode = 'by-course' | 'all-students';

@Component({
  selector: 'app-teacher-attendance',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-container animate-fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Track Attendance</h1>
          <p class="page-subtitle">View attendance rates from completed class sessions.</p>
        </div>
        <div class="view-tags">
          <button
            type="button"
            class="view-tag"
            [class.active]="viewMode === 'by-course'"
            (click)="viewMode = 'by-course'"
          >
            <i class="pi pi-book"></i> By course
          </button>
          <button
            type="button"
            class="view-tag"
            [class.active]="viewMode === 'all-students'"
            (click)="viewMode = 'all-students'"
          >
            <i class="pi pi-users"></i> All students
          </button>
        </div>
      </div>

      <div class="card-panel loading-state" *ngIf="loading">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Loading attendance data...</span>
      </div>

      <div class="card-panel alert-error" *ngIf="loadError">
        <i class="pi pi-exclamation-circle"></i> {{ loadError }}
      </div>

      <div class="card-panel empty-page" *ngIf="!loading && !loadError && isEmpty">
        <i class="pi pi-chart-bar"></i>
        <h3>No attendance data yet</h3>
        <p>Create a course, have students join, and run at least one attendance session.</p>
        <a routerLink="/teacher/courses" class="btn-link">Go to My Courses</a>
      </div>

      <!-- By course -->
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

      <!-- All students -->
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
    }
    .view-tag.active { background: #1e3a8a; border-color: #1e3a8a; color: #fff; }
    .card-panel {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.25rem 1.5rem;
    }
    .loading-state { display: flex; align-items: center; justify-content: center; gap: 0.75rem; color: #64748b; }
    .alert-error { color: #b91c1c; background: #fef2f2; border-color: #fecaca; display: flex; gap: 0.5rem; align-items: center; }
    .empty-page { text-align: center; padding: 2.5rem; }
    .empty-page i { font-size: 2.5rem; color: #93c5fd; margin-bottom: 0.75rem; }
    .btn-link { color: #2563eb; font-weight: 700; text-decoration: none; }
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
      display: inline-block; padding: 0.2rem 0.55rem; border-radius: 6px;
      font-size: 0.8rem; font-weight: 800;
    }
    .pct-pill.pct-high { background: #dcfce7; color: #166534; }
    .pct-pill.pct-mid { background: #fef3c7; color: #92400e; }
    .pct-pill.pct-low { background: #fee2e2; color: #991b1b; }
    .pct-pill.pct-none { background: #f1f5f9; color: #64748b; }
    .course-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .course-chip {
      font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 6px;
      background: #f1f5f9; color: #334155;
    }
    .course-chip.pct-high { background: #dcfce7; color: #166534; }
    .course-chip.pct-mid { background: #fef3c7; color: #92400e; }
    .course-chip.pct-low { background: #fee2e2; color: #991b1b; }
    .muted { color: #94a3b8; font-size: 0.85rem; }
    .all-students-panel { padding: 0; overflow: hidden; }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class TeacherAttendanceComponent implements OnInit {
  loading = true;
  loadError = '';
  viewMode: ViewMode = 'by-course';
  tracking: TeacherAttendanceTracking = { byCourse: [], allStudents: [] };

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
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Could not load attendance tracking.';
        this.loading = false;
      },
    });
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
