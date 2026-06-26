import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, ButtonModule, CardModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit {
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
}
