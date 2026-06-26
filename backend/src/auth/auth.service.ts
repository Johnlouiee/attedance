import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
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
import { exec } from 'child_process';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { RegisterDto, LoginDto, ForgotPasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const mailUser = this.configService.get<string>('MAIL_USER') || 'pachott@attenguard.com';
    const mailPass = this.configService.get<string>('MAIL_PASS');

    if (mailPass) {
      // Configure Gmail SMTP using explicit port 587 + STARTTLS
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // STARTTLS
        auth: {
          user: mailUser,
          pass: mailPass,
        },
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3',
        },
      });

      this.transporter.verify((error) => {
        if (error) {
          console.error('[Mailer] SMTP connection failed:', error.message);
          console.error('[Mailer] ► Make sure you are using a Gmail APP PASSWORD (16 chars),');
          console.error('[Mailer] ► NOT your regular Gmail password.');
          console.error('[Mailer] ► Generate one at: https://myaccount.google.com/apppasswords');
          console.error('[Mailer] ► Local HTML browser fallback will be used.');
        } else {
          console.log(`[Mailer] SMTP ready ✓ — emails will be delivered from ${mailUser}.`);
        }
      });
    } else {
      console.log('[Mailer] MAIL_PASS is empty. Zero-Setup Local HTML simulation is active.');
      console.log('[Mailer] Default sender will be: pachott@attenguard.com');
    }
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
    const user = await this.userRepo.findOne({
      where: [
        { email: dto.email },
        { studentId: dto.email }
      ]
    });
 
    if (!user) {
      throw new UnauthorizedException('Invalid email, ID, or password.');
    }
 
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email, ID, or password.');
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
        contactNumber: user.contactNumber,
        isEmailVerified: user.isEmailVerified,
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

    if (!user.email) {
      return { message: 'If this email exists, a reset link has been sent.' };
    }

    const mailUser = this.configService.get<string>('MAIL_USER') || 'pachott@attenguard.com';
    const mailPass = this.configService.get<string>('MAIL_PASS');
    const subject = '🔐 AttenGuard — Password Reset Request';
    const htmlBody = `
      <div style="font-family: 'Inter', sans-serif; max-width: 580px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #0f172a, #1e3a5f); padding: 2rem; text-align: center;">
          <h1 style="color: #60a5fa; margin: 0; font-size: 1.75rem; letter-spacing: -0.02em;">🛡 AttenGuard</h1>
          <p style="color: #94a3b8; margin: 0.5rem 0 0; font-size: 0.9rem;">Secure Campus Attendance System</p>
        </div>
        <div style="padding: 2rem 2.5rem;">
          <h2 style="color: #0f172a; font-size: 1.3rem; margin-bottom: 0.5rem;">Password Reset Request</h2>
          <p style="color: #475569; line-height: 1.6;">
            Hello <strong>${user.firstName}</strong>,<br/><br/>
            We received a request to reset the password for your AttenGuard account.
            Click the button below to set a new password. This link will expire in <strong>1 hour</strong>.
          </p>
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
        <div style="background: #f1f5f9; padding: 1rem 2rem; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 0.75rem; margin: 0;">
            This is an automated message from AttenGuard. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    // Always log the link to the console
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[DEV FALLBACK] Password Reset Link for:', user.email);
    console.log('[DEV FALLBACK] Copy and open this URL in the browser:');
    console.log(resetLink);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (mailPass && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"AttenGuard System" <${mailUser}>`,
          to: user.email,
          subject,
          html: htmlBody,
        });
        console.log('[Mailer] Reset email sent successfully to:', user.email);
        return { message: 'If this email exists, a reset link has been sent.' };
      } catch (smtpError: any) {
        console.error('[Mailer] SMTP failed — fallback to browser simulation. Error:', smtpError.message);
      }
    }

    await this.simulateEmail(user.email, subject, htmlBody);
    const plainTextBody = `Hello ${user.firstName},\n\nWe received a request to reset the password for your AttenGuard account. Click the link below to set a new password:\n\n${resetLink}\n\nBest regards,\nAttenGuard System\n(dummy: pachott@attenguard.com)`;
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(user.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainTextBody)}`;

    return { 
      message: 'If this email exists, a reset link has been sent.', 
      gmailComposeUrl 
    };
  }

  // ──────────────────────────────────────────────
  // RESET PASSWORD — Validates token and sets new password
  // ──────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string) {
    if (!token) throw new BadRequestException('Reset token is required.');
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters.');
    }

    const user = await this.userRepo.findOne({ where: { resetPasswordToken: token } });
    if (!user) throw new BadRequestException('Invalid or expired password reset link.');

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('This reset link has expired. Please request a new one.');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = null as any;
    user.resetPasswordExpires = null as any;
    await this.userRepo.save(user);

    return { message: 'Password has been reset successfully. You can now log in with your new password.' };
  }

  // ──────────────────────────────────────────────
  // EDIT PROFILE — Updates user details
  // ──────────────────────────────────────────────
  async updateProfile(userId: number, dto: { firstName?: string; lastName?: string; studentId?: string; contactNumber?: string; password?: string; email?: string }) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.studentId !== undefined) user.studentId = dto.studentId;
    if (dto.contactNumber !== undefined) user.contactNumber = dto.contactNumber;

    if (dto.email !== undefined && dto.email !== user.email) {
      if (dto.email) {
        const existing = await this.userRepo.findOne({ where: { email: dto.email } });
        if (existing && existing.id !== user.id) {
          throw new ConflictException('An account with this email already exists.');
        }
      }
      user.email = dto.email || null;
      user.isEmailVerified = false;
      user.status = UserStatus.INACTIVE;
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 12);
    }

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
        contactNumber: user.contactNumber,
        isEmailVerified: user.isEmailVerified,
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

        const localIp = this.getLocalIp();
        fileUrl = `http://${localIp}:3000/pictures/${roleSubfolder}/${filename}`;
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
        contactNumber: user.contactNumber,
        isEmailVerified: user.isEmailVerified,
        profilePhoto: user.profilePhoto,
      }
    };
  }

  // ──────────────────────────────────────────────
  // EMAIL VERIFICATION FLOW
  // ──────────────────────────────────────────────
  async sendVerificationEmail(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    if (!user.email) throw new BadRequestException('Please set your email address first.');
    if (user.isEmailVerified) throw new BadRequestException('Email is already verified.');

    const token = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = token;
    await this.userRepo.save(user);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

    const mailUser = this.configService.get<string>('MAIL_USER') || 'pachott@attenguard.com';
    const mailPass = this.configService.get<string>('MAIL_PASS');
    const subject = '📧 Confirm Your Email Address — AttenGuard';
    const htmlBody = `
      <div style="font-family: 'Inter', sans-serif; max-width: 580px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #0f172a, #1e3a5f); padding: 2rem; text-align: center;">
          <h1 style="color: #60a5fa; margin: 0; font-size: 1.75rem; font-weight: bold;">🛡 AttenGuard</h1>
          <p style="color: #94a3b8; margin: 0.5rem 0 0;">Email Verification</p>
        </div>
        <div style="padding: 2rem 2.5rem;">
          <h2 style="color: #0f172a; font-size: 1.3rem;">Verify Your Email Address</h2>
          <p style="color: #475569; line-height: 1.6;">
            Hello <strong>${user.firstName}</strong>,<br/><br/>
            Please confirm your email address by clicking the button below. This will activate all features of your teacher account.
          </p>
          <div style="text-align: center; margin: 2rem 0;">
            <a href="${verificationLink}"
               style="display: inline-block; background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: #fff;
                      text-decoration: none; padding: 0.875rem 2rem; border-radius: 9999px; font-weight: 700;">
              Verify Email
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 0.85rem;">
            Or copy this link into your browser:<br/>
            <span style="color: #3b82f6;">${verificationLink}</span>
          </p>
        </div>
      </div>
    `;

    // Always log to console
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[DEV FALLBACK] Email Verification Link for:', user.email);
    console.log('[DEV FALLBACK] Copy and open this URL in the browser:');
    console.log(verificationLink);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (mailPass && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"AttenGuard System" <${mailUser}>`,
          to: user.email,
          subject,
          html: htmlBody,
        });
        console.log('[Mailer] Verification email sent successfully to:', user.email);
        return { message: 'Verification link has been sent to your email.' };
      } catch (smtpError: any) {
        console.error('[Mailer] SMTP failed — fallback to browser simulation. Error:', smtpError.message);
      }
    }

    await this.simulateEmail(user.email, subject, htmlBody);
    const plainTextBody = `Hello ${user.firstName},\n\nPlease confirm your email address by clicking the link below to verify your AttenGuard account:\n\n${verificationLink}\n\nBest regards,\nAttenGuard System\n(dummy: pachott@attenguard.com)`;
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(user.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainTextBody)}`;

    return { 
      message: 'Verification link has been sent to your email.', 
      gmailComposeUrl 
    };
  }

  async verifyEmail(token: string) {
    const user = await this.userRepo.findOne({ where: { emailVerificationToken: token } });
    if (!user) throw new BadRequestException('Invalid or expired verification token.');

    user.isEmailVerified = true;
    user.emailVerificationToken = null as any;
    user.status = UserStatus.ACTIVE;
    await this.userRepo.save(user);

    return { message: 'Email verified successfully. Your account is now active!' };
  }

  private async simulateEmail(to: string, subject: string, htmlContent: string) {
    const defaultSender = this.configService.get<string>('MAIL_USER') || 'pachott@attenguard.com';
    
    // Create header representation in the HTML preview for aesthetics
    const previewHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f1f5f9;
            margin: 0;
            padding: 20px;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }
          .email-meta-header {
            background-color: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            padding: 16px 24px;
            font-size: 13px;
            color: #475569;
          }
          .email-meta-row {
            margin-bottom: 6px;
            display: flex;
          }
          .email-meta-label {
            font-weight: 600;
            width: 80px;
            color: #64748b;
          }
          .email-meta-value {
            color: #0f172a;
          }
          .email-body {
            padding: 24px;
          }
          .dev-note-banner {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 12px 16px;
            margin: 16px 24px 0;
            border-radius: 4px;
            font-size: 13px;
            color: #1e3a8a;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="dev-note-banner">
            <strong>⚙️ Development Mode Email Simulation</strong><br/>
            This email was generated locally because no SMTP credentials were configured in <code>.env</code>.
          </div>
          <div class="email-meta-header">
            <div class="email-meta-row">
              <span class="email-meta-label">From:</span>
              <span class="email-meta-value">"AttenGuard System" &lt;${defaultSender}&gt;</span>
            </div>
            <div class="email-meta-row">
              <span class="email-meta-label">To:</span>
              <span class="email-meta-value">${to}</span>
            </div>
            <div class="email-meta-row">
              <span class="email-meta-label">Subject:</span>
              <span class="email-meta-value">${subject}</span>
            </div>
            <div class="email-meta-row">
              <span class="email-meta-label">Date:</span>
              <span class="email-meta-value">${new Date().toLocaleString()}</span>
            </div>
          </div>
          <div class="email-body">
            ${htmlContent}
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const tempDir = path.join(process.cwd(), 'temp-emails');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const safeEmail = to.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `mail-${safeEmail}-${Date.now()}.html`;
      const filePath = path.join(tempDir, filename);

      fs.writeFileSync(filePath, previewHtml, 'utf8');

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[Dev Mailer] Email Mock Generated!');
      console.log(`[Dev Mailer] Recipient: \x1b[36m${to}\x1b[0m`);
      console.log(`[Dev Mailer] Sender:    ${defaultSender}`);
      console.log(`[Dev Mailer] Subject:   ${subject}`);
      console.log(`[Dev Mailer] File Saved: ${filePath}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const isWindows = process.platform === 'win32';
      const openCmd = isWindows ? 'start ""' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      exec(`${openCmd} "${filePath}"`);
    } catch (err: any) {
      console.error('[Dev Mailer] Failed to write or open simulated email file:', err.message);
    }
  }

  private getLocalIp(): string {
    const interfaces = require('os').networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    return 'localhost';
  }
}
