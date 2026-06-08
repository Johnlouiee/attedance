import {
  Injectable, NotFoundException, ForbiddenException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Note } from './entities/note.entity';

export class CreateNoteDto {
  title: string;
  content: string;
  color?: string;
}

export class UpdateNoteDto {
  title?: string;
  content?: string;
  color?: string;
}

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepo: Repository<Note>,
  ) {}

  async getMyNotes(studentId: number) {
    return this.noteRepo.find({
      where: { studentId },
      order: { updatedAt: 'DESC' },
    });
  }

  async createNote(studentId: number, dto: CreateNoteDto) {
    const note = this.noteRepo.create({
      studentId,
      title: dto.title || 'Untitled Note',
      content: dto.content || '',
      color: dto.color || '#fef9c3',
    });
    return this.noteRepo.save(note);
  }

  async updateNote(studentId: number, id: number, dto: UpdateNoteDto) {
    const note = await this.noteRepo.findOne({ where: { id } });
    if (!note) throw new NotFoundException('Note not found.');
    if (note.studentId !== studentId) throw new ForbiddenException('Not your note.');

    if (dto.title !== undefined) note.title = dto.title;
    if (dto.content !== undefined) note.content = dto.content;
    if (dto.color !== undefined) note.color = dto.color;

    return this.noteRepo.save(note);
  }

  async deleteNote(studentId: number, id: number) {
    const note = await this.noteRepo.findOne({ where: { id } });
    if (!note) throw new NotFoundException('Note not found.');
    if (note.studentId !== studentId) throw new ForbiddenException('Not your note.');
    await this.noteRepo.remove(note);
    return { message: 'Note deleted.' };
  }
}
