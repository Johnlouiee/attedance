import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_BASE = 'http://localhost:3000/api/v1';

export interface Note {
  id: number;
  studentId: number;
  title: string;
  content: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotesService {
  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getMyNotes(): Observable<Note[]> {
    return this.http.get<Note[]>(`${API_BASE}/notes/me`, { headers: this.headers() });
  }

  createNote(dto: { title: string; content: string; color?: string }): Observable<Note> {
    return this.http.post<Note>(`${API_BASE}/notes`, dto, { headers: this.headers() });
  }

  updateNote(id: number, dto: { title?: string; content?: string; color?: string }): Observable<Note> {
    return this.http.patch<Note>(`${API_BASE}/notes/${id}`, dto, { headers: this.headers() });
  }

  deleteNote(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_BASE}/notes/${id}`, { headers: this.headers() });
  }
}
