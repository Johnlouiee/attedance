import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Request,
  UseGuards, HttpCode, HttpStatus, ParseIntPipe
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotesService, CreateNoteDto, UpdateNoteDto } from './notes.service';

@UseGuards(AuthGuard('jwt'))
@Controller('notes')
export class NotesController {
  constructor(private readonly service: NotesService) {}

  /** GET /api/v1/notes/me */
  @Get('me')
  getMyNotes(@Request() req: any) {
    return this.service.getMyNotes(req.user.sub);
  }

  /** POST /api/v1/notes */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createNote(@Body() dto: CreateNoteDto, @Request() req: any) {
    return this.service.createNote(req.user.sub, dto);
  }

  /** PATCH /api/v1/notes/:id */
  @Patch(':id')
  updateNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNoteDto,
    @Request() req: any,
  ) {
    return this.service.updateNote(req.user.sub, id, dto);
  }

  /** DELETE /api/v1/notes/:id */
  @Delete(':id')
  deleteNote(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.deleteNote(req.user.sub, id);
  }
}
