import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminApiService, JoinCoursePreview } from '../../../services/admin-api.service';

@Component({
  selector: 'app-student-join',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-container animate-fade-in">
      <div class="join-card">
        <h1 class="page-title">Join a Class</h1>
        <p class="page-subtitle">Paste the invite link your teacher shared to add this subject to your schedule.</p>

        <form (ngSubmit)="previewOrJoin()" class="join-form">
          <label for="inviteInput">Teacher invite link</label>
          <input
            id="inviteInput"
            type="text"
            [(ngModel)]="inviteInput"
            name="inviteInput"
            placeholder="Paste full link or token..."
            [disabled]="loading"
            autocomplete="off"
          />
          <div class="form-actions">
            <button type="button" class="btn secondary" (click)="preview()" [disabled]="loading || !inviteInput.trim()">
              Preview
            </button>
            <button type="submit" class="btn primary" [disabled]="loading || !inviteInput.trim()">
              <i class="pi" [ngClass]="loading ? 'pi-spin pi-spinner' : 'pi-sign-in'"></i>
              {{ loading ? 'Joining...' : 'Join Class' }}
            </button>
          </div>
        </form>

        <div class="preview-box" *ngIf="previewData">
          <span class="preview-label">Class preview</span>
          <h3>{{ previewData.code }} — {{ previewData.name }}</h3>
          <p><i class="pi pi-user"></i> {{ previewData.assignedTeacher }}</p>
          <p *ngIf="previewData.scheduleLabel"><i class="pi pi-clock"></i> {{ previewData.scheduleLabel }}</p>
          <p><i class="pi pi-bookmark"></i> {{ previewData.credits }} credits</p>
        </div>

        <div *ngIf="successMessage" class="alert success"><i class="pi pi-check-circle"></i> {{ successMessage }}</div>
        <div *ngIf="errorMessage" class="alert danger"><i class="pi pi-exclamation-circle"></i> {{ errorMessage }}</div>

        <a routerLink="/student/schedule" class="back-link"><i class="pi pi-arrow-left"></i> Back to My Classes</a>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 560px; margin: 0 auto; padding: 1rem; }
    .join-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .page-title { margin: 0; font-size: 1.75rem; font-weight: 800; color: #0f172a; }
    .page-subtitle { margin: 0; color: #64748b; line-height: 1.5; }
    .join-form { display: flex; flex-direction: column; gap: 0.75rem; }
    .join-form label { font-weight: 700; font-size: 0.85rem; color: #334155; }
    .join-form input {
      width: 100%;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 0.85rem;
      font-size: 0.95rem;
    }
    .form-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .btn {
      flex: 1;
      min-width: 120px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.85rem 1rem;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
      border: none;
    }
    .btn.primary { background: #1e3a8a; color: #fff; }
    .btn.secondary { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .preview-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 1rem;
    }
    .preview-label { font-size: 0.72rem; font-weight: 800; color: #1d4ed8; text-transform: uppercase; }
    .preview-box h3 { margin: 0.35rem 0; color: #0f172a; }
    .preview-box p { margin: 0.25rem 0; color: #475569; font-size: 0.9rem; display: flex; align-items: center; gap: 0.4rem; }
    .alert { padding: 0.85rem 1rem; border-radius: 10px; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
    .alert.success { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .alert.danger { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .back-link { color: #2563eb; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem; }
  `]
})
export class StudentJoinComponent implements OnInit {
  inviteInput = '';
  previewData: JoinCoursePreview | null = null;
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private api: AdminApiService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token');
    if (token) {
      this.inviteInput = token;
      this.preview();
    }
  }

  preview() {
    if (!this.inviteInput.trim()) return;
    this.loading = true;
    this.errorMessage = '';
    this.api.getJoinPreview(this.inviteInput).subscribe({
      next: (data) => {
        this.previewData = data;
        this.loading = false;
      },
      error: (err) => {
        this.previewData = null;
        this.loading = false;
        this.errorMessage = err.error?.message || 'Invalid invite link.';
      },
    });
  }

  previewOrJoin() {
    this.join();
  }

  join() {
    if (!this.inviteInput.trim()) return;
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.api.joinCourseByInvite(this.inviteInput).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMessage = res.message;
        setTimeout(() => this.router.navigate(['/student/schedule']), 1500);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Could not join this class.';
      },
    });
  }
}
