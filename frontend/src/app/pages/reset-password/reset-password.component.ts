import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../services/auth.service';

type PageState = 'form' | 'success' | 'error' | 'invalid';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, InputTextModule, PasswordModule],
  template: `
    <div class="split-wrapper">

      <!-- LEFT branding panel (reuses forgot-password style) -->
      <div class="left-panel">
        <div class="left-content">
          <div class="deco-circle deco-1"></div>
          <div class="deco-circle deco-2"></div>

          <a routerLink="/login" class="back-link">
            <i class="pi pi-arrow-left"></i> Back to Login
          </a>

          <div class="brand-block">
            <div class="brand-logo">
              <i class="pi pi-shield brand-icon"></i>
              <span class="brand-text">Atten<span class="brand-hl">Guard</span></span>
            </div>
            <h2 class="left-title">Set New Password</h2>
            <p class="left-desc">
              Choose a strong new password. It must be at least 6 characters long. 
              Once reset, you can log in right away.
            </p>
          </div>

          <div class="illust-row">
            <div class="illust-card" style="width: 120px;">
              <i class="pi pi-lock" style="color: #60a5fa; font-size: 2rem; text-align: center;"></i>
              <div class="illust-bar bar-long"></div>
              <div class="illust-bar bar-short"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: form / states -->
      <div class="right-panel">
        <div class="right-content">

          <!-- INVALID TOKEN (no token in URL) -->
          <ng-container *ngIf="state === 'invalid'">
            <div class="state-icon error-icon">
              <i class="pi pi-times-circle"></i>
            </div>
            <h2 class="form-title">Invalid Link</h2>
            <p class="form-subtitle">This password reset link is missing its token. Please request a new one.</p>
            <div class="form-actions" style="margin-top: 2rem;">
              <p-button label="Request Reset" routerLink="/forgot-password" [raised]="true" [rounded]="true" styleClass="submit-btn" />
            </div>
          </ng-container>

          <!-- RESET FORM -->
          <ng-container *ngIf="state === 'form'">
            <div class="avatar-ring">
              <i class="pi pi-key avatar-icon"></i>
            </div>
            <h2 class="form-title">RESET PASSWORD</h2>
            <p class="form-subtitle">Enter and confirm your new password below.</p>

            <form class="reset-form" (ngSubmit)="submit()">
              <div class="form-group">
                <label class="form-label">New Password</label>
                <span class="p-input-icon-left input-wrapper">
                  <i class="pi pi-lock"></i>
                  <input
                    pInputText
                    type="password"
                    placeholder="At least 6 characters"
                    [(ngModel)]="newPassword"
                    name="newPassword"
                    class="input-field"
                    required
                  />
                </span>
              </div>

              <div class="form-group">
                <label class="form-label">Confirm New Password</label>
                <span class="p-input-icon-left input-wrapper">
                  <i class="pi pi-lock"></i>
                  <input
                    pInputText
                    type="password"
                    placeholder="Re-enter password"
                    [(ngModel)]="confirmPassword"
                    name="confirmPassword"
                    class="input-field"
                    required
                  />
                </span>
              </div>

              <div class="error-banner" *ngIf="errorMessage">
                <i class="pi pi-exclamation-triangle"></i> {{ errorMessage }}
              </div>

              <div class="form-actions">
                <p-button
                  type="submit"
                  label="RESET PASSWORD"
                  icon="pi pi-check-circle"
                  [raised]="true"
                  [rounded]="true"
                  [loading]="isLoading"
                  styleClass="submit-btn"
                />
              </div>
            </form>
          </ng-container>

          <!-- SUCCESS -->
          <ng-container *ngIf="state === 'success'">
            <div class="success-icon-box">
              <i class="pi pi-check-circle"></i>
            </div>
            <h2 class="form-title">Password Reset!</h2>
            <p class="success-subtitle">
              Your password has been updated successfully. You can now log in with your new password.
            </p>
            <div class="form-actions" style="margin-top: 2rem;">
              <p-button label="Go to Login" routerLink="/login" [raised]="true" [rounded]="true" styleClass="submit-btn" />
            </div>
          </ng-container>

          <!-- ERROR (expired/invalid token from server) -->
          <ng-container *ngIf="state === 'error'">
            <div class="state-icon error-icon">
              <i class="pi pi-times-circle"></i>
            </div>
            <h2 class="form-title">Link Expired</h2>
            <p class="form-subtitle">{{ errorMessage || 'This password reset link is invalid or has expired. Please request a new one.' }}</p>
            <div class="form-actions" style="margin-top: 2rem;">
              <p-button label="Request New Link" routerLink="/forgot-password" [raised]="true" [rounded]="true" styleClass="submit-btn" />
            </div>
          </ng-container>

        </div>
      </div>
    </div>
  `,
  styleUrl: '../forgot-password/forgot-password.component.css',
  styles: [`
    .reset-form { text-align: left; }
    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 0.85rem;
      margin-bottom: 12px;
    }
    .state-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    .error-icon { background: #fef2f2; border: 3px solid #ef4444; }
    .error-icon i { font-size: 2.5rem; color: #dc2626; }
    ::ng-deep .submit-btn {
      width: 100% !important;
      justify-content: center !important;
      background: linear-gradient(135deg, #1e3a8a, #3b82f6) !important;
      border: none !important;
      padding: 0.85rem 1.5rem !important;
      font-weight: 700 !important;
      font-size: 0.95rem !important;
      letter-spacing: 0.08em !important;
      box-shadow: 0 6px 20px -4px rgba(30, 58, 138, 0.3) !important;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
    }
    ::ng-deep .submit-btn:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 10px 25px -4px rgba(30, 58, 138, 0.4) !important;
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  state: PageState = 'form';
  newPassword = '';
  confirmPassword = '';
  isLoading = false;
  errorMessage = '';
  private token = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    const t = this.route.snapshot.queryParamMap.get('token');
    if (!t) {
      this.state = 'invalid';
    } else {
      this.token = t;
    }
  }

  submit() {
    this.errorMessage = '';

    if (!this.newPassword || this.newPassword.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isLoading = true;
    this.authService.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.state = 'success';
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'This reset link is invalid or has expired.';
        this.state = 'error';
      }
    });
  }
}
