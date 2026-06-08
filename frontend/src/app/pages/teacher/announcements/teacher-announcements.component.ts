import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { AnnouncementService, Announcement, AnnouncementTarget } from '../../../services/announcement.service';
import { AdminApiService, UserRecord } from '../../../services/admin-api.service';

interface CourseOption { code: string; name: string; }

@Component({
  selector: 'app-teacher-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, TextareaModule],
  templateUrl: './teacher-announcements.component.html',
  styleUrl: './teacher-announcements.component.css'
})
export class TeacherAnnouncementsComponent implements OnInit {
  // Teacher's own posted announcements (fetched from /me)
  received: Announcement[] = [];
  isLoading = false;

  // Compose panel (inline, not modal)
  showCompose = false;
  newAnn = { title: '', message: '', courseCode: '' };
  isPosting = false;
  postError = '';
  postSuccess = false;

  myCourses: CourseOption[] = [];

  constructor(private annService: AnnouncementService, private adminApi: AdminApiService) {}

  ngOnInit() {
    this.load();
    this.loadCourses();
  }

  loadCourses() {
    this.adminApi.getCourses().subscribe({
      next: (data) => {
        this.myCourses = data.map(c => ({ code: c.code, name: c.name }));
      }
    });
  }

  load() {
    this.isLoading = true;
    this.annService.getMyAnnouncements().subscribe({
      next: (data) => { this.received = data; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  toggleCompose() {
    this.showCompose = !this.showCompose;
    this.newAnn = { title: '', message: '', courseCode: '' };
    this.postError = '';
    this.postSuccess = false;
  }

  post() {
    this.postError = '';
    if (!this.newAnn.title.trim() || !this.newAnn.message.trim()) {
      this.postError = 'Title and message are required.'; return;
    }
    if (!this.newAnn.courseCode) {
      this.postError = 'Please select a target course.'; return;
    }
    this.isPosting = true;
    this.annService.createAnnouncement({
      title: this.newAnn.title,
      message: this.newAnn.message,
      targetAudience: 'COURSE' as AnnouncementTarget,
      courseCode: this.newAnn.courseCode,
    }).subscribe({
      next: () => {
        this.isPosting = false;
        this.postSuccess = true;
        this.newAnn = { title: '', message: '', courseCode: '' };
        setTimeout(() => { this.postSuccess = false; this.showCompose = false; this.load(); }, 1500);
      },
      error: (err) => {
        this.isPosting = false;
        this.postError = err.error?.message || 'Failed to post announcement.';
      }
    });
  }

  delete(ann: Announcement) {
    if (!confirm(`Delete "${ann.title}"?`)) return;
    this.annService.deleteAnnouncement(ann.id).subscribe({ next: () => this.load() });
  }

  targetLabel(a: Announcement): string {
    if (a.targetAudience === 'COURSE') return `Course: ${a.courseCode}`;
    const map: any = { ALL: 'All Users', TEACHERS: 'Teachers', STUDENTS: 'Students' };
    return map[a.targetAudience] || a.targetAudience;
  }
}
