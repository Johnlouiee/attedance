import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { ChartModule } from 'primeng/chart';
import { AdminApiService, UserRecord, AdminStats } from '../../../services/admin-api.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, CardModule, DialogModule, InputTextModule, PasswordModule, TagModule, AvatarModule, ChartModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  stats: AdminStats = { totalStudents: 0, totalTeachers: 0, totalAdmins: 0, total: 0 };
  allUsers: UserRecord[] = [];
  filteredUsers: UserRecord[] = [];
  searchQuery = '';
  activeTab: 'all' | 'students' | 'teachers' = 'all';
  today = new Date();

  // Charts
  registrationData: any;
  chartOptions: any;

  // Create Teacher Modal
  showCreateTeacher = false;
  newTeacher = { firstName: '', lastName: '', teacherId: '', password: '' };
  isCreating = false;
  createSuccess = false;
  createError = '';

  constructor(private adminApi: AdminApiService) {}

  ngOnInit() {
    this.loadStats();
    this.loadUsers();
    this.initChart();
  }

  initChart() {
    const documentStyle = getComputedStyle(document.documentElement);
    this.registrationData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
      datasets: [
        {
          label: 'New Registrations',
          data: [65, 59, 80, 81, 56],
          fill: true,
          borderColor: documentStyle.getPropertyValue('--blue-500') || '#3b82f6',
          tension: 0.4,
          backgroundColor: 'rgba(59, 130, 246, 0.2)'
        }
      ]
    };
    this.chartOptions = {
      maintainAspectRatio: false,
      aspectRatio: 0.8,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: '#e2e8f0' } }
      }
    };
  }

  loadStats() {
    this.adminApi.getStats().subscribe({ next: s => this.stats = s });
  }

  loadUsers() {
    this.adminApi.getAllUsers().subscribe({ next: u => { this.allUsers = u; this.applyFilter(); } });
  }

  setTab(tab: 'all' | 'students' | 'teachers') {
    this.activeTab = tab;
    this.applyFilter();
  }

  applyFilter() {
    let base = this.allUsers;
    if (this.activeTab === 'students') base = this.allUsers.filter(u => u.role === 'STUDENT');
    if (this.activeTab === 'teachers') base = this.allUsers.filter(u => u.role === 'TEACHER');
    const q = this.searchQuery.toLowerCase();
    this.filteredUsers = q
      ? base.filter(u => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q))
      : base;
  }

  openCreateTeacher() {
    this.newTeacher = { firstName: '', lastName: '', teacherId: '', password: '' };
    this.createError = '';
    this.createSuccess = false;
    this.showCreateTeacher = true;
  }

  createTeacher() {
    this.createError = '';
    if (!this.newTeacher.firstName || !this.newTeacher.lastName || !this.newTeacher.teacherId || !this.newTeacher.password) {
      this.createError = 'First name, last name, Teacher ID, and password are required.';
      return;
    }
    this.isCreating = true;
    this.adminApi.createTeacher(this.newTeacher).subscribe({
      next: () => {
        this.isCreating = false;
        this.createSuccess = true;
        this.loadStats();
        this.loadUsers();
        setTimeout(() => { this.showCreateTeacher = false; }, 1800);
      },
      error: (err) => {
        this.isCreating = false;
        this.createError = err.error?.message || 'Failed to create teacher.';
      }
    });
  }

  toggleStatus(user: UserRecord) {
    this.adminApi.toggleStatus(user.id).subscribe({ next: (r) => { user.status = r.status; } });
  }

  deleteUser(user: UserRecord) {
    if (!confirm(`Delete ${user.firstName} ${user.lastName}? This cannot be undone.`)) return;
    this.adminApi.deleteUser(user.id).subscribe({
      next: () => { this.allUsers = this.allUsers.filter(u => u.id !== user.id); this.applyFilter(); this.loadStats(); }
    });
  }

  getInitials(u: UserRecord): string {
    return `${u.firstName?.charAt(0) || ''}${u.lastName?.charAt(0) || ''}`.toUpperCase();
  }

  getRoleColor(role: string): string {
    if (role === 'ADMIN') return 'danger';
    if (role === 'TEACHER') return 'warn';
    return 'info';
  }
}
