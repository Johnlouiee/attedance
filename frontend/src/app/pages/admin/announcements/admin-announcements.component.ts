import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { AnnouncementService, Announcement, AnnouncementTarget } from '../../../services/announcement.service';

@Component({
  selector: 'app-admin-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, TextareaModule],
  templateUrl: './admin-announcements.component.html',
  styleUrl: './admin-announcements.component.css'
})
export class AdminAnnouncementsComponent implements OnInit {
  announcements: Announcement[] = [];
  filteredAnnouncements: Announcement[] = [];
  searchQuery = '';
  isLoading = false;

  // Create modal
  showCreate = false;
  newAnn = { title: '', message: '', targetAudience: 'ALL' as AnnouncementTarget, courseCode: '' };
  isPosting = false;
  postError = '';

  targetOptions: { label: string; value: AnnouncementTarget }[] = [
    { label: '🌐 All (Students + Teachers)', value: 'ALL' },
    { label: '👨‍🏫 Teachers Only', value: 'TEACHERS' },
    { label: '🎓 Students Only', value: 'STUDENTS' },
  ];

  constructor(private annService: AnnouncementService) {}

  ngOnInit() { this.load(); }

  load() {
    this.isLoading = true;
    this.annService.getAllAnnouncements().subscribe({
      next: (data) => { this.announcements = data; this.applyFilter(); this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  applyFilter() {
    const q = this.searchQuery.toLowerCase();
    this.filteredAnnouncements = q
      ? this.announcements.filter(a => `${a.title} ${a.message} ${a.authorName}`.toLowerCase().includes(q))
      : [...this.announcements];
  }

  openCreate() {
    this.newAnn = { title: '', message: '', targetAudience: 'ALL', courseCode: '' };
    this.postError = '';
    this.showCreate = true;
  }

  post() {
    this.postError = '';
    if (!this.newAnn.title.trim() || !this.newAnn.message.trim()) {
      this.postError = 'Title and message are required.'; return;
    }
    this.isPosting = true;
    const dto: any = { title: this.newAnn.title, message: this.newAnn.message, targetAudience: this.newAnn.targetAudience };
    if (this.newAnn.targetAudience === 'COURSE' && this.newAnn.courseCode) dto.courseCode = this.newAnn.courseCode;
    this.annService.createAnnouncement(dto).subscribe({
      next: () => { this.isPosting = false; this.showCreate = false; this.load(); },
      error: (err) => { this.isPosting = false; this.postError = err.error?.message || 'Failed to post.'; }
    });
  }

  delete(ann: Announcement) {
    if (!confirm(`Delete "${ann.title}"?`)) return;
    this.annService.deleteAnnouncement(ann.id).subscribe({ next: () => this.load() });
  }

  targetLabel(t: string): string {
    const map: any = { ALL: 'All', TEACHERS: 'Teachers', STUDENTS: 'Students', COURSE: 'Course' };
    return map[t] || t;
  }
}
