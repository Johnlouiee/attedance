import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApiService, AttendanceHistoryRecord } from '../../../services/admin-api.service';

@Component({
  selector: 'app-student-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container animate-fade-in">
      <div class="page-header">
        <h1 class="page-title">Attendance History</h1>
        <p class="page-subtitle">View your transaction history of all scanned QR codes.</p>
      </div>

      <div class="history-panel">
        <div class="history-row header">
          <div class="col-date">Date & Time</div>
          <div class="col-subject">Subject</div>
          <div class="col-room">Location</div>
          <div class="col-status">Status</div>
        </div>

        <div class="empty-history" *ngIf="!loading && history.length === 0">
          <i class="pi pi-calendar-times"></i>
          <p>No attendance records yet.</p>
        </div>

        <div class="history-row" *ngFor="let h of history">
          <div class="col-date">
            <strong>{{ (h.scannedAt || h.createdAt) | date:'mediumDate' }}</strong>
            <span>{{ h.scannedAt ? (h.scannedAt | date:'shortTime') : '--:--' }}</span>
          </div>
          <div class="col-subject">{{ h.courseCode }}: {{ h.courseName }}</div>
          <div class="col-room">Attendance Session</div>
          <div class="col-status">
            <span class="status-badge" [ngClass]="h.status.toLowerCase()">
              <i class="pi" [ngClass]="h.status === 'PRESENT' ? 'pi-check-circle' : (h.status === 'LATE' ? 'pi-clock' : 'pi-times-circle')"></i>
              {{ h.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { display: flex; flex-direction: column; gap: 2rem; }
    .page-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; }
    .page-subtitle { color: #64748b; font-size: 1rem; margin-bottom: 1rem; }

    .history-panel { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; }
    
    .history-row { display: grid; grid-template-columns: 1.5fr 2fr 1.5fr 1fr; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9; align-items: center; gap: 1rem; transition: background 0.2s; }
    .history-row:hover:not(.header) { background: #f8fafc; }
    .history-row:last-child { border-bottom: none; }
    .empty-history { padding: 2.5rem; text-align: center; color: #64748b; }
    .empty-history i { display: block; font-size: 2rem; color: #94a3b8; margin-bottom: 0.75rem; }
    
    .header { background: #f8fafc; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }

    .col-date { display: flex; flex-direction: column; }
    .col-date strong { font-size: 0.95rem; color: #0f172a; font-weight: 600; }
    .col-date span { font-size: 0.8rem; color: #64748b; }
    
    .col-subject { font-size: 0.95rem; font-weight: 600; color: #1e293b; }
    .col-room { font-size: 0.9rem; color: #475569; }

    .status-badge { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; }
    .status-badge.present { background: #dcfce7; color: #166534; }
    .status-badge.late { background: #fef9c3; color: #854d0e; }
    .status-badge.absent { background: #fee2e2; color: #991b1b; }
  `]
})
export class StudentHistoryComponent implements OnInit {
  history: AttendanceHistoryRecord[] = [];
  loading = true;

  constructor(private apiService: AdminApiService) {}

  ngOnInit() {
    this.apiService.getMyAttendanceHistory().subscribe({
      next: (records) => {
        this.history = records;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
