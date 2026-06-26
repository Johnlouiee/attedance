import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService, LoginResponse } from '../../services/auth.service';
import { SidebarModule } from 'primeng/sidebar';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-teacher-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive, 
    SidebarModule, 
    AvatarModule, 
    ButtonModule,
    DialogModule,
    InputTextModule,
    FormsModule
  ],
  template: `
    <div class="layout-wrapper">
      <!-- TOPBAR -->
      <header class="topbar">
        <div class="topbar-left">
          <p-button icon="pi pi-bars" [text]="true" (onClick)="sidebarVisible = true" styleClass="burger-btn"></p-button>
          <div class="brand-logo hidden-mobile">
            <i class="pi pi-th-large brand-icon"></i>
            <span class="brand-text">Atten<span class="brand-hl">gard</span></span>
          </div>
        </div>
        
        <div class="topbar-right">
          <div class="user-profile" (click)="openProfileModal()" style="cursor: pointer;" title="Edit Profile">
            <span class="user-greeting hidden-mobile">Prof. {{ user?.lastName || 'Teacher' }}</span>
            <div class="topbar-avatar">
              <img *ngIf="user?.profilePhoto" [src]="user?.profilePhoto" alt="Profile" />
              <p-avatar *ngIf="!user?.profilePhoto" icon="pi pi-user" shape="circle" styleClass="profile-avatar"></p-avatar>
            </div>
          </div>
        </div>
      </header>

      <!-- ACTIVATION WARNING BANNER -->
      <div class="activation-banner" *ngIf="user && !user.isEmailVerified">
        <i class="pi pi-exclamation-triangle"></i>
        <span>
          <strong>Account not fully activated.</strong>
          Please add your email and verify it to activate your account and receive class notifications.
        </span>
        <button class="banner-action-btn" (click)="openProfileModal()">
          <i class="pi pi-user-edit"></i> Update Profile
        </button>
      </div>

      <!-- SIDEBAR -->
      <p-sidebar [(visible)]="sidebarVisible" [showCloseIcon]="true" styleClass="sidebar custom-sidebar">
        <ng-template pTemplate="header">
          <div class="sidebar-header">
            <i class="pi pi-th-large brand-icon"></i>
            <span class="brand-text">Atten<span class="brand-hl">gard</span></span>
          </div>
        </ng-template>

        <div class="sidebar-content">
          <div class="user-info-card">
            <div class="topbar-avatar" style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid #3b82f6;">
              <img *ngIf="user?.profilePhoto" [src]="user?.profilePhoto" alt="Profile" />
              <p-avatar *ngIf="!user?.profilePhoto" icon="pi pi-user" shape="circle" size="large" styleClass="sidebar-avatar"></p-avatar>
            </div>
            <div class="info">
              <h4>{{ user?.firstName }} {{ user?.lastName }}</h4>
              <p>Teacher ID: {{ user?.studentId || 'N/A' }}</p>
              <span class="status-badge" [class.verified]="user?.isEmailVerified" [class.unverified]="!user?.isEmailVerified">
                <i class="pi" [class.pi-check-circle]="user?.isEmailVerified" [class.pi-times-circle]="!user?.isEmailVerified"></i>
                {{ user?.isEmailVerified ? 'Verified' : 'Not Verified' }}
              </span>
            </div>
          </div>

          <nav class="nav-menu">
            <a routerLink="/teacher/dashboard" routerLinkActive="active" (click)="sidebarVisible = false" class="nav-item">
              <i class="pi pi-home"></i>
              <span>Dashboard</span>
            </a>
            <a routerLink="/teacher/courses" routerLinkActive="active" (click)="sidebarVisible = false" class="nav-item">
              <i class="pi pi-book"></i>
              <span>My Courses</span>
            </a>
            <a routerLink="/teacher/modules" routerLinkActive="active" (click)="sidebarVisible = false" class="nav-item">
              <i class="pi pi-folder-open"></i>
              <span>Course Modules</span>
            </a>
            <a routerLink="/teacher/attendance" routerLinkActive="active" (click)="sidebarVisible = false" class="nav-item">
              <i class="pi pi-check-square"></i>
              <span>Track Attendance</span>
            </a>
            <a routerLink="/teacher/announcements" routerLinkActive="active" (click)="sidebarVisible = false" class="nav-item">
              <i class="pi pi-megaphone"></i>
              <span>Announcements</span>
            </a>
          </nav>

          <div class="sidebar-footer">
            <button class="logout-btn" (click)="logout()">
              <i class="pi pi-sign-out"></i>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </p-sidebar>

      <!-- MAIN CONTENT AREA -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>

      <!-- EDIT PROFILE MODAL (Split Screen) -->
      <p-dialog 
        header="Edit Profile" 
        [(visible)]="profileModalVisible" 
        [modal]="true" 
        [style]="{ width: '700px', 'max-width': '95vw', padding: '0' }" 
        [draggable]="false" 
        [resizable]="false"
        [showHeader]="false"
        styleClass="split-modal-dialog">
        
        <div class="modal-split-container">
          <!-- Left Panel: Branding / Photo Upload -->
          <div class="modal-left-panel">
            <div class="modal-brand">
              <i class="pi pi-user-edit"></i>
              <h3>Your Profile</h3>
            </div>
            
            <div class="photo-upload-container">
              <div class="photo-preview" (click)="fileInput.click()">
                <img *ngIf="photoPreview" [src]="photoPreview" alt="Preview" />
                <div *ngIf="!photoPreview" class="photo-placeholder">
                  <i class="pi pi-camera"></i>
                  <span>Upload Photo</span>
                </div>
                
                <div class="photo-overlay">
                  <i class="pi pi-pencil"></i>
                </div>
              </div>
              <input type="file" #fileInput accept="image/*" style="display: none" (change)="onFileSelected($event)">
              <p class="photo-hint">Click the image to change</p>
            </div>

            <!-- Verification Status Panel -->
            <div class="verification-panel" *ngIf="!user?.isEmailVerified">
              <div class="verification-status unverified">
                <i class="pi pi-shield"></i>
                <span>Account Inactive</span>
              </div>
              <p class="verification-hint">Add your email below and click "Send Verification" to activate your account.</p>
            </div>
            <div class="verification-panel" *ngIf="user?.isEmailVerified">
              <div class="verification-status verified">
                <i class="pi pi-verified"></i>
                <span>Account Active</span>
              </div>
              <p class="verification-hint">Your email is verified. You will receive class notifications.</p>
            </div>
          </div>

          <!-- Right Panel: Form Fields -->
          <div class="modal-right-panel">
            <div class="panel-header">
              <h2>Update Details</h2>
              <button class="close-btn" (click)="profileModalVisible = false"><i class="pi pi-times"></i></button>
            </div>

            <div class="form-fields">
              <div class="form-group">
                <label>First Name</label>
                <div class="input-wrapper">
                  <i class="pi pi-user"></i>
                  <input type="text" pInputText [(ngModel)]="editFirstName" placeholder="Enter first name" />
                </div>
              </div>

              <div class="form-group">
                <label>Last Name</label>
                <div class="input-wrapper">
                  <i class="pi pi-user"></i>
                  <input type="text" pInputText [(ngModel)]="editLastName" placeholder="Enter last name" />
                </div>
              </div>

              <div class="form-group">
                <label>Teacher ID / Employee Code <span style="color:#94a3b8;font-size:0.75rem;font-weight:400;">(Assigned by Admin · Read only)</span></label>
                <div class="input-wrapper">
                  <i class="pi pi-id-card"></i>
                  <input type="text" pInputText [value]="editStudentId" readonly style="opacity:0.6;cursor:not-allowed;background:#f8fafc;" />
                </div>
              </div>

              <div class="form-group">
                <label>
                  Email Address
                  <span *ngIf="!user?.isEmailVerified" style="color:#f59e0b;font-size:0.75rem;font-weight:500;margin-left:6px;">
                    <i class="pi pi-exclamation-circle"></i> Required for activation
                  </span>
                  <span *ngIf="user?.isEmailVerified" style="color:#22c55e;font-size:0.75rem;font-weight:500;margin-left:6px;">
                    <i class="pi pi-check-circle"></i> Verified
                  </span>
                </label>
                <div class="input-wrapper">
                  <i class="pi pi-envelope"></i>
                  <input type="email" pInputText [(ngModel)]="editEmail" placeholder="Enter your email address" />
                </div>
              </div>

              <div class="form-group">
                <label>Contact Number <span style="color:#94a3b8;font-size:0.75rem;font-weight:400;">(Optional)</span></label>
                <div class="input-wrapper">
                  <i class="pi pi-phone"></i>
                  <input type="tel" pInputText [(ngModel)]="editContactNumber" placeholder="e.g. +63 912 345 6789" />
                </div>
              </div>

              <div class="form-group">
                <label>New Password <span style="color:#94a3b8;font-size:0.75rem;font-weight:400;">(Leave blank to keep current)</span></label>
                <div class="input-wrapper">
                  <i class="pi pi-lock"></i>
                  <input type="password" pInputText [(ngModel)]="editPassword" placeholder="Enter new password" />
                </div>
              </div>

              <!-- Send Verification Email (only if email not yet verified) -->
              <div class="verification-action" *ngIf="!user?.isEmailVerified">
                <button 
                  class="verify-email-btn" 
                  [disabled]="!editEmail || isSendingVerification"
                  (click)="sendVerificationEmail()">
                  <span *ngIf="!isSendingVerification"><i class="pi pi-send"></i> Send Verification Email</span>
                  <span *ngIf="isSendingVerification"><i class="pi pi-spin pi-spinner"></i> Sending...</span>
                </button>
                <p class="verify-hint" *ngIf="verificationSent">
                  <i class="pi pi-check-circle" style="color:#22c55e;"></i>
                  Verification email sent! Check your inbox.
                </p>
              </div>
            </div>

            <div class="panel-footer">
              <p-button label="Cancel" [text]="true" severity="secondary" (onClick)="profileModalVisible = false"></p-button>
              <p-button 
                label="Save Changes" 
                icon="pi pi-check" 
                [loading]="isSaving || isUploadingPhoto" 
                (onClick)="saveProfile()"
                styleClass="save-btn">
              </p-button>
            </div>
          </div>
        </div>
      </p-dialog>

    </div>
  `,
  styles: [`
    .activation-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      color: #fff;
      padding: 12px 24px;
      font-size: 0.875rem;
      flex-wrap: wrap;
    }
    .activation-banner i { font-size: 1.1rem; flex-shrink: 0; color: #fbbf24; }
    .activation-banner span { flex: 1; min-width: 200px; }
    .banner-action-btn {
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.4);
      color: #fff;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      transition: background 0.2s;
    }
    .banner-action-btn:hover { background: rgba(255,255,255,0.3); }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.7rem;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;
      margin-top: 4px;
    }
    .status-badge.verified { background: #dcfce7; color: #166534; }
    .status-badge.unverified { background: #fef9c3; color: #854d0e; }
    .verification-panel {
      margin-top: 24px;
      padding: 14px;
      border-radius: 10px;
      background: rgba(255,255,255,0.08);
      text-align: center;
    }
    .verification-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 6px 14px;
      border-radius: 20px;
    }
    .verification-status.unverified { background: rgba(251,191,36,0.2); color: #fbbf24; }
    .verification-status.verified { background: rgba(34,197,94,0.2); color: #4ade80; }
    .verification-hint { color: rgba(255,255,255,0.6); font-size: 0.75rem; margin: 8px 0 0; line-height: 1.4; }
    .verification-action { margin-top: 8px; }
    .verify-email-btn {
      width: 100%;
      padding: 10px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: opacity 0.2s;
    }
    .verify-email-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .verify-email-btn:not(:disabled):hover { opacity: 0.9; }
    .verify-hint { font-size: 0.75rem; color: #64748b; margin-top: 6px; display: flex; align-items: center; gap: 6px; }
  `],
  styleUrl: '../student-layout/student-layout.component.css'
})
export class TeacherLayoutComponent implements OnInit, OnDestroy {
  sidebarVisible = false;
  profileModalVisible = false;
  user: LoginResponse['user'] | null = null;
  private userSub!: Subscription;

  // Form Fields
  editFirstName = '';
  editLastName = '';
  editStudentId = '';
  editEmail = '';
  editContactNumber = '';
  editPassword = '';
  isSaving = false;
  selectedPhotoFile: File | null = null;
  photoPreview: string | ArrayBuffer | null = null;
  isUploadingPhoto = false;

  // Verification
  isSendingVerification = false;
  verificationSent = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.userSub = this.authService.user$.subscribe(u => {
      this.user = u;
    });
  }

  ngOnDestroy() {
    if (this.userSub) this.userSub.unsubscribe();
  }

  openProfileModal() {
    this.editFirstName = this.user?.firstName || '';
    this.editLastName = this.user?.lastName || '';
    this.editStudentId = this.user?.studentId || '';
    this.editEmail = this.user?.email || '';
    this.editContactNumber = this.user?.contactNumber || '';
    this.editPassword = '';
    this.selectedPhotoFile = null;
    this.photoPreview = this.user?.profilePhoto || null;
    this.verificationSent = false;
    this.profileModalVisible = true;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedPhotoFile = file;
      const reader = new FileReader();
      reader.onload = e => this.photoPreview = reader.result;
      reader.readAsDataURL(file);
    }
  }

  sendVerificationEmail() {
    if (!this.editEmail) return;

    this.isSendingVerification = true;
    // First save the email if it changed
    const payload: any = { email: this.editEmail };
    this.authService.updateProfile(payload).subscribe({
      next: () => {
        this.authService.sendVerification().subscribe({
          next: () => {
            this.isSendingVerification = false;
            this.verificationSent = true;
          },
          error: (err) => {
            this.isSendingVerification = false;
            console.error('Failed to send verification', err);
            alert('Failed to send verification email. Please try again.');
          }
        });
      },
      error: (err) => {
        this.isSendingVerification = false;
        console.error('Failed to save email', err);
        alert('Failed to save email. Please try again.');
      }
    });
  }

  saveProfile() {
    this.isSaving = true;
    
    // If photo selected, upload it first
    if (this.selectedPhotoFile && this.photoPreview && typeof this.photoPreview === 'string') {
      this.isUploadingPhoto = true;
      this.authService.updatePhoto(this.photoPreview).subscribe({
        next: () => {
          this.isUploadingPhoto = false;
          this.updateTextProfile();
        },
        error: (err) => {
          this.isUploadingPhoto = false;
          console.error('Failed to upload photo', err);
          this.updateTextProfile(); // Proceed to update text details regardless
        }
      });
    } else {
      this.updateTextProfile();
    }
  }

  private updateTextProfile() {
    const payload: any = {
      firstName: this.editFirstName,
      lastName: this.editLastName,
      email: this.editEmail || undefined,
      contactNumber: this.editContactNumber || undefined,
    };
    if (this.editPassword) {
      payload.password = this.editPassword;
    }
    this.authService.updateProfile(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.profileModalVisible = false;
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Failed to update details', err);
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
