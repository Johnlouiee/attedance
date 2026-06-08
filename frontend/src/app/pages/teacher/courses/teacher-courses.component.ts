import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AdminApiService, TeacherCourse } from '../../../services/admin-api.service';
import { buildStudentJoinUrl } from '../../../utils/invite.util';
import { formatApiError } from '../../../utils/api-error.util';

@Component({
  selector: 'app-teacher-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-container animate-fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">My Courses</h1>
          <p class="page-subtitle">Create classes, set schedule times, and share invite links with students.</p>
        </div>
        <button type="button" class="btn-primary" (click)="openCreateForm()">
          <i class="pi pi-plus"></i> Create Course
        </button>
      </div>

      <div class="card-panel loading-state" *ngIf="loading">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Loading your courses...</span>
      </div>

      <div class="card-panel empty-page" *ngIf="!loading && courses.length === 0">
        <i class="pi pi-book"></i>
        <h3>No courses yet</h3>
        <p>Create your first course here. After that, open Course Modules to add materials inside each class.</p>
        <button type="button" class="btn-primary" style="margin-top: 1.25rem;" (click)="openCreateForm()">
          <i class="pi pi-plus"></i> Create Course
        </button>
      </div>

      <div class="courses-grid" *ngIf="!loading && courses.length > 0">
        <div class="course-card" *ngFor="let course of courses">
          <div class="course-card-top">
            <span class="course-code-badge">{{ course.code }}</span>
            <h2 class="course-name">{{ course.name }}</h2>
            <p class="course-meta" *ngIf="course.scheduleLabel">
              <i class="pi pi-clock"></i> {{ course.scheduleLabel }}
              <span class="schedule-days-pill">{{ formatDays(course.classDays) }}</span>
            </p>
          </div>

          <div class="invite-row" *ngIf="course.inviteToken">
            <span class="invite-label"><i class="pi pi-link"></i> Student invite</span>
            <code class="invite-url">{{ getJoinUrl(course) }}</code>
            <button type="button" class="btn-outline" (click)="copyInviteLink(course)">
              <i class="pi" [ngClass]="copiedCourseId === course.id ? 'pi-check' : 'pi-copy'"></i>
              {{ copiedCourseId === course.id ? 'Copied' : 'Copy link' }}
            </button>
          </div>

          <div class="course-card-actions">
            <a routerLink="/teacher/modules" class="btn-modules">
              <i class="pi pi-folder-open"></i> Modules
            </a>
            <button type="button" class="btn-edit" (click)="openEditForm(course)">
              <i class="pi pi-pencil"></i> Edit
            </button>
            <button type="button" class="btn-delete" (click)="deleteCourse(course.id, course.code)">
              <i class="pi pi-trash"></i> Delete
            </button>
          </div>
        </div>
      </div>

      <div class="info-banner" *ngIf="!loading && courses.length > 0">
        <i class="pi pi-info-circle"></i>
        <span>Modules (links, videos, documents) are added inside each course on the <a routerLink="/teacher/modules">Course Modules</a> page.</span>
      </div>

      <div class="modal-backdrop animate-fade-in" *ngIf="showForm" (click)="closeForm()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingCourseId ? 'Edit Course' : 'Create New Course' }}</h3>
            <button type="button" class="close-btn" (click)="closeForm()"><i class="pi pi-times"></i></button>
          </div>

          <form (ngSubmit)="saveCourse()" class="modal-form">
            <div class="form-group">
              <label>Course Code</label>
              <input type="text" [(ngModel)]="courseForm.code" name="code" placeholder="e.g. CS-101" required class="form-input" />
            </div>
            <div class="form-group">
              <label>Course Title</label>
              <input type="text" [(ngModel)]="courseForm.name" name="name" placeholder="e.g. Introduction to Programming" required class="form-input" />
            </div>
            <div class="form-row-times">
              <div class="form-group">
                <label>Class Start</label>
                <input type="time" [(ngModel)]="courseForm.classStartTime" name="classStartTime" required class="form-input" />
              </div>
              <div class="form-group">
                <label>Class End</label>
                <input type="time" [(ngModel)]="courseForm.classEndTime" name="classEndTime" required class="form-input" />
              </div>
            </div>
            <div class="form-group">
              <label>Class Days</label>
              <div class="day-selector">
                <button type="button" 
                  *ngFor="let day of weekdayOptions"
                  class="day-pill"
                  [class.active]="courseForm.classDays[day.value]"
                  (click)="toggleDay(day.value)">
                  {{ day.label }}
                </button>
              </div>
              <span class="field-hint">Select the days this class meets.</span>
            </div>
            <p class="form-hint">Students see this schedule after they join via your invite link. Attendance auto-opens 5 minutes after class start.</p>

            <div *ngIf="saveError" class="alert-error">
              <i class="pi pi-exclamation-circle"></i> {{ saveError }}
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeForm()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving || !canSubmitCourse()">
                <span *ngIf="!saving"><i class="pi pi-check"></i> {{ editingCourseId ? 'Save Changes' : 'Create Course' }}</span>
                <span *ngIf="saving"><i class="pi pi-spin pi-spinner"></i> {{ editingCourseId ? 'Saving...' : 'Creating...' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { display: flex; flex-direction: column; gap: 1.5rem; font-family: 'Inter', sans-serif; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
    .page-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0 0 0.25rem; }
    .page-subtitle { color: #64748b; font-size: 0.95rem; margin: 0; }
    .btn-primary {
      display: inline-flex; align-items: center; gap: 0.5rem;
      background: #1e3a8a; color: #fff; border: none; border-radius: 10px;
      padding: 0.7rem 1.4rem; font-size: 0.9rem; font-weight: 700; cursor: pointer;
    }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .card-panel {
      background: #fff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 1.5rem;
      box-shadow: 0 4px 12px rgba(59,130,246,0.06);
    }
    .loading-state { display: flex; align-items: center; justify-content: center; gap: 0.75rem; color: #64748b; padding: 2rem; }
    .empty-page {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      padding: 3rem; border: 2px dashed #bfdbfe; background: #f8fafc;
    }
    .empty-page i { font-size: 3rem; color: #93c5fd; margin-bottom: 1rem; }
    .empty-page h3 { margin: 0 0 0.5rem; color: #1e293b; }
    .empty-page p { color: #64748b; max-width: 420px; margin: 0; }
    .courses-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.25rem;
    }
    .course-card {
      background: #fff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 1.25rem 1.5rem;
      display: flex; flex-direction: column; gap: 1rem;
      box-shadow: 0 4px 12px rgba(59,130,246,0.06);
    }
    .course-code-badge {
      background: #1e3a8a; color: #fff; font-size: 0.78rem; font-weight: 800;
      border-radius: 6px; padding: 0.2rem 0.65rem; display: inline-block; margin-bottom: 0.5rem;
    }
    .course-name { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin: 0 0 0.35rem; }
    .course-meta { font-size: 0.85rem; color: #64748b; margin: 0; display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; }
    .invite-row {
      display: flex; flex-direction: column; gap: 0.5rem;
      padding: 0.75rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px;
    }
    .invite-label { font-size: 0.75rem; font-weight: 700; color: #166534; }
    .invite-url { font-size: 0.72rem; color: #14532d; word-break: break-all; }
    .btn-outline {
      align-self: flex-start; display: inline-flex; align-items: center; gap: 0.35rem;
      background: #fff; border: 1px solid #86efac; color: #166534; border-radius: 8px;
      padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 600; cursor: pointer;
    }
    .course-card-actions { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: auto; }
    .btn-modules, .btn-edit, .btn-delete {
      display: inline-flex; align-items: center; gap: 0.35rem;
      font-size: 0.8rem; font-weight: 700; text-decoration: none; border-radius: 8px; padding: 0.45rem 0.75rem;
      cursor: pointer;
    }
    .btn-modules { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    .btn-modules:hover { background: #dbeafe; }
    .btn-edit { background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; }
    .btn-edit:hover { background: #e2e8f0; }
    .btn-delete { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .btn-delete:hover { background: #fee2e2; }
    .info-banner {
      display: flex; align-items: flex-start; gap: 0.5rem;
      padding: 0.85rem 1rem; background: #eff6ff; border: 1px solid #bfdbfe;
      border-radius: 10px; font-size: 0.88rem; color: #334155;
    }
    .info-banner a { color: #1d4ed8; font-weight: 600; }
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(15,23,42,0.5);
      display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;
    }
    .modal-content {
      background: #fff; border-radius: 16px; width: 100%; max-width: 480px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15); overflow: hidden;
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0;
    }
    .modal-header h3 { margin: 0; font-size: 1.15rem; font-weight: 800; color: #0f172a; }
    .close-btn { background: none; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer; }
    .modal-form { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-group label { font-size: 0.85rem; font-weight: 700; color: #334155; }
    .form-input {
      padding: 0.65rem 0.85rem; border: 1.5px solid #cbd5e1; border-radius: 10px;
      font-size: 0.95rem; color: #1e293b;
    }
    .form-row-times { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .day-selector { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.25rem; }
    .day-pill {
      flex: 1; min-width: 38px; text-align: center; padding: 0.4rem 0;
      border: 1.5px solid #cbd5e1; background: #f8fafc; color: #475569;
      border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer;
      transition: all 0.2s ease;
    }
    .day-pill:hover { background: #f1f5f9; border-color: #94a3b8; }
    .day-pill.active { background: #1e3a8a; color: #ffffff; border-color: #1e3a8a; }
    .schedule-days-pill {
      font-size: 0.72rem; font-weight: 700;
      background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe;
      border-radius: 6px; padding: 0.1rem 0.45rem; display: inline-block;
      margin-left: 0.35rem;
    }
    .form-hint { font-size: 0.8rem; color: #64748b; margin: 0; }
    .field-hint { font-size: 0.78rem; color: #64748b; margin-top: 0.25rem; display: block; }
    .optional { font-weight: 500; color: #94a3b8; font-size: 0.8rem; }
    .alert-error {
      padding: 0.75rem; background: #fef2f2; color: #b91c1c;
      border: 1px solid #fecaca; border-radius: 8px; font-size: 0.875rem;
    }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 0.5rem; border-top: 1px solid #e2e8f0; }
    .btn-secondary {
      background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;
      border-radius: 10px; padding: 0.7rem 1.2rem; font-weight: 600; cursor: pointer;
    }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class TeacherCoursesComponent implements OnInit {
  loading = true;
  saving = false;
  showForm = false;
  saveError = '';
  courses: TeacherCourse[] = [];
  copiedCourseId: number | null = null;
  editingCourseId: number | null = null;

  weekdayOptions = [
    { label: 'M', value: 1 },
    { label: 'T', value: 2 },
    { label: 'W', value: 3 },
    { label: 'Th', value: 4 },
    { label: 'F', value: 5 },
    { label: 'Sa', value: 6 },
    { label: 'Su', value: 0 },
  ];

  courseForm: {
    code: string;
    name: string;
    classStartTime: string;
    classEndTime: string;
    classDays: { [key: number]: boolean };
  } = {
    code: '',
    name: '',
    classStartTime: '08:00',
    classEndTime: '09:30',
    classDays: {
      1: true,
      2: true,
      3: true,
      4: true,
      5: true,
    }
  };

  constructor(
    private apiService: AdminApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadCourses();
    this.route.queryParams.subscribe(params => {
      if (params['create'] === 'true') {
        this.openCreateForm();
      }
    });
  }

  loadCourses() {
    this.loading = true;
    this.apiService.getMyCourses().subscribe({
      next: (courses) => {
        this.courses = courses;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  openCreateForm() {
    this.editingCourseId = null;
    this.saveError = '';
    this.courseForm = {
      code: '',
      name: '',
      classStartTime: '08:00',
      classEndTime: '09:30',
      classDays: {
        1: true,
        2: true,
        3: true,
        4: true,
        5: true,
      }
    };
    this.showForm = true;
  }

  openEditForm(course: TeacherCourse) {
    this.saveError = '';
    this.editingCourseId = course.id;
    
    const activeDays: { [key: number]: boolean } = {};
    this.weekdayOptions.forEach(d => {
      activeDays[d.value] = false;
    });
    
    if (course.classDays) {
      course.classDays.split(',').map(n => n.trim()).filter(Boolean).map(Number).forEach(day => {
        activeDays[day] = true;
      });
    } else {
      [1, 2, 3, 4, 5].forEach(day => {
        activeDays[day] = true;
      });
    }

    this.courseForm = {
      code: course.code,
      name: course.name,
      classStartTime: course.classStartTime || '08:00',
      classEndTime: course.classEndTime || '09:30',
      classDays: activeDays
    };
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingCourseId = null;
    this.saveError = '';
  }

  toggleDay(value: number) {
    this.courseForm.classDays[value] = !this.courseForm.classDays[value];
  }

  canSubmitCourse(): boolean {
    const hasDays = Object.values(this.courseForm.classDays).some(v => v);
    return !!(
      this.courseForm.code?.trim() &&
      this.courseForm.name?.trim() &&
      this.courseForm.classStartTime &&
      this.courseForm.classEndTime &&
      hasDays
    );
  }

  saveCourse() {
    if (!this.canSubmitCourse()) {
      this.saveError = 'Fill in course code, title, class times, and days.';
      return;
    }
    this.saving = true;
    this.saveError = '';

    const selectedDays = Object.keys(this.courseForm.classDays)
      .map(Number)
      .filter(day => this.courseForm.classDays[day])
      .sort((a, b) => a - b)
      .join(',');

    const payload = {
      code: this.courseForm.code.toUpperCase().trim(),
      name: this.courseForm.name.trim(),
      classStartTime: this.courseForm.classStartTime,
      classEndTime: this.courseForm.classEndTime,
      classDays: selectedDays,
    };

    if (this.editingCourseId) {
      this.apiService.updateCourse(this.editingCourseId, payload).subscribe({
        next: () => {
          this.saving = false;
          this.closeForm();
          this.loadCourses();
        },
        error: (err) => {
          this.saving = false;
          this.saveError = formatApiError(err, 'Failed to update course.');
        }
      });
    } else {
      this.apiService.createTeacherCourse(payload).subscribe({
        next: () => {
          this.saving = false;
          this.closeForm();
          this.loadCourses();
        },
        error: (err) => {
          this.saving = false;
          this.saveError = formatApiError(err, 'Failed to create course.');
        },
      });
    }
  }

  deleteCourse(id: number, code: string) {
    if (!confirm(`Are you sure you want to delete course ${code}? This will remove all modules and attendance records associated with it.`)) {
      return;
    }
    this.apiService.deleteCourse(id).subscribe({
      next: () => {
        this.loadCourses();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to delete course.');
      }
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

  getJoinUrl(course: TeacherCourse) {
    return course.inviteToken ? buildStudentJoinUrl(course.inviteToken) : '';
  }

  copyInviteLink(course: TeacherCourse) {
    if (!course.inviteToken) return;
    navigator.clipboard.writeText(buildStudentJoinUrl(course.inviteToken));
    this.copiedCourseId = course.id;
    setTimeout(() => {
      if (this.copiedCourseId === course.id) this.copiedCourseId = null;
    }, 2500);
  }
}
