import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnnouncementService, Announcement } from '../../../services/announcement.service';

@Component({
  selector: 'app-student-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-announcements.component.html',
  styleUrl: './student-announcements.component.css'
})
export class StudentAnnouncementsComponent implements OnInit {
  announcements: Announcement[] = [];
  filteredAnnouncements: Announcement[] = [];
  searchQuery = '';
  isLoading = false;

  constructor(private annService: AnnouncementService) {}

  ngOnInit() { this.load(); }

  load() {
    this.isLoading = true;
    this.annService.getMyAnnouncements().subscribe({
      next: (data) => {
        this.announcements = data;
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  applyFilter() {
    const q = this.searchQuery.toLowerCase();
    this.filteredAnnouncements = q
      ? this.announcements.filter(a => `${a.title} ${a.message} ${a.authorName}`.toLowerCase().includes(q))
      : [...this.announcements];
  }

  audienceLabel(a: Announcement): string {
    if (a.targetAudience === 'COURSE') return `Course: ${a.courseCode}`;
    if (a.targetAudience === 'ALL') return 'All Users';
    if (a.targetAudience === 'STUDENTS') return 'Students';
    return a.targetAudience;
  }

  isNew(dateStr: string): boolean {
    const diff = Date.now() - new Date(dateStr).getTime();
    return diff < 48 * 60 * 60 * 1000; // less than 48 hours
  }
}
