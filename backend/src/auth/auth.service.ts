import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { User, UserRole } from './entities/user.entity';
import { RegisterDto, LoginDto, ForgotPasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Configure Gmail SMTP transporter
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  // ──────────────────────────────────────────────
  // REGISTER — Students only, no privilege escalation
  // ──────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Auto-generate a unique random 8-digit student ID
    let studentId: string;
    do {
      studentId = Math.floor(10000000 + Math.random() * 90000000).toString();
    } while (await this.userRepo.findOne({ where: { studentId } }));

    const user = this.userRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      studentId,
      passwordHash,
      role: UserRole.STUDENT, // ALWAYS forced to STUDENT — no escalation possible
    });

    await this.userRepo.save(user);

    return {
      message: 'Registration successful. You can now log in.',
      userId: user.id,
      studentId,
    };
  }

  // ──────────────────────────────────────────────
  // LOGIN — Validates credentials and returns JWT
  // ──────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        profilePhoto: user.profilePhoto,
      },
    };
  }

  // ──────────────────────────────────────────────
  // FORGOT PASSWORD — Sends reset link via Gmail
  // ──────────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return { message: 'If this email exists, a reset link has been sent.' };
    }

    // Generate a secure random token valid for 1 hour
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    await this.userRepo.save(user);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    // Send the email
    await this.transporter.sendMail({
      from: `"AttenGuard System" <${this.configService.get<string>('MAIL_USER')}>`,
      to: user.email,
      subject: '🔐 AttenGuard — Password Reset Request',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 580px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0f172a, #1e3a5f); padding: 2rem; text-align: center;">
            <h1 style="color: #60a5fa; margin: 0; font-size: 1.75rem; letter-spacing: -0.02em;">🛡 AttenGuard</h1>
            <p style="color: #94a3b8; margin: 0.5rem 0 0; font-size: 0.9rem;">Secure Campus Attendance System</p>
          </div>

          <!-- Body -->
          <div style="padding: 2rem 2.5rem;">
            <h2 style="color: #0f172a; font-size: 1.3rem; margin-bottom: 0.5rem;">Password Reset Request</h2>
            <p style="color: #475569; line-height: 1.6;">
              Hello <strong>${user.firstName}</strong>,<br/><br/>
              We received a request to reset the password for your AttenGuard account. 
              Click the button below to set a new password. This link will expire in <strong>1 hour</strong>.
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 2rem 0;">
              <a href="${resetLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: #fff;
                        text-decoration: none; padding: 0.875rem 2rem; border-radius: 9999px; 
                        font-weight: 700; font-size: 1rem; letter-spacing: 0.03em;">
                Reset My Password
              </a>
            </div>

            <p style="color: #94a3b8; font-size: 0.85rem; line-height: 1.6;">
              If you did not request a password reset, please ignore this email. Your account is safe.<br/><br/>
              Or copy this link into your browser:<br/>
              <span style="color: #3b82f6; word-break: break-all;">${resetLink}</span>
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f1f5f9; padding: 1rem 2rem; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 0.75rem; margin: 0;">
              This is an automated message from AttenGuard. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    });

    return { message: 'If this email exists, a reset link has been sent.' };
  }

  // ──────────────────────────────────────────────
  // EDIT PROFILE — Updates user details
  // ──────────────────────────────────────────────
  async updateProfile(userId: number, dto: { firstName?: string; lastName?: string; studentId?: string }) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.studentId !== undefined) user.studentId = dto.studentId;

    await this.userRepo.save(user);

    return {
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        profilePhoto: user.profilePhoto,
      }
    };
  }

  // ──────────────────────────────────────────────
  // UPDATE PHOTO — Saves base64 profile image
  // ──────────────────────────────────────────────
  async updatePhoto(userId: number, photoBase64: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    let fileUrl = '';
    if (photoBase64 && photoBase64.startsWith('data:image/')) {
      const match = photoBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');

        let roleSubfolder = 'students';
        if (user.role === 'TEACHER') {
          roleSubfolder = 'teachers';
        } else if (user.role === 'ADMIN') {
          roleSubfolder = 'admins';
        }

        const uploadDir = path.join(process.cwd(), 'pictures', roleSubfolder);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Remove old images starting with user_{userId}_
        try {
          const files = fs.readdirSync(uploadDir);
          const prefix = `user_${userId}_`;
          for (const file of files) {
            if (file.startsWith(prefix)) {
              fs.unlinkSync(path.join(uploadDir, file));
            }
          }
        } catch (err) {
          console.error('Failed to clear old profile pictures:', err);
        }

        const timestamp = Date.now();
        const filename = `user_${userId}_${timestamp}.${ext}`;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, buffer);

        fileUrl = `http://localhost:3000/pictures/${roleSubfolder}/${filename}`;
      }
    }

    if (fileUrl) {
      user.profilePhoto = fileUrl;
    } else {
      user.profilePhoto = photoBase64;
    }

    await this.userRepo.save(user);

    return {
      message: 'Photo updated successfully.',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        profilePhoto: user.profilePhoto,
      }
    };
  }
}
