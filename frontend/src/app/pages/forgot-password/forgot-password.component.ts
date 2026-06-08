import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink, FormsModule, NgIf, ButtonModule, InputTextModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  email = '';
  isSubmitted = false;
  isLoading = false;
  errorMessage = '';

  constructor(private authService: AuthService) {}

  submitRequest() {
    this.errorMessage = '';
    if (!this.email) {
      this.errorMessage = 'Please enter your email address.';
      return;
    }
    this.isLoading = true;
    this.authService.forgotPassword(this.email).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSubmitted = true;
      },
      error: () => {
        // Always show success to prevent email enumeration
        this.isLoading = false;
        this.isSubmitted = true;
      }
    });
  }
}
