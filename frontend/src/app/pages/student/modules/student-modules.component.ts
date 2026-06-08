import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminApiService, CourseEnrollment, CourseModuleRecord } from '../../../services/admin-api.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface CourseWithModules {
  enrollment: CourseEnrollment;
  modules: CourseModuleRecord[];
  loadingModules: boolean;
}

@Component({
  selector: 'app-student-modules',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-container animate-fade-in">
      <div class="page-header">
        <h1 class="page-title">My Course Modules</h1>
        <p class="page-subtitle">Access lecture notes, slides, assignments, and resources uploaded by your teachers.</p>
      </div>

      <div *ngIf="loading" class="card-box loading-state">
        <i class="pi pi-spin pi-spinner loading-icon"></i>
        <p>Loading your courses...</p>
      </div>

      <div *ngIf="!loading && courseList.length === 0" class="empty-state card-box">
        <i class="pi pi-bookmark-slash empty-icon"></i>
        <h3>No courses enrolled yet</h3>
        <p>You need to enroll in courses first before you can access their modules.</p>
        <a routerLink="/student/schedule" class="btn btn-primary">
          <i class="pi pi-calendar-plus"></i> Go to Schedule & Enroll
        </a>
      </div>

      <div class="course-group" *ngFor="let item of courseList">
        <div class="group-header" [style.background]="getGradientColor(item.enrollment.code)">
          <div class="group-info">
            <span class="course-code">{{ item.enrollment.code }}</span>
            <h2 class="course-name">{{ item.enrollment.name }}</h2>
            <span class="teacher-label">
              <i class="pi pi-user"></i> {{ item.enrollment.assignedTeacher }}
            </span>
          </div>
          <span class="credits-label">
            <i class="pi pi-bookmark"></i> {{ item.enrollment.credits }} credits
          </span>
        </div>

        <!-- Loading modules -->
        <div class="modules-loading" *ngIf="item.loadingModules">
          <i class="pi pi-spin pi-spinner"></i> Loading modules...
        </div>

        <!-- No modules yet -->
        <div class="modules-empty" *ngIf="!item.loadingModules && item.modules.length === 0">
          <i class="pi pi-folder-open"></i>
          <span>No modules uploaded yet for this course. Check back later.</span>
        </div>

        <!-- Real modules from teacher -->
        <div class="modules-list" *ngIf="!item.loadingModules && item.modules.length > 0">
          <ng-container *ngFor="let mod of item.modules">
            <a
              *ngIf="mod.url && mod.type !== 'text'"
              [href]="mod.url"
              target="_blank"
              rel="noopener"
              class="module-item"
            >
              <div class="module-icon" [ngClass]="'icon-' + normalizeType(mod.type)">
                <i class="pi" [ngClass]="getTypeIcon(mod.type)"></i>
              </div>
              <div class="module-info">
                <h4>{{ mod.title }}</h4>
                <p class="module-type">{{ getTypeLabel(mod.type) }}</p>
                <p class="module-desc" *ngIf="mod.description">{{ mod.description }}</p>
                <p class="module-date">Added {{ mod.createdAt | date:'mediumDate' }}</p>
              </div>
              <i class="pi pi-external-link open-icon"></i>
            </a>
            <div *ngIf="!mod.url || mod.type === 'text'" class="module-item module-item-static">
              <div class="module-icon" [ngClass]="'icon-' + normalizeType(mod.type)">
                <i class="pi" [ngClass]="getTypeIcon(mod.type)"></i>
              </div>
              <div class="module-info">
                <h4>{{ mod.title }}</h4>
                <p class="module-type">{{ getTypeLabel(mod.type) }}</p>
                <p class="module-text" *ngIf="mod.content">{{ mod.content }}</p>
                <p class="module-desc" *ngIf="mod.description">{{ mod.description }}</p>
                <p class="module-date">Added {{ mod.createdAt | date:'mediumDate' }}</p>
              </div>
            </div>
          </ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { display: flex; flex-direction: column; gap: 2rem; font-family: 'Inter', sans-serif; }
    .page-header { margin-bottom: 0.5rem; }
    .page-title { font-size: 2.25rem; font-weight: 800; color: #0f172a; margin: 0 0 0.5rem 0; letter-spacing: -0.025em; }
    .page-subtitle { color: #64748b; font-size: 1rem; margin: 0; }

    .card-box {
      background: #ffffff; border: 1px solid #e2e8f0;
      border-radius: 16px; padding: 1.75rem;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }

    .loading-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 3rem; color: #64748b;
    }
    .loading-icon { font-size: 2.5rem; color: #3b82f6; margin-bottom: 1rem; }

    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 4rem 2rem; text-align: center;
      border: 2px dashed #cbd5e1; background: #f8fafc;
    }
    .empty-icon { font-size: 4rem; color: #94a3b8; margin-bottom: 1.25rem; }
    .empty-state h3 { font-size: 1.3rem; font-weight: 700; color: #334155; margin: 0 0 0.5rem 0; }
    .empty-state p { color: #64748b; font-size: 0.95rem; max-width: 400px; margin: 0 0 1.5rem 0; }

    .btn {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem 1.5rem; font-size: 0.95rem; font-weight: 600;
      border-radius: 10px; transition: all 0.2s; cursor: pointer; text-decoration: none; border: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, #2563eb, #3b82f6); color: #ffffff;
    }
    .btn-primary:hover { background: linear-gradient(135deg, #1d4ed8, #2563eb); transform: translateY(-1px); }

    /* ─── Course Group ──────────────────────────── */
    .course-group {
      background: #ffffff; border-radius: 16px; overflow: hidden;
      box-shadow: 0 4px 10px rgba(0,0,0,0.03); border: 1px solid #e2e8f0;
      transition: transform 0.25s ease-out, box-shadow 0.25s;
    }
    .course-group:hover { transform: translateY(-3px); box-shadow: 0 12px 20px rgba(0,0,0,0.07); }

    .group-header {
      padding: 1.25rem 1.5rem; color: #ffffff;
      display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.75rem;
    }
    .group-info { display: flex; flex-direction: column; gap: 0.2rem; }
    .course-code {
      font-size: 0.78rem; font-weight: 800; letter-spacing: 0.08em;
      background: rgba(255,255,255,0.25); border-radius: 5px; padding: 0.1rem 0.5rem;
      display: inline-block; align-self: flex-start;
    }
    .course-name { font-size: 1.2rem; font-weight: 800; margin: 0; line-height: 1.3; }
    .teacher-label { font-size: 0.85rem; opacity: 0.9; display: flex; align-items: center; gap: 0.35rem; }
    .credits-label { font-size: 0.8rem; font-weight: 600; opacity: 0.85; display: flex; align-items: center; gap: 0.35rem; }

    .modules-loading {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 1.25rem 1.5rem; color: #64748b; font-size: 0.875rem;
    }

    .modules-empty {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 1.5rem; color: #94a3b8; font-size: 0.875rem;
    }
    .modules-empty i { font-size: 1.4rem; color: #cbd5e1; }

    /* ─── Module Items ──────────────────────────── */
    .modules-list { display: flex; flex-direction: column; }
    .module-item-static { cursor: default; }
    .module-item-static:hover { background: #f8fafc; transform: none; }
    .module-text {
      font-size: 0.88rem; color: #334155; margin: 0.35rem 0 0;
      white-space: pre-wrap; line-height: 1.5;
    }
    .icon-text { background: #f3e8ff; color: #6b21a8; }
    .icon-file { background: #dcfce7; color: #166534; }

    .module-item {
      display: flex; align-items: center; gap: 1rem;
      padding: 1rem 1.5rem; text-decoration: none; color: inherit;
      border-top: 1px solid #f1f5f9; transition: background 0.2s;
    }
    .module-item:hover { background: #f8fafc; }
    .module-item:hover .open-icon { color: #3b82f6; transform: translateY(-1px); }

    .module-icon {
      width: 44px; height: 44px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.25rem; flex-shrink: 0;
    }
    .icon-link     { background: #dbeafe; color: #1e40af; }
    .icon-drive    { background: #dcfce7; color: #166534; }
    .icon-video    { background: #fee2e2; color: #991b1b; }
    .icon-document { background: #fef3c7; color: #92400e; }

    .module-info { flex: 1; }
    .module-info h4 { font-size: 0.92rem; font-weight: 700; color: #1e293b; margin: 0 0 0.2rem 0; }
    .module-type { font-size: 0.72rem; font-weight: 700; background: #f1f5f9; color: #475569; border-radius: 5px; padding: 0.1rem 0.4rem; display: inline-block; margin: 0 0 0.2rem 0; }
    .module-desc { font-size: 0.78rem; color: #64748b; margin: 0 0 0.2rem 0; }
    .module-date { font-size: 0.72rem; color: #94a3b8; margin: 0; }

    .open-icon { color: #cbd5e1; font-size: 1rem; flex-shrink: 0; transition: all 0.2s; }

    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class StudentModulesComponent implements OnInit {
  courseList: CourseWithModules[] = [];
  loading = true;

  constructor(private apiService: AdminApiService) {}

  ngOnInit() {
    this.loadEnrollmentsAndModules();
  }

  loadEnrollmentsAndModules() {
    this.apiService.getMyEnrollments().subscribe({
      next: (enrollments) => {
        this.courseList = enrollments.map(e => ({
          enrollment: e,
          modules: [],
          loadingModules: true
        }));
        this.loading = false;

        // Load modules per course in parallel
        enrollments.forEach((e, i) => {
          this.apiService.getModulesByCourse(e.courseId).pipe(
            catchError(() => of([]))
          ).subscribe(mods => {
            this.courseList[i].modules = mods;
            this.courseList[i].loadingModules = false;
          });
        });
      },
      error: () => { this.loading = false; }
    });
  }

  getGradientColor(code: string): string {
    let hash = 0;
    for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
    const gradients = [
      'linear-gradient(135deg, #1e3a8a, #3b82f6)',
      'linear-gradient(135deg, #064e3b, #10b981)',
      'linear-gradient(135deg, #78350f, #f59e0b)',
      'linear-gradient(135deg, #581c87, #8b5cf6)',
      'linear-gradient(135deg, #831843, #ec4899)',
      'linear-gradient(135deg, #164e63, #06b6d4)',
      'linear-gradient(135deg, #9f1239, #f43f5e)'
    ];
    return gradients[Math.abs(hash) % gradients.length];
  }

  normalizeType(type: string): string {
    if (type === 'drive' || type === 'document') return 'file';
    if (type === 'text') return 'text';
    return type;
  }

  getTypeIcon(type: string): string {
    const t = this.normalizeType(type);
    const icons: Record<string, string> = {
      link: 'pi-link', video: 'pi-video', file: 'pi-file', text: 'pi-align-left',
    };
    return icons[t] ?? 'pi-file';
  }

  getTypeLabel(type: string): string {
    const t = this.normalizeType(type);
    const labels: Record<string, string> = {
      link: 'Link', video: 'Video', file: 'File', text: 'Text',
    };
    return labels[t] ?? type;
  }
}
