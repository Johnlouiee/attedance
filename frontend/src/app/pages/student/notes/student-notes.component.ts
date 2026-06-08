import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotesService, Note } from '../../../services/notes.service';

@Component({
  selector: 'app-student-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container animate-fade-in">
      <div class="page-header">
        <h1 class="page-title">My Personal Notes</h1>
        <p class="page-subtitle">Jot down quick reminders, study tips, or class notes. Everything is saved automatically.</p>
      </div>

      <!-- Action Panel: Search & Add Button -->
      <div class="action-bar">
        <div class="search-box">
          <i class="pi pi-search search-icon"></i>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Search notes..." 
            class="search-input"
          />
        </div>
        <button (click)="openAddForm()" class="btn btn-primary">
          <i class="pi pi-plus"></i> Add Note
        </button>
      </div>

      <!-- Note Add / Edit Modal Drawer -->
      <div *ngIf="showForm" class="modal-backdrop animate-fade-in" (click)="closeForm()">
        <div class="modal-content animate-slide-in" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingNoteId ? 'Edit Note' : 'Create New Note' }}</h3>
            <button class="close-btn" (click)="closeForm()"><i class="pi pi-times"></i></button>
          </div>
          
          <form (ngSubmit)="saveNote()" class="note-form">
            <div class="form-group">
              <label for="note-title">Title</label>
              <input 
                id="note-title"
                type="text" 
                [(ngModel)]="noteForm.title" 
                name="title" 
                placeholder="Title (optional)" 
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label for="note-content">Content</label>
              <textarea 
                id="note-content"
                [(ngModel)]="noteForm.content" 
                name="content" 
                placeholder="Type your notes here..." 
                rows="6"
                required
                class="form-input form-textarea"
              ></textarea>
            </div>

            <div class="form-group">
              <label>Select Card Color</label>
              <div class="color-picker">
                <button 
                  type="button"
                  *ngFor="let color of presetColors" 
                  [style.background-color]="color"
                  class="color-dot"
                  [class.selected]="noteForm.color === color"
                  (click)="noteForm.color = color"
                ></button>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="closeForm()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="saving || !noteForm.content.trim()">
                <span *ngIf="!saving">Save Note</span>
                <span *ngIf="saving"><i class="pi pi-spin pi-spinner"></i> Saving...</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Notes Grid -->
      <div *ngIf="filteredNotes().length === 0" class="empty-state card-box">
        <i class="pi pi-pencil empty-icon"></i>
        <h3>No notes found</h3>
        <p>{{ searchQuery.trim() ? 'No notes match your search term.' : 'Click "Add Note" to write your first sticky note!' }}</p>
      </div>

      <div class="notes-grid" *ngIf="filteredNotes().length > 0">
        <div 
          class="note-card animate-fade-in" 
          *ngFor="let note of filteredNotes()" 
          [style.background-color]="note.color"
        >
          <div class="note-card-header">
            <h3 class="note-title">{{ note.title || 'Untitled Note' }}</h3>
            <div class="note-actions">
              <button (click)="editNote(note)" title="Edit Note" class="action-btn edit"><i class="pi pi-pencil"></i></button>
              <button (click)="deleteNote(note.id)" title="Delete Note" class="action-btn delete"><i class="pi pi-trash"></i></button>
            </div>
          </div>
          
          <div class="note-content">
            <p>{{ note.content }}</p>
          </div>

          <div class="note-footer">
            <span>Updated: {{ note.updatedAt | date:'shortTime' }} • {{ note.updatedAt | date:'mediumDate' }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .page-header {
      margin-bottom: 0.5rem;
    }
    .page-title {
      font-size: 2.25rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.5rem;
      letter-spacing: -0.025em;
    }
    .page-subtitle {
      color: #64748b;
      font-size: 1rem;
    }

    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .search-box {
      position: relative;
      flex: 1;
      max-width: 400px;
      min-width: 250px;
    }
    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
    }
    .search-input {
      width: 100%;
      padding: 0.65rem 1rem 0.65rem 2.5rem;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      font-size: 0.95rem;
      transition: all 0.2s;
      background-color: #ffffff;
      color: #1e293b;
    }
    .search-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      font-size: 0.95rem;
      font-weight: 600;
      border-radius: 10px;
      transition: all 0.2s;
      cursor: pointer;
      border: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      color: #ffffff;
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #1d4ed8, #2563eb);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }

    .card-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.75rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      text-align: center;
      border: 2px dashed #cbd5e1;
      background: #f8fafc;
      margin-top: 1rem;
    }
    .empty-icon {
      font-size: 3.5rem;
      color: #94a3b8;
      margin-bottom: 1rem;
    }
    .empty-state h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #334155;
      margin-bottom: 0.5rem;
    }
    .empty-state p {
      color: #64748b;
      font-size: 0.95rem;
    }

    /* Modal Backdrop */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .modal-content {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      padding: 1.75rem;
      position: relative;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 0.75rem;
    }
    .modal-header h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }
    .close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0.25rem;
      transition: color 0.2s;
    }
    .close-btn:hover {
      color: #475569;
    }

    .note-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .form-group label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #475569;
    }
    .form-textarea {
      resize: vertical;
      font-family: inherit;
    }

    .color-picker {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.25rem;
    }
    .color-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
    }
    .color-dot:hover {
      transform: scale(1.1);
    }
    .color-dot.selected {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1rem;
      border-top: 1px solid #f1f5f9;
      padding-top: 1.25rem;
    }

    /* Notes Grid */
    .notes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-top: 1rem;
    }

    .note-card {
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 220px;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }
    .note-card:hover {
      transform: translateY(-4px) rotate(0.5deg);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
    }

    .note-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .note-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
      line-height: 1.3;
    }
    
    .note-actions {
      display: flex;
      gap: 0.25rem;
      opacity: 0.4;
      transition: opacity 0.2s;
    }
    .note-card:hover .note-actions {
      opacity: 1;
    }
    .action-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      color: #64748b;
      font-size: 0.9rem;
      padding: 0.25rem;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .action-btn:hover {
      background: rgba(0, 0, 0, 0.05);
    }
    .action-btn.delete:hover {
      color: #ef4444;
    }
    .action-btn.edit:hover {
      color: #2563eb;
    }

    .note-content {
      font-size: 0.95rem;
      color: #334155;
      line-height: 1.6;
      flex: 1;
      white-space: pre-wrap;
      overflow-wrap: break-word;
      margin-bottom: 1.25rem;
    }

    .note-footer {
      border-top: 1px solid rgba(0, 0, 0, 0.05);
      padding-top: 0.75rem;
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 500;
    }

    .animate-fade-in {
      animation: fadeIn 0.35s ease-out;
    }
    .animate-slide-in {
      animation: slideIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class StudentNotesComponent implements OnInit {
  notes: Note[] = [];
  searchQuery = '';
  showForm = false;
  saving = false;
  editingNoteId: number | null = null;

  presetColors = [
    '#fef9c3', // warm light yellow
    '#dbeafe', // warm light blue
    '#d1fae5', // warm light green
    '#fce7f3', // warm light pink
    '#f3e8ff'  // warm light purple
  ];

  noteForm = {
    title: '',
    content: '',
    color: '#fef9c3'
  };

  constructor(private notesService: NotesService) {}

  ngOnInit() {
    this.loadNotes();
  }

  loadNotes() {
    this.notesService.getMyNotes().subscribe({
      next: (res) => {
        this.notes = res;
      },
      error: (err) => {
        console.error('Failed to load notes', err);
      }
    });
  }

  filteredNotes(): Note[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.notes;
    return this.notes.filter(n => 
      (n.title && n.title.toLowerCase().includes(q)) || 
      (n.content && n.content.toLowerCase().includes(q))
    );
  }

  openAddForm() {
    this.editingNoteId = null;
    this.noteForm = {
      title: '',
      content: '',
      color: '#fef9c3'
    };
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
  }

  editNote(note: Note) {
    this.editingNoteId = note.id;
    this.noteForm = {
      title: note.title,
      content: note.content,
      color: note.color
    };
    this.showForm = true;
  }

  saveNote() {
    if (!this.noteForm.content.trim()) return;
    this.saving = true;

    if (this.editingNoteId) {
      this.notesService.updateNote(this.editingNoteId, this.noteForm).subscribe({
        next: () => {
          this.saving = false;
          this.showForm = false;
          this.loadNotes();
        },
        error: (err) => {
          this.saving = false;
          console.error('Failed to update note', err);
        }
      });
    } else {
      this.notesService.createNote(this.noteForm).subscribe({
        next: () => {
          this.saving = false;
          this.showForm = false;
          this.loadNotes();
        },
        error: (err) => {
          this.saving = false;
          console.error('Failed to create note', err);
        }
      });
    }
  }

  deleteNote(id: number) {
    if (!confirm('Are you sure you want to delete this note?')) return;

    this.notesService.deleteNote(id).subscribe({
      next: () => {
        this.loadNotes();
      },
      error: (err) => {
        console.error('Failed to delete note', err);
      }
    });
  }
}
