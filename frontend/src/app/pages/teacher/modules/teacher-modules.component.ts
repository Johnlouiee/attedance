import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AdminApiService,
  TeacherCourse,
  CourseModuleRecord,
  TeacherCourseGroup
} from '../../../services/admin-api.service';
import { buildStudentJoinUrl } from '../../../utils/invite.util';
import { formatApiError } from '../../../utils/api-error.util';

@Component({
  selector: 'app-teacher-modules',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-container animate-fade-in">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Course Modules</h1>
          <p class="page-subtitle">Add learning resources inside each course. Create courses separately under My Courses.</p>
        </div>
        <a routerLink="/teacher/courses" class="btn-secondary-link">
          <i class="pi pi-book"></i> My Courses
        </a>
      </div>

      <!-- Loading -->
      <div class="card-panel loading-state" *ngIf="loading">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Loading your courses and modules...</span>
      </div>

      <!-- No Courses -->
      <div class="card-panel empty-page" *ngIf="!loading && courseGroups.length === 0">
        <i class="pi pi-folder-open"></i>
        <h3>No courses to add modules to</h3>
        <p>Create a course first, then return here to add modules inside that class.</p>
        <a routerLink="/teacher/courses" class="btn-primary" style="margin-top: 1.25rem; text-decoration: none;">
          <i class="pi pi-book"></i> Go to My Courses
        </a>
      </div>

      <!-- Course Groups -->
      <div class="course-group" *ngFor="let group of courseGroups">
        <div class="group-header">
          <div class="group-title-row">
            <span class="course-code-badge">{{ group.course.code }}</span>
            <h2 class="group-title">{{ group.course.name }}</h2>
            <span class="credits-chip" *ngIf="group.course.scheduleLabel"><i class="pi pi-clock"></i> {{ group.course.scheduleLabel }}</span>
          </div>
          <div class="group-actions">
            <button class="btn-add-module" (click)="openCreateForm(group.course)">
              <i class="pi pi-plus"></i> Add Module
            </button>
            <button
              type="button"
              class="btn-add-module copy-link-btn"
              *ngIf="group.course.inviteToken"
              (click)="copyInviteLink(group.course)"
            >
              <i class="pi pi-copy"></i> Copy invite link
            </button>
          </div>
        </div>

        <!-- Empty Modules State -->
        <div class="modules-empty" *ngIf="group.modules.length === 0">
          <i class="pi pi-folder-open"></i>
          <span>No modules in this course yet. Use Add Module above to add your first resource.</span>
        </div>

        <!-- Modules Grid -->
        <div class="modules-grid" *ngIf="group.modules.length > 0">
          <div class="module-card" *ngFor="let mod of group.modules">
            <div class="module-icon-wrap" [ngClass]="'icon-' + mod.type">
              <i class="pi" [ngClass]="getTypeIcon(mod.type)"></i>
            </div>
            <div class="module-body">
              <h3 class="module-title">{{ mod.title }}</h3>
              <p class="module-meta">
                <span class="type-tag">{{ getTypeLabel(mod.type) }}</span>
                &nbsp;·&nbsp; Added {{ mod.createdAt | date:'mediumDate' }}
              </p>
              <p class="module-desc" *ngIf="mod.description">{{ mod.description }}</p>
              <p class="module-text-preview" *ngIf="mod.type === 'text' && mod.content">{{ mod.content }}</p>
              <a *ngIf="mod.url && mod.type !== 'text'" [href]="mod.url" target="_blank" rel="noopener" class="module-link">
                <i class="pi pi-external-link"></i> Open {{ getTypeLabel(mod.type) }}
              </a>
            </div>
            <div class="module-actions">
              <button class="action-btn btn-edit" title="Edit" (click)="openEditForm(mod, group.course)">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="action-btn btn-delete" title="Delete" (click)="deleteModule(mod)">
                <i class="pi pi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Create / Edit Modal -->
      <div class="modal-backdrop animate-fade-in" *ngIf="showForm" (click)="closeForm()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingModuleId ? 'Edit Module' : 'Add Module' }}</h3>
            <button class="close-btn" (click)="closeForm()"><i class="pi pi-times"></i></button>
          </div>

          <form (ngSubmit)="saveModule()" class="modal-form">
            <div class="course-context" *ngIf="moduleParentCourse as parent">
              <span class="context-label">Inside course</span>
              <strong>{{ parent.code }} — {{ parent.name }}</strong>
            </div>

            <div class="form-group">
              <label>Module Title</label>
              <input
                type="text"
                [(ngModel)]="form.title"
                name="title"
                placeholder="e.g. Week 3: Binary Trees"
                required
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label>Content type</label>
              <div class="type-pills">
                <button type="button" class="type-pill" [class.active]="form.type === 'link'" (click)="form.type = 'link'">
                  <i class="pi pi-link"></i> Link
                </button>
                <button type="button" class="type-pill" [class.active]="form.type === 'video'" (click)="form.type = 'video'">
                  <i class="pi pi-video"></i> Video
                </button>
                <button type="button" class="type-pill" [class.active]="form.type === 'file'" (click)="form.type = 'file'">
                  <i class="pi pi-file"></i> File
                </button>
                <button type="button" class="type-pill" [class.active]="form.type === 'text'" (click)="form.type = 'text'">
                  <i class="pi pi-align-left"></i> Text
                </button>
              </div>
            </div>

            <div class="form-group" *ngIf="form.type !== 'text'">
              <label>{{ form.type === 'video' ? 'Video URL' : form.type === 'file' ? 'File URL' : 'Link URL' }}</label>
              <div class="input-icon-wrap">
                <i class="pi pi-link input-icon"></i>
                <input
                  type="url"
                  [(ngModel)]="form.url"
                  name="url"
                  [placeholder]="getUrlPlaceholder()"
                  class="form-input with-icon"
                />
              </div>
              <small class="hint">{{ getUrlHint() }}</small>
            </div>

            <div class="form-group" *ngIf="form.type === 'text'">
              <label>Text content</label>
              <textarea
                [(ngModel)]="form.content"
                name="content"
                rows="6"
                placeholder="Write instructions, notes, or reading material for students..."
                class="form-input"
              ></textarea>
            </div>

            <div class="form-group">
              <label>Description <span class="optional">(optional)</span></label>
              <textarea
                [(ngModel)]="form.description"
                name="description"
                rows="3"
                placeholder="Brief description of this resource..."
                class="form-input"
              ></textarea>
            </div>

            <div *ngIf="saveError" class="alert-error">
              <i class="pi pi-exclamation-circle"></i> {{ saveError }}
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeForm()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving || !canSaveModule()">
                <span *ngIf="!saving"><i class="pi pi-check"></i> {{ editingModuleId ? 'Save Changes' : 'Add Module' }}</span>
                <span *ngIf="saving"><i class="pi pi-spin pi-spinner"></i> Saving...</span>
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `,
  styles: [`
    /* ─── Base ──────────────────────────────────────────────── */
    .page-container { display: flex; flex-direction: column; gap: 2rem; font-family: 'Inter', sans-serif; }

    .page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
    .page-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0 0 0.25rem 0; letter-spacing: -0.025em; }
    .page-subtitle { color: #64748b; font-size: 0.95rem; margin: 0; }
    .btn-secondary-link {
      display: inline-flex; align-items: center; gap: 0.5rem;
      background: #f1f5f9; color: #1e40af; border: 1px solid #bfdbfe;
      border-radius: 10px; padding: 0.65rem 1.2rem; font-size: 0.9rem; font-weight: 700;
      text-decoration: none;
    }
    .btn-secondary-link:hover { background: #eff6ff; }
    .course-context {
      padding: 0.85rem 1rem; background: #eff6ff; border: 1px solid #bfdbfe;
      border-radius: 10px; display: flex; flex-direction: column; gap: 0.2rem;
    }
    .context-label {
      font-size: 0.72rem; font-weight: 800; color: #1d4ed8;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .course-context strong { color: #0f172a; font-size: 0.95rem; }

    /* ─── Buttons ─────────────────────────────────────────── */
    .btn-primary {
      display: inline-flex; align-items: center; gap: 0.5rem;
      background: #1e3a8a; color: #ffffff;
      border: none; border-radius: 10px;
      padding: 0.7rem 1.4rem; font-size: 0.9rem; font-weight: 700;
      cursor: pointer; transition: background 0.2s, transform 0.15s;
    }
    .btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

    .btn-secondary {
      display: inline-flex; align-items: center; gap: 0.4rem;
      background: #f1f5f9; color: #475569;
      border: 1px solid #cbd5e1; border-radius: 10px;
      padding: 0.7rem 1.2rem; font-size: 0.9rem; font-weight: 600;
      cursor: pointer; transition: background 0.2s;
    }
    .btn-secondary:hover { background: #e2e8f0; }

    .btn-add-module {
      display: inline-flex; align-items: center; gap: 0.35rem;
      font-size: 0.8rem; font-weight: 700;
      color: #1e40af; background: #eff6ff;
      border: 1px solid #bfdbfe; border-radius: 8px;
      padding: 0.35rem 0.8rem; cursor: pointer;
      transition: background 0.2s;
    }
    .btn-add-module:hover { background: #dbeafe; }

    /* ─── Card Panel ─────────────────────────────────────────── */
    .card-panel {
      background: #ffffff; border: 1px solid #bfdbfe;
      border-radius: 16px; padding: 1.5rem;
      box-shadow: 0 4px 12px rgba(59,130,246,0.06);
    }

    .loading-state {
      display: flex; align-items: center; gap: 0.75rem;
      justify-content: center; color: #64748b; font-size: 0.95rem;
      padding: 2.5rem;
    }
    .loading-state i { color: #3b82f6; font-size: 1.5rem; }

    .empty-page {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 3.5rem; text-align: center;
      border: 2px dashed #bfdbfe; background: #f8fafc;
    }
    .empty-page i { font-size: 3rem; color: #93c5fd; margin-bottom: 1rem; }
    .empty-page h3 { font-size: 1.2rem; font-weight: 700; color: #1e293b; margin: 0 0 0.5rem 0; }
    .empty-page p { color: #64748b; font-size: 0.9rem; max-width: 380px; margin: 0; }

    /* ─── Course Group ───────────────────────────────────────── */
    .course-group {
      background: #ffffff; border: 1px solid #bfdbfe;
      border-radius: 16px; overflow: hidden;
      box-shadow: 0 4px 12px rgba(59,130,246,0.06);
    }
    .group-header {
      display: flex; justify-content: space-between; align-items: center;
      background: #eff6ff; border-bottom: 1px solid #bfdbfe;
      padding: 1rem 1.5rem; flex-wrap: wrap; gap: 0.75rem;
    }
    .group-title-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .group-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .copy-link-btn { background: #f0fdf4 !important; color: #166534 !important; border-color: #86efac !important; }
    .course-code-badge {
      background: #1e3a8a; color: #ffffff;
      font-size: 0.78rem; font-weight: 800; letter-spacing: 0.06em;
      border-radius: 6px; padding: 0.2rem 0.65rem;
    }
    .group-title { font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0; }
    .credits-chip {
      font-size: 0.75rem; font-weight: 600; color: #2563eb;
      background: #dbeafe; border-radius: 6px; padding: 0.15rem 0.55rem;
      display: flex; align-items: center; gap: 0.25rem;
    }

    .modules-empty {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 1.5rem 1.5rem; color: #94a3b8; font-size: 0.875rem;
    }
    .modules-empty i { font-size: 1.5rem; color: #bfdbfe; }

    /* ─── Modules Grid ───────────────────────────────────────── */
    .modules-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1px; background: #e2e8f0;
    }
    .module-card {
      background: #ffffff; padding: 1.25rem 1.5rem;
      display: flex; align-items: flex-start; gap: 1rem;
      transition: background 0.2s;
    }
    .module-card:hover { background: #f8fafc; }

    .module-icon-wrap {
      width: 44px; height: 44px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem; flex-shrink: 0;
    }
    .icon-link    { background: #dbeafe; color: #1e40af; }
    .icon-video   { background: #fee2e2; color: #991b1b; }
    .icon-file    { background: #dcfce7; color: #166534; }
    .icon-text    { background: #f3e8ff; color: #6b21a8; }
    .icon-drive, .icon-document { background: #dcfce7; color: #166534; }
    .module-text-preview {
      font-size: 0.82rem; color: #475569; margin: 0.35rem 0 0;
      white-space: pre-wrap; max-height: 4.5rem; overflow: hidden;
    }
    .type-pills { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .type-pill {
      display: inline-flex; align-items: center; gap: 0.35rem;
      padding: 0.45rem 0.85rem; border-radius: 8px; border: 1.5px solid #cbd5e1;
      background: #fff; color: #475569; font-size: 0.82rem; font-weight: 700; cursor: pointer;
    }
    .type-pill.active { background: #1e3a8a; border-color: #1e3a8a; color: #fff; }

    .module-body { flex: 1; min-width: 0; }
    .module-title { font-size: 0.9rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem 0; }
    .module-meta { font-size: 0.75rem; color: #64748b; margin: 0 0 0.3rem 0; }
    .type-tag {
      font-size: 0.7rem; font-weight: 700;
      background: #dbeafe; color: #1e40af;
      border-radius: 5px; padding: 0.1rem 0.4rem;
    }
    .module-desc { font-size: 0.8rem; color: #475569; margin: 0 0 0.4rem 0; }
    .module-link {
      font-size: 0.78rem; font-weight: 600; color: #2563eb;
      text-decoration: none; display: inline-flex; align-items: center; gap: 0.25rem;
    }
    .module-link:hover { color: #1e3a8a; text-decoration: underline; }

    .module-actions { display: flex; flex-direction: column; gap: 0.4rem; }
    .action-btn {
      width: 30px; height: 30px; border-radius: 8px; border: none;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 0.8rem; transition: all 0.2s;
    }
    .btn-edit   { background: #eff6ff; color: #2563eb; }
    .btn-edit:hover   { background: #dbeafe; }
    .btn-delete { background: #f8fafc; color: #64748b; }
    .btn-delete:hover { background: #fee2e2; color: #991b1b; }

    /* ─── Modal ──────────────────────────────────────────────── */
    .modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(15,23,42,0.45); backdrop-filter: blur(4px);
      z-index: 1000; display: flex; align-items: center; justify-content: center;
      padding: 1.5rem;
    }
    .modal-content {
      background: #ffffff; border-radius: 16px;
      width: 100%; max-width: 520px;
      box-shadow: 0 20px 30px rgba(0,0,0,0.12);
      padding: 1.75rem;
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1.5rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0;
    }
    .modal-header h3 { font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0; }
    .close-btn {
      background: transparent; border: none; color: #94a3b8;
      font-size: 1.1rem; cursor: pointer; padding: 0.2rem; transition: color 0.2s;
    }
    .close-btn:hover { color: #475569; }

    .modal-form { display: flex; flex-direction: column; gap: 1.1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-group label { font-size: 0.85rem; font-weight: 600; color: #475569; }
    .form-row-times { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .form-hint { margin: 0; font-size: 0.78rem; color: #64748b; line-height: 1.4; }
    .optional { font-weight: 400; color: #94a3b8; }

    .form-input {
      width: 100%; padding: 0.65rem 0.9rem;
      border: 1.5px solid #cbd5e1; border-radius: 10px;
      font-size: 0.9rem; color: #1e293b; background: #f8fafc;
      transition: border 0.2s, box-shadow 0.2s; box-sizing: border-box;
      font-family: inherit;
    }
    .form-input:focus { outline: none; border-color: #3b82f6; background: #ffffff; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
    .form-input.with-icon { padding-left: 2.5rem; }

    .form-select {
      width: 100%; padding: 0.65rem 0.9rem;
      border: 1.5px solid #cbd5e1; border-radius: 10px;
      font-size: 0.9rem; color: #1e293b; background: #f8fafc;
      cursor: pointer; transition: border 0.2s; appearance: auto;
    }
    .form-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

    .input-icon-wrap { position: relative; }
    .input-icon { position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: #94a3b8; }

    .hint { font-size: 0.78rem; color: #64748b; }

    .alert-error {
      background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;
      padding: 0.7rem 1rem; color: #991b1b; font-size: 0.85rem;
      display: flex; align-items: center; gap: 0.5rem;
    }

    .modal-footer {
      display: flex; justify-content: flex-end; gap: 0.75rem;
      margin-top: 0.5rem; padding-top: 1rem; border-top: 1px solid #e2e8f0;
    }

    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 768px) {
      .page-header { flex-direction: column; }
      .modules-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class TeacherModulesComponent implements OnInit {
  loading = true;
  saving = false;
  showForm = false;
  saveError = '';

  copiedInviteCourseId: number | null = null;
  moduleParentCourse: TeacherCourse | null = null;

  courseGroups: TeacherCourseGroup[] = [];

  editingModuleId: number | null = null;
  form = {
    courseId: 0,
    title: '',
    type: 'link' as 'link' | 'video' | 'file' | 'text',
    url: '',
    content: '',
    description: ''
  };

  constructor(private apiService: AdminApiService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.apiService.getMyModules().subscribe({
      next: (groups) => {
        this.courseGroups = groups;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load modules', err);
        this.loading = false;
      }
    });
  }

  copyInviteLink(course: TeacherCourse) {
    if (!course.inviteToken) return;
    navigator.clipboard.writeText(buildStudentJoinUrl(course.inviteToken));
    this.copiedInviteCourseId = course.id;
    setTimeout(() => {
      if (this.copiedInviteCourseId === course.id) this.copiedInviteCourseId = null;
    }, 2500);
  }

  openCreateForm(course: TeacherCourse) {
    this.editingModuleId = null;
    this.moduleParentCourse = course;
    this.saveError = '';
    this.form = {
      courseId: course.id,
      title: '',
      type: 'link',
      url: '',
      content: '',
      description: ''
    };
    this.showForm = true;
  }

  openEditForm(mod: CourseModuleRecord, course: TeacherCourse) {
    this.editingModuleId = mod.id;
    this.moduleParentCourse = course;
    this.saveError = '';
    this.form = {
      courseId: course.id,
      title: mod.title,
      type: this.normalizeModuleType(mod.type),
      url: mod.url ?? '',
      content: mod.content ?? '',
      description: mod.description ?? ''
    };
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingModuleId = null;
    this.moduleParentCourse = null;
    this.saveError = '';
  }

  normalizeModuleType(type: string): 'link' | 'video' | 'file' | 'text' {
    if (type === 'drive' || type === 'document') return 'file';
    if (type === 'video' || type === 'text' || type === 'file') return type;
    return 'link';
  }

  canSaveModule(): boolean {
    if (!this.form.title.trim() || !this.form.courseId) return false;
    if (this.form.type === 'text') return !!this.form.content.trim();
    return !!this.form.url.trim();
  }

  getUrlPlaceholder(): string {
    if (this.form.type === 'video') return 'https://youtube.com/watch?v=...';
    if (this.form.type === 'file') return 'https://drive.google.com/... or PDF link';
    return 'https://...';
  }

  getUrlHint(): string {
    if (this.form.type === 'video') return 'Paste a YouTube or other video link.';
    if (this.form.type === 'file') return 'Paste a link to a PDF, Google Drive, OneDrive, or other file.';
    return 'Paste any website or resource link.';
  }

  saveModule() {
    if (!this.canSaveModule()) {
      this.saveError = this.form.type === 'text'
        ? 'Title and text content are required.'
        : 'Title and URL are required.';
      return;
    }
    this.saving = true;
    this.saveError = '';

    const payload = {
      title: this.form.title.trim(),
      type: this.form.type,
      url: this.form.type === 'text' ? undefined : this.form.url.trim(),
      content: this.form.type === 'text' ? this.form.content.trim() : undefined,
      description: this.form.description.trim() || undefined,
    };

    if (this.editingModuleId) {
      this.apiService.updateCourseModule(this.editingModuleId, payload).subscribe({
        next: () => { this.saving = false; this.closeForm(); this.loadData(); },
        error: (err) => { this.saving = false; this.saveError = formatApiError(err, 'Failed to update module.'); }
      });
    } else {
      this.apiService.createCourseModule({
        courseId: Number(this.form.courseId),
        ...payload,
      }).subscribe({
        next: () => { this.saving = false; this.closeForm(); this.loadData(); },
        error: (err) => { this.saving = false; this.saveError = formatApiError(err, 'Failed to create module.'); }
      });
    }
  }

  deleteModule(mod: CourseModuleRecord) {
    if (!confirm(`Delete "${mod.title}"? This cannot be undone.`)) return;
    this.apiService.deleteCourseModule(mod.id).subscribe({
      next: () => this.loadData(),
      error: (err) => alert(err.error?.message ?? 'Failed to delete module.')
    });
  }

  getTypeIcon(type: string): string {
    const t = this.normalizeModuleType(type);
    const icons: Record<string, string> = {
      link: 'pi-link',
      video: 'pi-video',
      file: 'pi-file',
      text: 'pi-align-left',
    };
    return icons[t] ?? 'pi-file';
  }

  getTypeLabel(type: string): string {
    const t = this.normalizeModuleType(type);
    const labels: Record<string, string> = {
      link: 'Link',
      video: 'Video',
      file: 'File',
      text: 'Text',
    };
    return labels[t] ?? type;
  }
}
