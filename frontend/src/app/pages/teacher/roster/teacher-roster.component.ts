import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminApiService, RosterStudent, TeacherCourse } from '../../../services/admin-api.service';
import { formatApiError } from '../../../utils/api-error.util';

@Component({
  selector: 'app-teacher-roster',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-container animate-fade-in">
      <!-- Header with back navigation -->
      <div class="page-header">
        <div class="header-nav">
          <a routerLink="/teacher/courses" class="back-link">
            <i class="pi pi-arrow-left"></i> Back to Courses
          </a>
          <h1 class="page-title">
            <i class="pi pi-users header-icon"></i>
            {{ course ? course.code + ' — ' + course.name : 'Course Roster' }}
          </h1>
          <p class="page-subtitle" *ngIf="course?.scheduleLabel">
            <i class="pi pi-clock"></i> Class time: <strong>{{ course?.scheduleLabel }}</strong>
          </p>
        </div>
      </div>

      <!-- Split Layout -->
      <div class="roster-layout">
        <!-- Left Column: Add Student Form -->
        <div class="card-panel enroll-panel">
          <h3 class="panel-title"><i class="pi pi-user-plus"></i> Enroll Student Manually</h3>
          <p class="panel-desc">Type the student's ID number or email address to add them directly to this class.</p>

          <form (ngSubmit)="enrollStudent()" class="enroll-form">
            <div class="form-group">
              <label for="studentIdOrEmail">Student ID or Email</label>
              <div class="input-wrapper">
                <i class="pi pi-search"></i>
                <input
                  id="studentIdOrEmail"
                  type="text"
                  [(ngModel)]="studentInput"
                  name="studentIdOrEmail"
                  placeholder="e.g. 20202255 or email@gmail.com"
                  [disabled]="enrolling"
                  autocomplete="off"
                  required
                />
              </div>
            </div>

            <button type="submit" class="btn btn-primary" [disabled]="enrolling || !studentInput.trim()">
              <i class="pi" [ngClass]="enrolling ? 'pi-spin pi-spinner' : 'pi-plus-circle'"></i>
              {{ enrolling ? 'Enrolling...' : 'Enroll Student' }}
            </button>
          </form>

          <div *ngIf="enrollSuccess" class="alert alert-success animate-slide-in">
            <i class="pi pi-check-circle"></i> {{ enrollSuccess }}
          </div>
          <div *ngIf="enrollError" class="alert alert-danger animate-slide-in">
            <i class="pi pi-exclamation-circle"></i> {{ enrollError }}
          </div>
        </div>

        <!-- Right Column: Roster List -->
        <div class="card-panel list-panel">
          <div class="list-header">
            <h3 class="panel-title"><i class="pi pi-list"></i> Enrolled Students ({{ students.length }})</h3>
            <button type="button" class="btn-refresh" (click)="loadRoster()" [disabled]="loading">
              <i class="pi pi-refresh" [class.pi-spin]="loading"></i> Refresh
            </button>
          </div>

          <div class="loading-state" *ngIf="loading && students.length === 0">
            <i class="pi pi-spin pi-spinner spinner-icon"></i>
            <span>Loading class roster...</span>
          </div>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="!loading && students.length === 0">
            <i class="pi pi-users empty-icon"></i>
            <h3>No students enrolled yet</h3>
            <p>Students can join this class using the invite link, or you can manually enroll them using the form on the left.</p>
          </div>

          <!-- Roster Table -->
          <div class="table-responsive" *ngIf="students.length > 0">
            <table class="roster-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Email</th>
                  <th>Enrolled On</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of students" class="student-row">
                  <td class="student-name-cell">
                    <div class="avatar-circle">
                      {{ s.firstName[0].toUpperCase() }}{{ s.lastName[0].toUpperCase() }}
                    </div>
                    <span>{{ s.firstName }} {{ s.lastName }}</span>
                  </td>
                  <td><code class="id-badge">{{ s.studentNumber }}</code></td>
                  <td>{{ s.email }}</td>
                  <td>{{ s.enrolledAt | date:'mediumDate' }}</td>
                  <td>
                    <button
                      type="button"
                      class="btn-remove"
                      (click)="removeStudent(s)"
                      [disabled]="removingId === s.enrollmentId"
                      [title]="'Remove ' + s.firstName + ' from this course'"
                    >
                      <i class="pi" [ngClass]="removingId === s.enrollmentId ? 'pi-spin pi-spinner' : 'pi-user-minus'"></i>
                      {{ removingId === s.enrollmentId ? 'Removing' : 'Remove' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { display: flex; flex-direction: column; gap: 1.5rem; font-family: 'Inter', sans-serif; }
    
    .page-header {
      background: #ffffff;
      border: 1px solid #bfdbfe;
      border-radius: 16px;
      padding: 1.25rem 1.5rem;
      box-shadow: 0 4px 12px rgba(59,130,246,0.06);
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: #2563eb;
      font-weight: 700;
      text-decoration: none;
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
      transition: transform 0.2s;
    }
    .back-link:hover { transform: translateX(-2px); }
    .page-title { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin: 0 0 0.35rem; display: flex; align-items: center; gap: 0.6rem; }
    .header-icon { color: #1e3a8a; }
    .page-subtitle { color: #64748b; margin: 0; font-size: 0.9rem; display: flex; align-items: center; gap: 0.4rem; }

    .roster-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 1.5rem;
      align-items: start;
    }

    @media (max-width: 992px) {
      .roster-layout { grid-template-columns: 1fr; }
    }

    .card-panel {
      background: #fff;
      border: 1px solid #bfdbfe;
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 4px 12px rgba(59,130,246,0.06);
    }

    .panel-title { font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0 0 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
    .panel-title i { color: #1e3a8a; }
    .panel-desc { color: #64748b; font-size: 0.85rem; line-height: 1.4; margin: 0 0 1.25rem; }

    .enroll-form { display: flex; flex-direction: column; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-group label { font-size: 0.8rem; font-weight: 700; color: #475569; }
    .input-wrapper { position: relative; display: flex; align-items: center; }
    .input-wrapper i { position: absolute; left: 1rem; color: #94a3b8; font-size: 0.95rem; }
    .input-wrapper input {
      width: 100%;
      padding: 0.75rem 1rem 0.75rem 2.5rem;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      font-size: 0.9rem;
      color: #1e293b;
      transition: all 0.2s;
    }
    .input-wrapper input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary { background: #1e3a8a; color: #fff; }
    .btn-primary:hover:not(:disabled) { background: #1d4ed8; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .alert {
      padding: 0.75rem 1rem;
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 600;
      margin-top: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      line-height: 1.4;
    }
    .alert-success { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .alert-danger { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

    .list-panel { display: flex; flex-direction: column; gap: 1.25rem; }
    .list-header { display: flex; justify-content: space-between; align-items: center; }
    .btn-refresh {
      background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px;
      padding: 0.4rem 0.8rem; font-size: 0.78rem; font-weight: 700; color: #475569;
      cursor: pointer; display: flex; align-items: center; gap: 0.35rem; transition: background 0.2s;
    }
    .btn-refresh:hover { background: #e2e8f0; }

    .loading-state { display: flex; align-items: center; justify-content: center; gap: 0.75rem; color: #64748b; padding: 3rem 0; }
    .spinner-icon { font-size: 1.5rem; }

    .empty-state {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      padding: 4rem 2rem; border: 2px dashed #bfdbfe; background: #f8fafc; border-radius: 14px;
    }
    .empty-icon { font-size: 3.5rem; color: #93c5fd; margin-bottom: 1rem; }
    .empty-state h3 { margin: 0 0 0.5rem; color: #1e293b; font-size: 1.2rem; }
    .empty-state p { color: #64748b; font-size: 0.9rem; max-width: 400px; line-height: 1.5; margin: 0; }

    .table-responsive { width: 100%; overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 12px; }
    .roster-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem; }
    .roster-table th {
      background: #f8fafc; padding: 0.85rem 1rem; color: #475569;
      font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
    }
    .roster-table td { padding: 0.85rem 1rem; border-top: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
    
    .student-row { transition: background-color 0.2s; }
    .student-row:hover { background-color: #f8fafc; }
    
    .student-name-cell { display: flex; align-items: center; gap: 0.75rem; font-weight: 700; color: #0f172a; }
    .avatar-circle {
      width: 30px; height: 30px; border-radius: 50%; background: #eff6ff; color: #1e40af;
      display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;
      border: 1px solid #bfdbfe;
    }

    .id-badge {
      background: #f1f5f9; color: #334155; font-family: monospace; font-size: 0.82rem;
      padding: 0.2rem 0.5rem; border-radius: 6px; border: 1px solid #e2e8f0;
    }

    .btn-remove {
      display: inline-flex; align-items: center; gap: 0.3rem;
      background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;
      border-radius: 6px; padding: 0.35rem 0.65rem; font-size: 0.78rem; font-weight: 700;
      cursor: pointer; transition: all 0.2s;
    }
    .btn-remove:hover:not(:disabled) { background: #fee2e2; border-color: #fca5a5; }
    .btn-remove:disabled { opacity: 0.6; cursor: not-allowed; }

    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    .animate-slide-in { animation: slideIn 0.25s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class TeacherRosterComponent implements OnInit {
  courseId!: number;
  course: TeacherCourse | null = null;
  students: RosterStudent[] = [];
  
  loading = false;
  enrolling = false;
  removingId: number | null = null;

  studentInput = '';
  enrollSuccess = '';
  enrollError = '';

  constructor(
    private apiService: AdminApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.courseId = Number(params.get('id'));
      this.loadCourseDetails();
      this.loadRoster();
    });
  }

  loadCourseDetails() {
    this.apiService.getMyCourses().subscribe({
      next: (courses) => {
        const match = courses.find(c => c.id === this.courseId);
        if (match) {
          this.course = match;
        }
      },
      error: (err) => {
        console.error('Failed to load course details', err);
      }
    });
  }

  loadRoster() {
    this.loading = true;
    this.apiService.getCourseRoster(this.courseId).subscribe({
      next: (roster) => {
        this.students = roster;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load roster', err);
        this.loading = false;
      }
    });
  }

  enrollStudent() {
    if (!this.studentInput.trim()) return;

    this.enrolling = true;
    this.enrollSuccess = '';
    this.enrollError = '';

    this.apiService.enrollStudent(this.courseId, this.studentInput).subscribe({
      next: (res) => {
        this.enrolling = false;
        this.enrollSuccess = res.message;
        this.studentInput = '';
        this.loadRoster();
        // Auto-dismiss success message
        setTimeout(() => this.enrollSuccess = '', 4000);
      },
      error: (err) => {
        this.enrolling = false;
        this.enrollError = formatApiError(err, 'Failed to enroll student.');
      }
    });
  }

  removeStudent(student: RosterStudent) {
    if (!confirm(`Are you sure you want to remove ${student.firstName} ${student.lastName} from this class?`)) {
      return;
    }

    this.removingId = student.enrollmentId;
    this.apiService.unenrollStudentFromCourse(this.courseId, student.enrollmentId).subscribe({
      next: () => {
        this.removingId = null;
        this.loadRoster();
      },
      error: (err) => {
        this.removingId = null;
        alert(formatApiError(err, 'Failed to remove student.'));
      }
    });
  }
}
