import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AdminApiService, UserRecord } from '../../../services/admin-api.service';

interface ReportItem {
  id: string;
  name: string;
  description: string;
  type: 'attendance' | 'students' | 'teachers';
  icon: string;
}

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, CardModule],
  templateUrl: './admin-reports.component.html',
  styleUrl: './admin-reports.component.css'
})
export class AdminReportsComponent implements OnInit {
  reports: ReportItem[] = [
    { id: '1', name: 'Students Directory Report', description: 'Complete list of all registered students, their status, and creation dates.', type: 'students', icon: 'pi-users' },
    { id: '2', name: 'Teachers Directory Report', description: 'Directory of all active and inactive teachers in the system.', type: 'teachers', icon: 'pi-user-edit' },
    { id: '3', name: 'System Attendance Summary', description: 'High-level attendance summary and module statistics.', type: 'attendance', icon: 'pi-calendar-plus' }
  ];

  selectedReport: ReportItem | null = null;
  reportData: UserRecord[] = [];
  isLoading = false;
  generatedDate: Date | null = null;

  constructor(private adminApi: AdminApiService) {}

  ngOnInit() {
    // Select the first report by default
    this.selectReport(this.reports[0]);
  }

  selectReport(report: ReportItem) {
    this.selectedReport = report;
    this.reportData = [];
    this.generatedDate = null;
    this.generateReport();
  }

  generateReport() {
    if (!this.selectedReport) return;
    
    this.isLoading = true;
    this.reportData = [];
    
    if (this.selectedReport.type === 'students') {
      this.adminApi.getStudents().subscribe({
        next: (data) => {
          this.reportData = data;
          this.generatedDate = new Date();
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
    } else if (this.selectedReport.type === 'teachers') {
      this.adminApi.getTeachers().subscribe({
        next: (data) => {
          this.reportData = data;
          this.generatedDate = new Date();
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
    } else {
      // Mock some attendance data based on total stats
      this.adminApi.getAllUsers().subscribe({
        next: (users) => {
          // Present a subset as a dynamic preview
          this.reportData = users.filter(u => u.status === 'ACTIVE');
          this.generatedDate = new Date();
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
    }
  }

  exportCSV() {
    if (this.reportData.length === 0 || !this.selectedReport) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,First Name,Last Name,Email,Role,Status,Created At\n";
    
    this.reportData.forEach((u) => {
      const row = [u.id, u.firstName, u.lastName, u.email, u.role, u.status, u.createdAt].join(",");
      csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${this.selectedReport.type}_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportPDF() {
    // Professional print layout invocation
    window.print();
  }
}
