import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, NgIf, ButtonModule, InputTextModule, CheckboxModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  rememberMe = false;
  isLoading = false;
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    const user = this.authService.getUser();
    if (user && this.authService.isLoggedIn()) {
      if (user.role === 'ADMIN') {
        this.router.navigate(['/admin/dashboard']);
      } else if (user.role === 'TEACHER') {
        this.router.navigate(['/teacher/dashboard']);
      } else {
        this.router.navigate(['/student/schedule']);
      }
    }
  }

  login() {
    this.errorMessage = '';
    if (!this.email || !this.password) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }
    this.isLoading = true;
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (res) => {
        this.authService.saveSession(res);
        this.isLoading = false;
        // Redirect based on role
        const role = res.user.role;
        if (role === 'ADMIN') this.router.navigate(['/admin/dashboard']);
        else if (role === 'TEACHER') this.router.navigate(['/teacher/dashboard']);
        else this.router.navigate(['/student/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message ?? 'Invalid email or password.';
      }
    });
  }
}
