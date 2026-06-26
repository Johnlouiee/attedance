import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { LandingComponent } from './pages/landing/landing.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { StudentLayoutComponent } from './layouts/student-layout/student-layout.component';
import { StudentDashboardComponent } from './pages/student/dashboard/student-dashboard.component';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './pages/admin/dashboard/admin-dashboard.component';

export const roleGuard = (allowedRoles: string[]) => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const user = authService.getUser();
    
    if (!user || !authService.isLoggedIn()) {
      router.navigate(['/login']);
      return false;
    }
    
    if (allowedRoles.includes(user.role)) {
      return true;
    }
    
    // Redirect if role doesn't match
    if (user.role === 'TEACHER') {
      router.navigate(['/teacher/dashboard']);
    } else if (user.role === 'ADMIN') {
      router.navigate(['/admin/dashboard']);
    } else {
      router.navigate(['/student/schedule']);
    }
    return false;
  };
};

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', loadComponent: () => import('./pages/reset-password/reset-password.component').then(c => c.ResetPasswordComponent) },
  
  // Student Protected Routes
  { 
    path: 'student', 
    component: StudentLayoutComponent,
    canActivate: [roleGuard(['STUDENT'])],
    children: [
      { path: 'dashboard', component: StudentDashboardComponent },
      { path: 'schedule', loadComponent: () => import('./pages/student/schedule/student-schedule.component').then(c => c.StudentScheduleComponent) },
      { path: 'join', loadComponent: () => import('./pages/student/join/student-join.component').then(c => c.StudentJoinComponent) },
      { path: 'join/:token', loadComponent: () => import('./pages/student/join/student-join.component').then(c => c.StudentJoinComponent) },
      { path: 'history', loadComponent: () => import('./pages/student/history/student-history.component').then(c => c.StudentHistoryComponent) },
      { path: 'modules', loadComponent: () => import('./pages/student/modules/student-modules.component').then(c => c.StudentModulesComponent) },
      { path: 'scan', loadComponent: () => import('./pages/student/scan/student-scan.component').then(c => c.StudentScanComponent) },
      { path: 'announcements', loadComponent: () => import('./pages/student/announcements/student-announcements.component').then(c => c.StudentAnnouncementsComponent) },
      { path: 'notes', loadComponent: () => import('./pages/student/notes/student-notes.component').then(c => c.StudentNotesComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Teacher Protected Routes
  {
    path: 'teacher',
    loadComponent: () => import('./layouts/teacher-layout/teacher-layout.component').then(c => c.TeacherLayoutComponent),
    canActivate: [roleGuard(['TEACHER'])],
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/teacher/dashboard/teacher-dashboard.component').then(c => c.TeacherDashboardComponent) },
      { path: 'courses', loadComponent: () => import('./pages/teacher/courses/teacher-courses.component').then(c => c.TeacherCoursesComponent) },
      { path: 'courses/:id/roster', loadComponent: () => import('./pages/teacher/roster/teacher-roster.component').then(c => c.TeacherRosterComponent) },
      { path: 'modules', loadComponent: () => import('./pages/teacher/modules/teacher-modules.component').then(c => c.TeacherModulesComponent) },
      { path: 'attendance', loadComponent: () => import('./pages/teacher/attendance/teacher-attendance.component').then(c => c.TeacherAttendanceComponent) },
      { path: 'announcements', loadComponent: () => import('./pages/teacher/announcements/teacher-announcements.component').then(c => c.TeacherAnnouncementsComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Admin Protected Routes
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [roleGuard(['ADMIN'])],
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'reports', loadComponent: () => import('./pages/admin/reports/admin-reports.component').then(c => c.AdminReportsComponent) },
      { path: 'students', loadComponent: () => import('./pages/admin/students/admin-students.component').then(c => c.AdminStudentsComponent) },
      { path: 'teachers', loadComponent: () => import('./pages/admin/teachers/admin-teachers.component').then(c => c.AdminTeachersComponent) },
      { path: 'courses', loadComponent: () => import('./pages/admin/courses/admin-courses.component').then(c => c.AdminCoursesComponent) },
      { path: 'settings', loadComponent: () => import('./pages/admin/settings/admin-settings.component').then(c => c.AdminSettingsComponent) },
      { path: 'announcements', loadComponent: () => import('./pages/admin/announcements/admin-announcements.component').then(c => c.AdminAnnouncementsComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Email Verification (public - linked from email)
  { path: 'verify-email', loadComponent: () => import('./pages/verify-email/verify-email.component').then(c => c.VerifyEmailComponent) },

  { path: '**', redirectTo: '' }
];
