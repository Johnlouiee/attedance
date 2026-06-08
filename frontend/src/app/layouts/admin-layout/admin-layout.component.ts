import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

interface SearchSuggestion {
  label: string;
  icon: string;
  route: string;
  keywords: string[];
}

const PAGES: SearchSuggestion[] = [
  { label: 'Dashboard', icon: 'pi-home', route: '/admin/dashboard', keywords: ['dashboard', 'overview', 'home'] },
  { label: 'Announcements', icon: 'pi-megaphone', route: '/admin/announcements', keywords: ['announcement', 'notice', 'post', 'broadcast'] },
  { label: 'Reports', icon: 'pi-file', route: '/admin/reports', keywords: ['report', 'stats', 'analytics', 'export', 'csv'] },
  { label: 'Students', icon: 'pi-users', route: '/admin/students', keywords: ['student', 'learner', 'enroll'] },
  { label: 'Teachers', icon: 'pi-user-edit', route: '/admin/teachers', keywords: ['teacher', 'instructor', 'faculty', 'professor'] },
  { label: 'Courses', icon: 'pi-book', route: '/admin/courses', keywords: ['course', 'class', 'subject', 'module'] },
  { label: 'Settings', icon: 'pi-cog', route: '/admin/settings', keywords: ['setting', 'profile', 'account', 'password', 'config'] },
];

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, FormsModule, ButtonModule, AvatarModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  user: any = null;
  private userSub!: Subscription;
  isSidebarCollapsed = false;

  // Search
  searchQuery = '';
  suggestions: SearchSuggestion[] = [];
  showSuggestions = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.userSub = this.authService.user$.subscribe(u => this.user = u);
  }

  ngOnDestroy() {
    if (this.userSub) this.userSub.unsubscribe();
  }

  onSearchInput() {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) { this.suggestions = []; this.showSuggestions = false; return; }
    this.suggestions = PAGES.filter(p =>
      p.label.toLowerCase().includes(q) ||
      p.keywords.some(k => k.includes(q))
    );
    this.showSuggestions = true;
  }

  runSearch() {
    if (!this.searchQuery.trim()) return;
    const q = this.searchQuery.toLowerCase().trim();
    const match = PAGES.find(p =>
      p.label.toLowerCase().includes(q) ||
      p.keywords.some(k => k.includes(q))
    );
    if (match) this.goTo(match.route);
    this.showSuggestions = false;
  }

  goTo(route: string) {
    this.router.navigate([route]);
    this.searchQuery = '';
    this.showSuggestions = false;
  }

  clearSearch() {
    this.searchQuery = '';
    this.suggestions = [];
    this.showSuggestions = false;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.topbar-actions')) this.showSuggestions = false;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
