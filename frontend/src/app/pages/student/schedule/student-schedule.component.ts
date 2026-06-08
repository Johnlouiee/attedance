import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminApiService, AttendanceSession, CourseEnrollment } from '../../../services/admin-api.service';

@Component({
  selector: 'app-student-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-container animate-fade-in">
      <div class="page-header">
        <h1 class="page-title">My Classes</h1>
        <p class="page-subtitle">Only classes you join with a teacher invite link appear here.</p>
      </div>

      <div class="card-box enrollment-section">
        <h2 class="section-title"><i class="pi pi-link"></i> Join a Class</h2>
        <p class="section-desc">Your teacher will share an invite link. Paste it to add their subject to your personal schedule.</p>
        <a routerLink="/student/join" class="btn btn-primary join-link-btn">
          <i class="pi pi-sign-in"></i> Join with Invite Link
        </a>
      </div>

      <!-- Enrolled Courses -->
      <div class="courses-section">
        <h2 class="section-title"><i class="pi pi-list"></i> My Enrolled Classes ({{ enrollments.length }})</h2>
        
        <div *ngIf="enrollments.length === 0" class="empty-state card-box">
          <i class="pi pi-calendar-times empty-icon"></i>
          <h3>No courses enrolled yet</h3>
          <p>Ask your teacher for an invite link, then use Join with Invite Link above.</p>
        </div>

        <div class="courses-grid" *ngIf="enrollments.length > 0">
          <div class="course-card animate-fade-in" *ngFor="let course of enrollments" [style.border-left-color]="getRandomColor(course.code)">
            <div>
              <span class="course-badge">{{ course.code }}</span>
              <h3 class="course-name">{{ course.name }}</h3>
              
              <div class="course-details">
                <div class="detail-item">
                  <i class="pi pi-user"></i>
                  <span>Teacher: <strong>{{ course.assignedTeacher }}</strong></span>
                </div>
                <div class="detail-item">
                  <i class="pi pi-bookmark"></i>
                  <span>Credits: <strong>{{ course.credits }} credits</strong></span>
                </div>
                <div class="detail-item" *ngIf="course.scheduleLabel">
                  <i class="pi pi-clock"></i>
                  <span>Class time: <strong>{{ course.scheduleLabel }}</strong></span>
                </div>
                <div class="detail-item">
                  <i class="pi pi-calendar"></i>
                  <span>Enrolled: <strong>{{ course.enrolledAt | date:'mediumDate' }}</strong></span>
                </div>
              </div>
            </div>

            <div class="card-actions">
              <a *ngIf="activeSessionByCourse[course.courseId]" routerLink="/student/scan" class="btn btn-success">
                <i class="pi pi-qrcode"></i> Attendance Open
              </a>
              <button (click)="drop(course)" class="btn btn-danger-outline" [disabled]="droppingId === course.enrollmentId">
                <span *ngIf="droppingId !== course.enrollmentId"><i class="pi pi-trash"></i> Drop Course</span>
                <span *ngIf="droppingId === course.enrollmentId"><i class="pi pi-spin pi-spinner"></i> Dropping...</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .page-header {
      margin-bottom: 0.5rem;
    }
    .page-title {
      font-size: 2.25rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.5rem;
      letter-spacing: -0.025em;
    }
    .page-subtitle {
      color: #64748b;
      font-size: 1rem;
    }

    .card-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.75rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .section-title i {
      color: #3b82f6;
    }
    .section-desc {
      color: #64748b;
      font-size: 0.9rem;
      margin-bottom: 1.25rem;
    }

    .join-link-btn {
      display: inline-flex;
      text-decoration: none;
      width: fit-content;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      font-size: 0.95rem;
      font-weight: 600;
      border-radius: 10px;
      transition: all 0.2s;
      cursor: pointer;
      border: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      color: #ffffff;
    }
    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #1d4ed8, #2563eb);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-danger-outline {
      background: transparent;
      border: 1.5px solid #ef4444;
      color: #ef4444;
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
      width: 100%;
      border-radius: 8px;
    }
    .btn-danger-outline:hover:not(:disabled) {
      background: #fef2f2;
      color: #dc2626;
      border-color: #dc2626;
    }
    .btn-success {
      background: #16a34a;
      color: #ffffff;
      text-decoration: none;
      width: 100%;
      margin-bottom: 0.6rem;
    }
    .btn-success:hover {
      background: #15803d;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(22, 163, 74, 0.18);
    }

    .alert {
      padding: 1rem;
      border-radius: 10px;
      margin-top: 1rem;
      font-size: 0.9rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .alert-success {
      background-color: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .alert-danger {
      background-color: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    .courses-section {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      text-align: center;
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
    }
    .empty-icon {
      font-size: 3rem;
      color: #94a3b8;
      margin-bottom: 1rem;
    }
    .empty-state h3 {
      font-size: 1.2rem;
      font-weight: 700;
      color: #334155;
      margin-bottom: 0.5rem;
    }
    .empty-state p {
      color: #64748b;
      font-size: 0.95rem;
    }

    .courses-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .course-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-left: 5px solid #3b82f6;
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1rem;
    }
    .course-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }

    .course-badge {
      display: inline-block;
      background-color: #eff6ff;
      color: #1e40af;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .course-name {
      font-size: 1.2rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 1rem;
      line-height: 1.4;
    }

    .course-details {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      border-top: 1px solid #f1f5f9;
      padding-top: 1rem;
    }
    .detail-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.875rem;
      color: #475569;
    }
    .detail-item i {
      color: #94a3b8;
      font-size: 1rem;
    }

    .card-actions {
      margin-top: 0.5rem;
    }

    .animate-fade-in {
      animation: fadeIn 0.4s ease-out;
    }
    .animate-slide-in {
      animation: slideIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class StudentScheduleComponent implements OnInit {
  enrollments: CourseEnrollment[] = [];
  activeSessions: AttendanceSession[] = [];
  activeSessionByCourse: Record<number, AttendanceSession> = {};
  droppingId: number | null = null;
  successMessage = '';
  errorMessage = '';

  constructor(private apiService: AdminApiService) {}

  ngOnInit() {
    this.loadEnrollments();
    this.loadActiveSessions();
  }

  loadEnrollments() {
    this.apiService.getMyEnrollments().subscribe({
      next: (res) => {
        this.enrollments = res;
      },
      error: (err) => {
        console.error('Failed to load enrollments', err);
      }
    });
  }

  loadActiveSessions() {
    this.apiService.getMyActiveAttendanceSessions().subscribe({
      next: (sessions) => {
        this.activeSessions = sessions;
        this.activeSessionByCourse = sessions.reduce((map, session) => {
          map[session.courseId] = session;
          return map;
        }, {} as Record<number, AttendanceSession>);
      },
      error: (err) => {
        console.error('Failed to load active attendance sessions', err);
      }
    });
  }

  drop(course: CourseEnrollment) {
    if (!confirm(`Are you sure you want to drop ${course.name} (${course.code})?`)) return;
    this.droppingId = course.enrollmentId;
    this.successMessage = '';
    this.errorMessage = '';

    this.apiService.unenrollCourse(course.enrollmentId).subscribe({
      next: () => {
        this.droppingId = null;
        this.successMessage = `Successfully left ${course.code}`;
        this.loadEnrollments();
        this.loadActiveSessions();
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.droppingId = null;
        this.errorMessage = err.error?.message || 'Failed to drop course.';
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  getRandomColor(code: string): string {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#f43f5e'  // rose
    ];
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }
}
