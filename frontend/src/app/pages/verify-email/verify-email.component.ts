import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type VerifyState = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="verify-wrapper">
      <div class="verify-card" [class.success]="state === 'success'" [class.error]="state === 'error'">
        <!-- Loading State -->
        <div *ngIf="state === 'loading'" class="state-panel">
          <div class="spinner-ring"></div>
          <h2>Verifying your email…</h2>
          <p>Please wait while we activate your account.</p>
        </div>

        <!-- Success State -->
        <div *ngIf="state === 'success'" class="state-panel">
          <div class="icon-circle success-icon">
            <i class="pi pi-check"></i>
          </div>
          <h2>Email Verified!</h2>
          <p *ngIf="isLoggedIn">Your email is verified. Redirecting you to your dashboard...</p>
          <p *ngIf="!isLoggedIn">Your account is now <strong>active</strong>. You can now log in and receive class notifications.</p>
          <a [routerLink]="dashboardUrl" class="action-btn success-btn">
            <i class="pi" [ngClass]="isLoggedIn ? 'pi-home' : 'pi-sign-in'"></i>
            {{ isLoggedIn ? 'Go to Dashboard' : 'Go to Login' }}
          </a>
        </div>

        <!-- Error State -->
        <div *ngIf="state === 'error'" class="state-panel">
          <div class="icon-circle error-icon">
            <i class="pi pi-times"></i>
          </div>
          <h2>Verification Failed</h2>
          <p>{{ errorMessage }}</p>
          <a routerLink="/login" class="action-btn error-btn">
            <i class="pi pi-arrow-left"></i>
            Back to Login
          </a>
        </div>

        <!-- Branding Footer -->
        <div class="brand-footer">
          <i class="pi pi-th-large"></i>
          <span>Atten<span class="hl">gard</span></span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    .verify-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
      font-family: 'Inter', sans-serif;
      padding: 20px;
    }

    .verify-card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 48px 40px;
      width: 100%;
      max-width: 420px;
      text-align: center;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
      transition: border-color 0.4s;
    }

    .verify-card.success { border-color: rgba(34, 197, 94, 0.4); }
    .verify-card.error { border-color: rgba(239, 68, 68, 0.4); }

    .state-panel { display: flex; flex-direction: column; align-items: center; gap: 16px; }

    /* Spinner */
    .spinner-ring {
      width: 64px;
      height: 64px;
      border: 4px solid rgba(255,255,255,0.1);
      border-top-color: #818cf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Icon circles */
    .icon-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes popIn {
      from { transform: scale(0); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .success-icon { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 2px solid rgba(34,197,94,0.4); }
    .error-icon { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 2px solid rgba(239,68,68,0.4); }

    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0;
    }

    p {
      color: #94a3b8;
      font-size: 0.9rem;
      margin: 0;
      line-height: 1.5;
    }
    p strong { color: #e2e8f0; }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 28px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.9rem;
      text-decoration: none;
      transition: opacity 0.2s, transform 0.2s;
      margin-top: 8px;
    }
    .action-btn:hover { opacity: 0.88; transform: translateY(-1px); }
    .success-btn { background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; }
    .error-btn { background: rgba(255,255,255,0.1); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.2); }

    .brand-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 36px;
      color: rgba(255,255,255,0.3);
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .brand-footer .hl { color: #818cf8; }
  `]
})
export class VerifyEmailComponent implements OnInit {
  state: VerifyState = 'loading';
  errorMessage = 'The verification link is invalid or has expired. Please request a new one from your profile.';
  isLoggedIn = false;
  dashboardUrl = '/login';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state = 'error';
      this.errorMessage = 'No verification token provided. Please check your email link.';
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.state = 'success';
        
        // Update local user state if logged in
        const user = this.authService.getUser();
        if (user) {
          this.isLoggedIn = true;
          this.authService.updateStoredUserVerifiedState(true);

          const role = user.role?.toLowerCase();
          if (role === 'teacher') {
            this.dashboardUrl = '/teacher/dashboard';
          } else if (role === 'admin') {
            this.dashboardUrl = '/admin/dashboard';
          } else if (role === 'student') {
            this.dashboardUrl = '/student/dashboard';
          }

          // Auto redirect to dashboard after 2.5 seconds
          setTimeout(() => {
            this.router.navigate([this.dashboardUrl]);
          }, 2500);
        }
      },
      error: (err) => {
        this.state = 'error';
        this.errorMessage = err?.error?.message || 'The verification link is invalid or has expired. Please request a new one from your profile.';
      }
    });
  }
}
