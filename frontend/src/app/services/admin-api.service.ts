import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

const API_BASE = 'http://localhost:3000/api/v1';

export interface UserRecord {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  studentId?: string;
  profilePhoto?: string;
  createdAt: string;
}

export interface AdminStats {
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  total: number;
}

export interface CourseRecord {
  id: number;
  code: string;
  name: string;
  credits: number;
  assignedTeacher: string;
  teacherAssignmentStatus?: 'pending' | 'accepted' | 'declined' | null;
  studentCount: number;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  constructor(private http: HttpClient, private authService: AuthService) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${API_BASE}/admin/stats`, { headers: this.headers() });
  }

  getAllUsers(): Observable<UserRecord[]> {
    return this.http.get<UserRecord[]>(`${API_BASE}/admin/users`, { headers: this.headers() });
  }

  getStudents(): Observable<UserRecord[]> {
    return this.http.get<UserRecord[]>(`${API_BASE}/admin/students`, { headers: this.headers() });
  }

  getTeachers(): Observable<UserRecord[]> {
    return this.http.get<UserRecord[]>(`${API_BASE}/admin/teachers`, { headers: this.headers() });
  }

  createTeacher(dto: { firstName: string; lastName: string; teacherId?: string; password: string }): Observable<any> {
    return this.http.post(`${API_BASE}/admin/teacher`, dto, { headers: this.headers() });
  }

  toggleStatus(userId: number): Observable<any> {
    return this.http.patch(`${API_BASE}/admin/users/${userId}/toggle-status`, {}, { headers: this.headers() });
  }

  deleteUser(userId: number): Observable<any> {
    return this.http.delete(`${API_BASE}/admin/users/${userId}`, { headers: this.headers() });
  }

  getCourses(): Observable<CourseRecord[]> {
    return this.http.get<CourseRecord[]>(`${API_BASE}/courses`, { headers: this.headers() });
  }

  createCourse(dto: {
    code: string;
    name: string;
    credits: number;
    teacherId?: number;
    classStartTime?: string;
    classEndTime?: string;
    classDays?: string;
    autoStartOffsetMinutes?: number;
  }): Observable<CourseRecord> {
    return this.http.post<CourseRecord>(`${API_BASE}/courses`, dto, { headers: this.headers() });
  }

  deleteCourse(id: number): Observable<any> {
    return this.http.delete(`${API_BASE}/courses/${id}`, { headers: this.headers() });
  }

  updateCourse(id: number, dto: {
    code?: string;
    name?: string;
    credits?: number;
    classStartTime?: string;
    classEndTime?: string;
    classDays?: string;
    enableAutoStart?: boolean;
  }): Observable<any> {
    return this.http.patch<any>(`${API_BASE}/courses/${id}`, dto, { headers: this.headers() });
  }

  // --- Student Enrollment Endpoints ---
  getMyEnrollments(): Observable<CourseEnrollment[]> {
    return this.http.get<CourseEnrollment[]>(`${API_BASE}/enrollments/me`, { headers: this.headers() });
  }

  getJoinPreview(inviteToken: string): Observable<JoinCoursePreview> {
    const token = this.extractTokenFromInvite(inviteToken);
    return this.http.get<JoinCoursePreview>(
      `${API_BASE}/enrollments/join/${token}/preview`,
      { headers: this.headers() },
    );
  }

  joinCourseByInvite(inviteToken: string): Observable<{ message: string; enrollmentId: number; courseId: number; courseCode: string }> {
    return this.http.post<{ message: string; enrollmentId: number; courseId: number; courseCode: string }>(
      `${API_BASE}/enrollments/join`,
      { inviteToken },
      { headers: this.headers() },
    );
  }

  private extractTokenFromInvite(input: string): string {
    const trimmed = input.trim();
    const match = trimmed.match(/\/join\/([a-f0-9]+)/i);
    if (match) return match[1];
    return trimmed;
  }

  unenrollCourse(enrollmentId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_BASE}/enrollments/${enrollmentId}`, {
      headers: this.headers(),
    });
  }

  // --- Teacher Course Endpoints ---
  getMyCourses(): Observable<TeacherCourse[]> {
    return this.http.get<TeacherCourse[]>(`${API_BASE}/courses/mine`, { headers: this.headers() });
  }

  createTeacherCourse(dto: {
    code: string;
    name: string;
    classStartTime: string;
    classEndTime: string;
    classDays?: string;
  }): Observable<TeacherCourse> {
    return this.http.post<TeacherCourse>(`${API_BASE}/courses/mine`, dto, { headers: this.headers() });
  }

  getPendingAssignments(): Observable<TeacherCourse[]> {
    return this.http.get<TeacherCourse[]>(`${API_BASE}/courses/pending`, { headers: this.headers() });
  }

  acceptAssignment(courseId: number): Observable<any> {
    return this.http.post(`${API_BASE}/courses/${courseId}/accept`, {}, { headers: this.headers() });
  }

  declineAssignment(courseId: number): Observable<any> {
    return this.http.post(`${API_BASE}/courses/${courseId}/decline`, {}, { headers: this.headers() });
  }

  // --- Course Modules Endpoints ---
  getMyModules(): Observable<TeacherCourseGroup[]> {
    return this.http.get<TeacherCourseGroup[]>(`${API_BASE}/course-modules/mine`, { headers: this.headers() });
  }

  getModulesByCourse(courseId: number): Observable<CourseModuleRecord[]> {
    return this.http.get<CourseModuleRecord[]>(`${API_BASE}/course-modules/by-course/${courseId}`, { headers: this.headers() });
  }

  createCourseModule(dto: {
    courseId: number;
    title: string;
    type: string;
    url?: string;
    content?: string;
    description?: string;
  }): Observable<CourseModuleRecord> {
    return this.http.post<CourseModuleRecord>(`${API_BASE}/course-modules`, dto, { headers: this.headers() });
  }

  updateCourseModule(id: number, dto: {
    title?: string;
    type?: string;
    url?: string;
    content?: string;
    description?: string;
  }): Observable<CourseModuleRecord> {
    return this.http.patch<CourseModuleRecord>(`${API_BASE}/course-modules/${id}`, dto, { headers: this.headers() });
  }

  deleteCourseModule(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_BASE}/course-modules/${id}`, { headers: this.headers() });
  }

  // --- Attendance Endpoints ---
  startAttendanceSession(dto: {
    courseId: number;
    durationMinutes?: number;
    lateAfterMinutes?: number;
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
  }): Observable<AttendanceSession> {
    return this.http.post<AttendanceSession>(`${API_BASE}/attendance/sessions/start`, dto, { headers: this.headers() });
  }

  endAttendanceSession(sessionId: number): Observable<AttendanceSession> {
    return this.http.post<AttendanceSession>(`${API_BASE}/attendance/sessions/${sessionId}/end`, {}, { headers: this.headers() });
  }

  getActiveAttendanceSession(courseId: number): Observable<AttendanceSession | null> {
    return this.http.get<AttendanceSession | null>(`${API_BASE}/attendance/courses/${courseId}/active-session`, { headers: this.headers() });
  }

  getAttendanceToken(sessionId: number): Observable<AttendanceSession> {
    return this.http.get<AttendanceSession>(`${API_BASE}/attendance/sessions/${sessionId}/token`, { headers: this.headers() });
  }

  scanAttendance(dto: { token: string; latitude?: number; longitude?: number }): Observable<AttendanceScanResult> {
    return this.http.post<AttendanceScanResult>(`${API_BASE}/attendance/scan`, dto, { headers: this.headers() });
  }

  checkInAttendance(courseId: number, dto: { code: string; latitude?: number; longitude?: number }): Observable<AttendanceScanResult> {
    return this.http.post<AttendanceScanResult>(`${API_BASE}/attendance/courses/${courseId}/check-in`, dto, { headers: this.headers() });
  }

  getMyActiveAttendanceSessions(): Observable<AttendanceSession[]> {
    return this.http.get<AttendanceSession[]>(`${API_BASE}/attendance/active/me`, { headers: this.headers() });
  }

  getMyAttendanceHistory(): Observable<AttendanceHistoryRecord[]> {
    return this.http.get<AttendanceHistoryRecord[]>(`${API_BASE}/attendance/history/me`, { headers: this.headers() });
  }

  getTeacherAttendanceTracking(): Observable<TeacherAttendanceTracking> {
    return this.http.get<TeacherAttendanceTracking>(
      `${API_BASE}/attendance/teacher/tracking`,
      { headers: this.headers() },
    );
  }

  getCourseAttendanceHistory(courseId: number): Observable<CourseHistoryStudentView | CourseHistoryTeacherView> {
    return this.http.get<CourseHistoryStudentView | CourseHistoryTeacherView>(
      `${API_BASE}/attendance/courses/${courseId}/history`,
      { headers: this.headers() },
    );
  }

  getCourseRoster(courseId: number): Observable<RosterStudent[]> {
    return this.http.get<RosterStudent[]>(`${API_BASE}/courses/${courseId}/roster`, { headers: this.headers() });
  }

  enrollStudent(courseId: number, studentIdOrEmail: string): Observable<{ message: string; enrollment: RosterStudent }> {
    return this.http.post<{ message: string; enrollment: RosterStudent }>(
      `${API_BASE}/courses/${courseId}/enroll`,
      { studentIdOrEmail },
      { headers: this.headers() }
    );
  }

  unenrollStudentFromCourse(courseId: number, enrollmentId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${API_BASE}/courses/${courseId}/unenroll/${enrollmentId}`,
      { headers: this.headers() }
    );
  }

  regenerateInviteLink(courseId: number): Observable<TeacherCourse> {
    return this.http.post<TeacherCourse>(
      `${API_BASE}/courses/${courseId}/regenerate-invite`,
      {},
      { headers: this.headers() }
    );
  }
}

export interface TeacherAttendanceStudentRow {
  studentId: number;
  studentName: string;
  studentNumber: string;
  sessionsAttended: number;
  sessionsTotal: number;
  attendancePct: number | null;
}

export interface TeacherAttendanceCourseGroup {
  courseId: number;
  code: string;
  name: string;
  enrolledCount: number;
  sessionCount: number;
  classAttendancePct: number | null;
  students: TeacherAttendanceStudentRow[];
}

export interface TeacherAttendanceAllStudent {
  studentId: number;
  studentName: string;
  studentNumber: string;
  overallAttendancePct: number | null;
  courses: Array<{
    courseId: number;
    courseCode: string;
    courseName: string;
    sessionsAttended: number;
    sessionsTotal: number;
    attendancePct: number | null;
  }>;
}

export interface TeacherAttendanceTracking {
  byCourse: TeacherAttendanceCourseGroup[];
  allStudents: TeacherAttendanceAllStudent[];
}

export interface CourseEnrollment {
  enrollmentId: number;
  courseId: number;
  code: string;
  name: string;
  credits: number;
  assignedTeacher: string;
  enrolledAt: string;
  classStartTime?: string | null;
  classEndTime?: string | null;
  scheduleLabel?: string | null;
}

export interface JoinCoursePreview {
  courseId: number;
  code: string;
  name: string;
  credits: number;
  assignedTeacher: string;
  scheduleLabel?: string | null;
  inviteToken?: string;
}

export interface RosterStudent {
  enrollmentId: number;
  studentId: number;
  firstName: string;
  lastName: string;
  email: string;
  studentNumber: string;
  enrolledAt: string;
}

export interface TeacherCourse {
  id: number;
  code: string;
  name: string;
  credits: number;
  teacherId: number;
  teacherAssignmentStatus?: 'pending' | 'accepted' | 'declined' | null;
  classStartTime?: string | null;
  classEndTime?: string | null;
  classDays?: string;
  autoStartOffsetMinutes?: number;
  enableAutoStart?: boolean;
  scheduleLabel?: string | null;
  inviteToken?: string | null;
  inviteTokenExpiresAt?: string | null;
  inviteLink?: string;
  isInviteExpired?: boolean;
}

export interface CourseModuleRecord {
  id: number;
  courseId: number;
  teacherId: number;
  title: string;
  type: 'link' | 'video' | 'file' | 'text' | string;
  url: string | null;
  content?: string | null;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherCourseGroup {
  course: TeacherCourse;
  modules: CourseModuleRecord[];
}

export interface AttendanceSession {
  id: number;
  courseId: number;
  courseCode?: string;
  courseName?: string;
  status: 'ACTIVE' | 'CLOSED';
  startedAt: string;
  lateAfter: string;
  endsAt: string;
  qrRefreshSeconds: number;
  requiresLocation: boolean;
  qrPayload?: string;
  qrExpiresAt?: string;
  checkInCode?: string;
}

export interface AttendanceScanResult {
  message: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  scannedAt: string;
}

export interface AttendanceHistoryRecord {
  id: number;
  courseId: number;
  courseCode: string;
  courseName: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  scannedAt: string | null;
  createdAt: string;
}

// Per-course attendance history interfaces
export interface CourseHistoryStudentSession {
  sessionId: number;
  startedAt: string;
  endedAt: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | null;
  scannedAt: string | null;
}

export interface CourseHistoryStudentView {
  courseId: number;
  courseCode: string;
  courseName: string;
  sessions: CourseHistoryStudentSession[];
}

export interface CourseHistoryStudentRecord {
  studentId: number;
  studentName: string;
  studentNumber: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  scannedAt: string | null;
}

export interface CourseHistoryTeacherSession {
  sessionId: number;
  startedAt: string;
  endedAt: string;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  totalCount: number;
  records: CourseHistoryStudentRecord[];
}

export interface CourseHistoryTeacherView {
  courseId: number;
  courseCode: string;
  courseName: string;
  sessions: CourseHistoryTeacherSession[];
}
