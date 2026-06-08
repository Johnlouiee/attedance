import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { AdminApiService, UserRecord } from '../../../services/admin-api.service';

@Component({
  selector: 'app-admin-students',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, CardModule, InputTextModule],
  templateUrl: './admin-students.component.html',
  styleUrl: './admin-students.component.css'
})
export class AdminStudentsComponent implements OnInit {
  students: UserRecord[] = [];
  filteredStudents: UserRecord[] = [];
  searchQuery = '';
  isLoading = false;

  constructor(private adminApi: AdminApiService) {}

  ngOnInit() {
    this.loadStudents();
  }

  loadStudents() {
    this.isLoading = true;
    this.adminApi.getStudents().subscribe({
      next: (data) => {
        this.students = data;
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
    this.filteredStudents = q
      ? this.students.filter(u => `${u.firstName} ${u.lastName} ${u.email} ${u.studentId || ''}`.toLowerCase().includes(q))
      : this.students;
  }

  toggleStatus(user: UserRecord) {
    this.adminApi.toggleStatus(user.id).subscribe({
      next: (r) => {
        user.status = r.status;
      }
    });
  }

  deleteUser(user: UserRecord) {
    if (!confirm(`Delete student ${user.firstName} ${user.lastName}? This cannot be undone.`)) return;
    this.adminApi.deleteUser(user.id).subscribe({
      next: () => {
        this.students = this.students.filter(u => u.id !== user.id);
        this.applyFilter();
      }
    });
  }

  getInitials(u: UserRecord): string {
    return `${u.firstName?.charAt(0) || ''}${u.lastName?.charAt(0) || ''}`.toUpperCase();
  }
}
