import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminApiService, AttendanceSession } from '../../../services/admin-api.service';
import { decodeQrFromFile, decodeQrFromImageSource } from '../../../utils/qr-scan.util';

@Component({
  selector: 'app-student-scan',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-container animate-fade-in">
      <div class="scan-header">
        <a routerLink="/student/schedule" class="back-btn"><i class="pi pi-arrow-left"></i> Back to Schedule</a>
        <h1 class="page-title">Attendance Check-In</h1>
        <p class="page-subtitle">Scan or upload the teacher QR to check in. Phrase code is only needed if QR is unavailable.</p>
      </div>

      <div class="active-panel">
        <div class="panel-title">
          <i class="pi pi-bolt"></i>
          Open Attendance
        </div>

        <div *ngIf="loadingSessions" class="muted-state">
          <i class="pi pi-spin pi-spinner"></i> Loading active sessions...
        </div>

        <div *ngIf="!loadingSessions && activeSessions.length === 0" class="muted-state">
          <i class="pi pi-calendar-times"></i> No attendance session is open for your enrolled courses.
        </div>

        <div class="session-list" *ngIf="activeSessions.length > 0">
          <button
            type="button"
            class="session-chip"
            *ngFor="let session of activeSessions"
            [ngClass]="{'selected': selectedCourseId === session.courseId}"
            (click)="selectSession(session)"
          >
            <span>{{ session.courseCode }}</span>
            <small>Ends {{ session.endsAt | date:'shortTime' }}</small>
          </button>
        </div>
      </div>

      <div class="scanner-container">
        <div class="scanner-frame">
          <video #videoPreview class="camera-preview" autoplay muted playsinline [class.is-active]="cameraActive"></video>
          <img *ngIf="uploadPreviewUrl && !cameraActive" [src]="uploadPreviewUrl" alt="Uploaded QR preview" class="upload-preview" />
          <div class="scanner-corners">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <div class="corner bottom-left"></div>
            <div class="corner bottom-right"></div>
          </div>
          <div class="scanning-line" *ngIf="cameraActive"></div>

          <div class="scanner-overlay-text" *ngIf="!cameraActive && !uploadPreviewUrl">
            <i class="pi pi-qrcode overlay-icon"></i>
            <p>Scan or upload the QR your teacher shows in class</p>
          </div>
        </div>

        <label class="location-toggle scan-location">
          <input type="checkbox" name="useLocation" [(ngModel)]="useLocation" [disabled]="loading" />
          Include my GPS location when checking in
        </label>

        <div class="scanner-actions">
          <button class="action-btn secondary" type="button" (click)="startCamera()" [disabled]="loading || cameraActive || activeSessions.length === 0">
            <i class="pi pi-camera"></i> {{ cameraActive ? 'Scanning...' : 'Scan QR' }}
          </button>
          <button class="action-btn secondary" type="button" (click)="stopCamera()" [disabled]="!cameraActive">
            <i class="pi pi-stop-circle"></i> Stop
          </button>
          <label class="action-btn secondary upload-btn" [class.is-disabled]="loading || activeSessions.length === 0">
            <i class="pi pi-upload"></i> Upload QR
            <input
              type="file"
              accept="image/*"
              capture="environment"
              (change)="onQrFileSelected($event)"
              [disabled]="loading || activeSessions.length === 0"
              hidden
            />
          </label>
        </div>

        <details class="phrase-fallback">
          <summary><i class="pi pi-key"></i> Optional: enter phrase code instead</summary>
          <form class="scan-form" (ngSubmit)="submitCode()">
            <p class="field-hint">Only use this if you cannot scan or upload the QR.</p>
            <input
              id="manualCode"
              name="manualCode"
              [(ngModel)]="manualCode"
              placeholder="Example: Swift Falcon"
              [disabled]="loading"
              maxlength="48"
              autocomplete="off"
            />
            <button class="action-btn primary" type="submit" [disabled]="loading || !selectedCourseId || !manualCode.trim()">
              <i class="pi" [ngClass]="loading ? 'pi-spin pi-spinner' : 'pi-check-circle'"></i>
              {{ loading ? 'Submitting...' : 'Submit Phrase Code' }}
            </button>
          </form>
        </details>

        <div *ngIf="successMessage" class="scan-alert success">
          <i class="pi pi-check-circle"></i> {{ successMessage }}
        </div>
        <div *ngIf="errorMessage" class="scan-alert danger">
          <i class="pi pi-exclamation-circle"></i> {{ errorMessage }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; max-width: 860px; margin: 0 auto; padding: 0 1rem 2rem; }
    .scan-header { text-align: center; width: 100%; margin-bottom: 0.5rem; }
    .back-btn { display: inline-flex; align-items: center; gap: 0.5rem; color: #64748b; text-decoration: none; font-weight: 600; font-size: 0.9rem; margin-bottom: 1.5rem; transition: color 0.2s; }
    .back-btn:hover { color: #0f172a; }
    .page-title { font-size: clamp(1.5rem, 4vw, 2rem); font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; }
    .page-subtitle { color: #64748b; font-size: clamp(0.9rem, 2.5vw, 1rem); line-height: 1.5; }

    .active-panel {
      width: 100%;
      max-width: 560px;
      background: #ffffff;
      border: 1px solid #bfdbfe;
      border-radius: 14px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
    }
    .panel-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 800; color: #0f172a; }
    .panel-title i { color: #2563eb; }
    .muted-state { color: #64748b; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem; }
    .session-list { display: flex; flex-wrap: wrap; gap: 0.65rem; }
    .session-chip {
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      color: #1e40af;
      border-radius: 10px;
      padding: 0.55rem 0.75rem;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.15rem;
      cursor: pointer;
      font-weight: 800;
    }
    .session-chip small { color: #64748b; font-weight: 600; }
    .session-chip.selected { background: #1e3a8a; color: #ffffff; border-color: #1e3a8a; }
    .session-chip.selected small { color: #dbeafe; }

    .scanner-container { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
    .scanner-frame {
      width: 100%;
      max-width: min(400px, 92vw);
      aspect-ratio: 1;
      background: #0f172a;
      border-radius: 24px;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    }
    .camera-preview { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; z-index: 2; }
    .camera-preview.is-active { opacity: 1; }
    .upload-preview { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; z-index: 3; background: #0f172a; }
    .scanner-overlay-text { text-align: center; color: #fff; z-index: 10; padding: 1rem; }
    .overlay-icon { font-size: 2.5rem; margin-bottom: 1rem; color: rgba(255,255,255,0.7); display: block; }
    .scanner-corners { position: absolute; inset: 2rem; z-index: 5; pointer-events: none; }
    .corner { position: absolute; width: 40px; height: 40px; border-color: #3b82f6; border-style: solid; }
    .top-left { top: 0; left: 0; border-width: 4px 0 0 4px; border-top-left-radius: 12px; }
    .top-right { top: 0; right: 0; border-width: 4px 4px 0 0; border-top-right-radius: 12px; }
    .bottom-left { bottom: 0; left: 0; border-width: 0 0 4px 4px; border-bottom-left-radius: 12px; }
    .bottom-right { bottom: 0; right: 0; border-width: 0 4px 4px 0; border-bottom-right-radius: 12px; }
    .scanning-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 3px;
      background: #3b82f6;
      box-shadow: 0 0 15px 3px rgba(59,130,246,0.6);
      top: 10%;
      z-index: 20;
      animation: scan 2.5s ease-in-out infinite alternate;
    }
    @keyframes scan {
      0% { top: 10%; opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { top: 90%; opacity: 0; }
    }

    .scanner-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      width: 100%;
      max-width: 520px;
    }
    .upload-btn { cursor: pointer; margin: 0; }
    .upload-btn.is-disabled { opacity: 0.65; pointer-events: none; }
    .scan-form {
      width: 100%;
      max-width: 520px;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      background: #ffffff;
      border: 1px solid #dbeafe;
      border-radius: 14px;
      padding: 1rem;
    }
    .scan-location { width: 100%; max-width: 520px; }
    .phrase-fallback {
      width: 100%;
      max-width: 520px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 0.75rem 1rem;
    }
    .phrase-fallback summary {
      cursor: pointer;
      font-weight: 700;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      list-style: none;
    }
    .phrase-fallback summary::-webkit-details-marker { display: none; }
    .phrase-fallback .scan-form {
      margin-top: 0.85rem;
      padding: 0;
      border: none;
      background: transparent;
    }
    .scan-form label { font-size: 0.85rem; font-weight: 700; color: #334155; }
    .scan-form input[type="text"] {
      width: 100%;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 0.8rem;
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
      background: #f8fafc;
    }
    .scan-form input:focus {
      outline: none;
      border-color: #3b82f6;
      background: #ffffff;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    }
    .field-hint { margin: -0.25rem 0 0; font-size: 0.8rem; color: #64748b; }
    .location-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #475569 !important;
      font-weight: 600 !important;
    }
    .location-toggle input { width: 16px; height: 16px; }
    .action-btn {
      flex: 1 1 140px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.9rem;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .action-btn.secondary { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
    .action-btn.secondary:hover:not(:disabled) { background: #e2e8f0; color: #0f172a; }
    .action-btn.primary { background: #1e3a8a; color: #fff; box-shadow: 0 4px 12px rgba(59,130,246,0.3); flex: 1 1 100%; }
    .action-btn.primary:hover:not(:disabled) { transform: translateY(-2px); background: #1d4ed8; }
    .action-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none !important; }
    .scan-alert {
      width: 100%;
      max-width: 520px;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      border-radius: 10px;
      padding: 0.9rem 1rem;
      font-weight: 700;
      font-size: 0.9rem;
    }
    .scan-alert.success { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .scan-alert.danger { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

    @media (max-width: 480px) {
      .scanner-actions { flex-direction: column; }
      .action-btn { flex: 1 1 auto; width: 100%; }
    }
  `]
})
export class StudentScanComponent implements OnInit, OnDestroy {
  @ViewChild('videoPreview') videoPreview?: ElementRef<HTMLVideoElement>;

  activeSessions: AttendanceSession[] = [];
  selectedCourseId: number | null = null;
  manualCode = '';
  useLocation = true;
  loading = false;
  loadingSessions = true;
  cameraActive = false;
  uploadPreviewUrl = '';
  successMessage = '';
  errorMessage = '';

  private mediaStream?: MediaStream;
  private scanFrameId: number | null = null;
  private scanCanvas?: HTMLCanvasElement;
  private scanCanvasCtx?: CanvasRenderingContext2D | null;

  constructor(private apiService: AdminApiService) {}

  ngOnInit() {
    this.loadActiveSessions();
  }

  ngOnDestroy() {
    this.stopCamera();
    this.clearUploadPreview();
  }

  loadActiveSessions() {
    this.loadingSessions = true;
    this.apiService.getMyActiveAttendanceSessions().subscribe({
      next: (sessions) => {
        this.activeSessions = sessions;
        this.selectedCourseId = sessions[0]?.courseId ?? null;
        this.loadingSessions = false;
      },
      error: () => {
        this.loadingSessions = false;
        this.errorMessage = 'Failed to load active attendance sessions.';
      }
    });
  }

  selectSession(session: AttendanceSession) {
    this.selectedCourseId = session.courseId;
    this.errorMessage = '';
    this.successMessage = '';
  }

  submitCode() {
    if (!this.selectedCourseId || !this.manualCode.trim()) return;
    this.withLocation((latitude, longitude) => {
      this.loading = true;
      this.apiService.checkInAttendance(this.selectedCourseId!, {
        code: this.manualCode.trim(),
        latitude,
        longitude,
      }).subscribe({
        next: (res) => this.handleSuccess(res.message),
        error: (err) => this.handleError(err.error?.message || 'Failed to submit attendance.'),
      });
    });
  }

  async startCamera() {
    this.errorMessage = '';
    this.clearUploadPreview();
    if (this.activeSessions.length === 0) {
      this.errorMessage = 'No attendance session is open right now.';
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorMessage = 'Camera access is not available. Upload a QR image or use the optional phrase code.';
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      const video = this.videoPreview?.nativeElement;
      if (!video) return;
      video.srcObject = this.mediaStream;
      await video.play();
      this.cameraActive = true;
      this.scanLoop();
    } catch {
      this.errorMessage = 'Camera permission was denied. Upload a QR image or use the optional phrase code.';
      this.stopCamera();
    }
  }

  stopCamera() {
    if (this.scanFrameId !== null) {
      cancelAnimationFrame(this.scanFrameId);
      this.scanFrameId = null;
    }
    this.cameraActive = false;
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.mediaStream = undefined;
    if (this.videoPreview?.nativeElement) {
      this.videoPreview.nativeElement.srcObject = null;
    }
  }

  async onQrFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (this.activeSessions.length === 0) {
      this.errorMessage = 'No attendance session is open right now.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.stopCamera();
    this.setUploadPreview(file);

    this.loading = true;
    const payload = await decodeQrFromFile(file);
    this.loading = false;

    if (!payload) {
      this.errorMessage = 'Could not read a QR code from that image. Try another photo or use the optional phrase code.';
      return;
    }

    this.submitQrPayload(payload);
  }

  private scanLoop() {
    const tick = () => {
      if (!this.cameraActive) return;
      const video = this.videoPreview?.nativeElement;
      if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (width > 0 && height > 0) {
          const canvas = this.ensureScanCanvas();
          canvas.width = width;
          canvas.height = height;
          this.scanCanvasCtx?.drawImage(video, 0, 0, width, height);
          const payload = decodeQrFromImageSource(canvas, width, height);
          if (payload) {
            this.stopCamera();
            this.submitQrPayload(payload);
            return;
          }
        }
      }
      this.scanFrameId = requestAnimationFrame(tick);
    };
    this.scanFrameId = requestAnimationFrame(tick);
  }

  private ensureScanCanvas() {
    if (!this.scanCanvas) {
      this.scanCanvas = document.createElement('canvas');
      this.scanCanvasCtx = this.scanCanvas.getContext('2d', { willReadFrequently: true });
    }
    return this.scanCanvas;
  }

  private setUploadPreview(file: File) {
    this.clearUploadPreview();
    this.uploadPreviewUrl = URL.createObjectURL(file);
  }

  private clearUploadPreview() {
    if (this.uploadPreviewUrl) {
      URL.revokeObjectURL(this.uploadPreviewUrl);
      this.uploadPreviewUrl = '';
    }
  }

  private submitQrPayload(token: string) {
    this.withLocation((latitude, longitude) => {
      this.loading = true;
      this.apiService.scanAttendance({ token, latitude, longitude }).subscribe({
        next: (res) => this.handleSuccess(res.message),
        error: (err) => this.handleError(err.error?.message || 'Failed to scan attendance.'),
      });
    });
  }

  private withLocation(callback: (latitude?: number, longitude?: number) => void) {
    this.successMessage = '';
    this.errorMessage = '';
    if (!this.useLocation || !navigator.geolocation) {
      callback();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => callback(position.coords.latitude, position.coords.longitude),
      () => callback(),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }

  private handleSuccess(message: string) {
    this.loading = false;
    this.successMessage = message;
    this.errorMessage = '';
    this.manualCode = '';
    this.clearUploadPreview();
    this.loadActiveSessions();
  }

  private handleError(message: string) {
    this.loading = false;
    this.errorMessage = message;
  }
}
