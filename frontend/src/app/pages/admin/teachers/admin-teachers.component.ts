import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { AdminApiService, UserRecord } from '../../../services/admin-api.service';

@Component({
  selector: 'app-admin-teachers',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, CardModule, InputTextModule, DialogModule],
  templateUrl: './admin-teachers.component.html',
  styleUrl: './admin-teachers.component.css'
})
export class AdminTeachersComponent implements OnInit {
  teachers: UserRecord[] = [];
  filteredTeachers: UserRecord[] = [];
  searchQuery = '';
  isLoading = false;

  // Create Teacher Modal
  showCreateTeacher = false;
  newTeacher = { firstName: '', lastName: '', email: '', password: '' };
  isCreating = false;
  createSuccess = false;
  createError = '';

  constructor(private adminApi: AdminApiService) {}

  ngOnInit() {
    this.loadTeachers();
  }

  loadTeachers() {
    this.isLoading = true;
    this.adminApi.getTeachers().subscribe({
      next: (data) => {
        this.teachers = data;
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  applyFilter() {
    const q = this.searchQuery.toLowerCase();
    this.filteredTeachers = q
      ? this.teachers.filter(u => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q))
      : this.teachers;
  }

  toggleStatus(user: UserRecord) {
    this.adminApi.toggleStatus(user.id).subscribe({
      next: (r) => {
        user.status = r.status;
      }
    });
  }

  deleteUser(user: UserRecord) {
    if (!confirm(`Delete teacher ${user.firstName} ${user.lastName}? This cannot be undone.`)) return;
    this.adminApi.deleteUser(user.id).subscribe({
      next: () => {
        this.teachers = this.teachers.filter(u => u.id !== user.id);
        this.applyFilter();
      }
    });
  }

  openCreateTeacher() {
    this.newTeacher = { firstName: '', lastName: '', email: '', password: '' };
    this.createError = '';
    this.createSuccess = false;
    this.showCreateTeacher = true;
  }

  createTeacher() {
    this.createError = '';
    if (!this.newTeacher.firstName || !this.newTeacher.lastName || !this.newTeacher.email || !this.newTeacher.password) {
      this.createError = 'All fields are required.';
      return;
    }
    this.isCreating = true;
    this.adminApi.createTeacher(this.newTeacher).subscribe({
      next: () => {
        this.isCreating = false;
        this.createSuccess = true;
        this.loadTeachers();
        setTimeout(() => {
          this.showCreateTeacher = false;
        }, 1800);
      },
      error: (err) => {
        this.isCreating = false;
        this.createError = err.error?.message || 'Failed to create teacher account.';
      }
    });
  }

  getInitials(u: UserRecord): string {
    return `${u.firstName?.charAt(0) || ''}${u.lastName?.charAt(0) || ''}`.toUpperCase();
  }
}
