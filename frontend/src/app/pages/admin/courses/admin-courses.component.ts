import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { AdminApiService, UserRecord, CourseRecord } from '../../../services/admin-api.service';

@Component({
  selector: 'app-admin-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, CardModule, InputTextModule, DialogModule],
  templateUrl: './admin-courses.component.html',
  styleUrl: './admin-courses.component.css'
})
export class AdminCoursesComponent implements OnInit {
  courses: CourseRecord[] = [];
  filteredCourses: CourseRecord[] = [];
  teachers: UserRecord[] = [];
  searchQuery = '';
  isLoading = false;

  // Create Course Modal
  showCreateCourse = false;
  newCourse = { code: '', name: '', credits: 3, teacherId: '', classStartTime: '', classEndTime: '' };
  createError = '';

  constructor(private adminApi: AdminApiService) {}

  ngOnInit() {
    this.loadTeachers();
    this.loadCourses();
  }

  loadTeachers() {
    this.adminApi.getTeachers().subscribe({
      next: (data) => {
        this.teachers = data;
      }
    });
  }

  loadCourses() {
    this.isLoading = true;
    this.adminApi.getCourses().subscribe({
      next: (data) => {
        this.courses = data;
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
    this.filteredCourses = q
      ? this.courses.filter(c => `${c.code} ${c.name} ${c.assignedTeacher}`.toLowerCase().includes(q))
      : this.courses;
  }

  openCreateCourse() {
    this.newCourse = { code: '', name: '', credits: 3, teacherId: '', classStartTime: '', classEndTime: '' };
    this.createError = '';
    this.showCreateCourse = true;
  }

  createCourse() {
    this.createError = '';
    if (!this.newCourse.code || !this.newCourse.name) {
      this.createError = 'Course code and name are required.';
      return;
    }

    this.adminApi.createCourse({
      code: this.newCourse.code.toUpperCase().trim(),
      name: this.newCourse.name,
      credits: this.newCourse.credits,
      teacherId: this.newCourse.teacherId ? Number(this.newCourse.teacherId) : undefined,
      ...(this.newCourse.classStartTime && this.newCourse.classEndTime
        ? {
            classStartTime: this.newCourse.classStartTime,
            classEndTime: this.newCourse.classEndTime,
          }
        : {}),
    }).subscribe({
      next: () => {
        this.loadCourses();
        this.showCreateCourse = false;
      },
      error: (err) => {
        this.createError = err.error?.message || 'Failed to create course.';
      }
    });
  }

  deleteCourse(course: CourseRecord) {
    if (!confirm(`Delete course ${course.code} - ${course.name}?`)) return;
    this.adminApi.deleteCourse(course.id).subscribe({
      next: () => {
        this.loadCourses();
      }
    });
  }
}
