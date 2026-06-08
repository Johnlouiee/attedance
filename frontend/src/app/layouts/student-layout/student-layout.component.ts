import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { SidebarModule } from 'primeng/sidebar';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Announcement, AnnouncementService } from '../../services/announcement.service';

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SidebarModule, ButtonModule, MenuModule, AvatarModule, DialogModule, InputTextModule, FormsModule, CommonModule],
  templateUrl: './student-layout.component.html',
  styleUrl: './student-layout.component.css'
})
export class StudentLayoutComponent implements OnInit, OnDestroy {
  sidebarVisible: boolean = false;
  profileModalVisible: boolean = false;
  user: any = null;
  private userSub!: Subscription;

  // Edit Profile form models
  editFirstName = '';
  editLastName = '';
  editStudentId = '';
  isSaving = false;
  selectedPhotoFile: File | null = null;
  photoPreview: string | ArrayBuffer | null = null;
  isUploadingPhoto = false;

  notifications: Announcement[] = [];
  notificationsOpen = false;
  loadingNotifications = false;
  unreadCount = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
    private announcementService: AnnouncementService,
  ) {}

  ngOnInit() {
    this.userSub = this.authService.user$.subscribe(user => {
      this.user = user;
    });
    this.loadNotifications();
  }

  loadNotifications() {
    this.loadingNotifications = true;
    this.announcementService.getMyAnnouncements().subscribe({
      next: (items: Announcement[]) => {
        this.notifications = items.slice(0, 12);
        this.unreadCount = items.length;
        this.loadingNotifications = false;
      },
      error: () => {
        this.notifications = [];
        this.unreadCount = 0;
        this.loadingNotifications = false;
      },
    });
  }

  toggleNotifications(event: Event) {
    event.stopPropagation();
    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) {
      this.loadNotifications();
    }
  }

  @HostListener('document:click', ['$event'])
  closeNotifications(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-wrap')) {
      this.notificationsOpen = false;
    }
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
    
    // If a photo was selected, upload it first
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
          this.updateTextProfile(); // Proceed to text update anyway
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
        console.error('Failed to update profile', err);
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
