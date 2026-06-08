import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_BASE = 'http://localhost:3000/api/v1';

export type AnnouncementTarget = 'ALL' | 'TEACHERS' | 'STUDENTS' | 'COURSE';

export interface Announcement {
  id: number;
  title: string;
  message: string;
  authorId: number;
  authorName: string;
  authorRole: string;
  targetAudience: AnnouncementTarget;
  courseCode?: string;
  createdAt: string;
}

export interface CreateAnnouncementDto {
  title: string;
  message: string;
  targetAudience: AnnouncementTarget;
  courseCode?: string;
}

@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  /** Get announcements relevant to the current user's role */
  getMyAnnouncements(): Observable<Announcement[]> {
    return this.http.get<Announcement[]>(`${API_BASE}/announcements/me`, { headers: this.headers() });
  }

  /** Get ALL announcements (admin) */
  getAllAnnouncements(): Observable<Announcement[]> {
    return this.http.get<Announcement[]>(`${API_BASE}/announcements/all`, { headers: this.headers() });
  }

  /** Create a new announcement */
  createAnnouncement(dto: CreateAnnouncementDto): Observable<Announcement> {
    return this.http.post<Announcement>(`${API_BASE}/announcements`, dto, { headers: this.headers() });
  }

  /** Delete an announcement */
  deleteAnnouncement(id: number): Observable<any> {
    return this.http.delete(`${API_BASE}/announcements/${id}`, { headers: this.headers() });
  }
}
