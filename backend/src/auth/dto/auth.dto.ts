export class RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  password: string;
}

export class LoginDto {
  email: string;
  password: string;
}

export class ForgotPasswordDto {
  email: string;
}
