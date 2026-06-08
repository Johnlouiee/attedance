import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';

const API_BASE = 'http://localhost:3000/api/v1';

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: { id: number; firstName: string; lastName: string; email: string; role: string; studentId?: string; profilePhoto?: string };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<LoginResponse['user'] | null>(this.getStoredUser());
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getStoredUser(): LoginResponse['user'] | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }

  register(payload: RegisterPayload): Observable<{ message: string; userId: number }> {
    return this.http.post<{ message: string; userId: number }>(
      `${API_BASE}/auth/register`,
      payload,
    );
  }

  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_BASE}/auth/login`, payload);
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_BASE}/auth/forgot-password`, { email });
  }

  updateProfile(payload: { firstName: string; lastName: string; studentId: string }): Observable<{ message: string; user: LoginResponse['user'] }> {
    const token = localStorage.getItem('accessToken');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.put<{ message: string; user: LoginResponse['user'] }>(`${API_BASE}/auth/profile`, payload, { headers }).pipe(
      tap(res => {
        // Update local storage and reactive state
        localStorage.setItem('user', JSON.stringify(res.user));
        this.userSubject.next(res.user);
      })
    );
  }

  updatePhoto(photoBase64: string): Observable<{ message: string; user: LoginResponse['user'] }> {
    const token = localStorage.getItem('accessToken');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post<{ message: string; user: LoginResponse['user'] }>(`${API_BASE}/auth/photo`, { photoBase64 }, { headers }).pipe(
      tap(res => {
        localStorage.setItem('user', JSON.stringify(res.user));
        this.userSubject.next(res.user);
      })
    );
  }

  saveSession(response: LoginResponse): void {
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('user', JSON.stringify(response.user));
    this.userSubject.next(response.user);
  }

  getUser(): LoginResponse['user'] | null {
    return this.userSubject.value;
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    this.userSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('accessToken');
  }
}
