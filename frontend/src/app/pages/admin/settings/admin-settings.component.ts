import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, CardModule, InputTextModule],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.css'
})
export class AdminSettingsComponent implements OnInit {
  user: any = null;
  profile = { firstName: '', lastName: '', studentId: '' };
  
  isSaving = false;
  saveSuccess = false;
  saveError = '';

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.user$.subscribe({
      next: (u) => {
        this.user = u;
        if (u) {
          this.profile.firstName = u.firstName || '';
          this.profile.lastName = u.lastName || '';
          this.profile.studentId = u.studentId || '';
        }
      }
    });
  }

  saveProfile() {
    this.saveError = '';
    this.saveSuccess = false;
    this.isSaving = true;

    this.authService.updateProfile(this.profile).subscribe({
      next: () => {
        this.isSaving = false;
        this.saveSuccess = true;
        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: (err) => {
        this.isSaving = false;
        this.saveError = err.error?.message || 'Failed to update profile settings.';
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.authService.updatePhoto(base64).subscribe({
        next: () => {
          this.saveSuccess = true;
          setTimeout(() => this.saveSuccess = false, 3000);
        },
        error: (err) => {
          this.saveError = err.error?.message || 'Failed to upload profile photo.';
        }
      });
    };
    reader.readAsDataURL(file);
  }
}
