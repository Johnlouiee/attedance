import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import {
  AdminApiService,
  AttendanceHistoryRecord,
  AttendanceSession,
  CourseEnrollment,
} from '../../../services/admin-api.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CardModule, ButtonModule],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.css'
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  user: any;
  enrollments: CourseEnrollment[] = [];
  activeSessionByCourse: Record<number, AttendanceSession> = {};
  recentHistory: AttendanceHistoryRecord[] = [];
  loadingCourses = true;
  loadingHistory = true;

  private userSub!: Subscription;

  constructor(
    private authService: AuthService,
    private apiService: AdminApiService,
  ) {}

  ngOnInit() {
    this.userSub = this.authService.user$.subscribe(user => {
      this.user = user;
    });
    this.loadDashboardData();
  }

  ngOnDestroy() {
    if (this.userSub) this.userSub.unsubscribe();
  }

  loadDashboardData() {
    this.loadingCourses = true;
    this.apiService.getMyEnrollments().subscribe({
      next: (enrollments) => {
        this.enrollments = enrollments;
        this.loadingCourses = false;
      },
      error: () => {
        this.enrollments = [];
        this.loadingCourses = false;
      },
    });

    this.apiService.getMyActiveAttendanceSessions().subscribe({
      next: (sessions) => {
        this.activeSessionByCourse = sessions.reduce((map, session) => {
          map[session.courseId] = session;
          return map;
        }, {} as Record<number, AttendanceSession>);
      },
      error: () => {
        this.activeSessionByCourse = {};
      },
    });

    this.loadingHistory = true;
    this.apiService.getMyAttendanceHistory().subscribe({
      next: (history) => {
        this.recentHistory = history
          .filter(h => h.status === 'PRESENT' || h.status === 'LATE')
          .slice(0, 5);
        this.loadingHistory = false;
      },
      error: () => {
        this.recentHistory = [];
        this.loadingHistory = false;
      },
    });
  }

  getCourseColor(code: string): string {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];
    return colors[Math.abs(hash) % colors.length];
  }

  getHistoryIcon(status: string): string {
    return status === 'LATE' ? 'pi-clock' : 'pi-check';
  }

  getHistoryCircleClass(status: string): string {
    return status === 'LATE' ? 'warning' : 'success';
  }

  formatHistoryTime(record: AttendanceHistoryRecord): string {
    const date = record.scannedAt || record.createdAt;
    const label = record.status === 'LATE' ? 'Late' : 'On time';
    return `${new Date(date).toLocaleString()} (${label})`;
  }
}
