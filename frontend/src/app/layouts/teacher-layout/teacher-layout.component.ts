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
  isSaving = false;
  selectedPhotoFile: File | null = null;
  photoPreview: string | ArrayBuffer | null = null;
  isUploadingPhoto = false;

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
    this.selectedPhotoFile = null;
    this.photoPreview = this.user?.profilePhoto || null;
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
    this.authService.updateProfile({
      firstName: this.editFirstName,
      lastName: this.editLastName,
      studentId: this.editStudentId
    }).subscribe({
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
