import nodemailer from 'nodemailer';

// Email configuration
const emailConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // Gmail address
    pass: process.env.EMAIL_PASSWORD // App password
  }
};

// Create reusable transporter
const transporter = nodemailer.createTransport(emailConfig);

// Verify connection configuration only in development
if (process.env.NODE_ENV !== 'production') {
  transporter.verify((error) => {
    if (error) {
      console.error('Email service connection error:', error);
    } else {
      console.log('Email service is ready to send messages');
    }
  });
}

// Interface for email options
interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send email using configured transporter
 */
export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  try {
    const senderEmail = process.env.EMAIL_USER;
    
    await transporter.sendMail({
      from: `"Caférayah" <${senderEmail}>`, // Sender address
      to,
      subject,
      html,
    });
    
    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string, 
  resetLink: string
): Promise<boolean> {
  const subject = 'Reset your Caférayah password';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #8B4513; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Caférayah</h1>
      </div>
      
      <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
        <h2>Reset Your Password</h2>
        
        <p>Hello,</p>
        
        <p>We received a request to reset your password for your Caférayah account. To reset your password, click the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            Reset Password
          </a>
        </div>
        
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        
        <p>This link will expire in 1 hour for security reasons.</p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666;">
          <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
          <p style="word-break: break-all;">${resetLink}</p>
        </div>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p>&copy; ${new Date().getFullYear()} Caférayah. All rights reserved.</p>
      </div>
    </div>
  `;
  
  return await sendEmail({ to: email, subject, html });
}

/**
 * Send email verification
 */
export async function sendVerificationEmail(
  email: string, 
  verificationCode: string
): Promise<boolean> {
  const subject = 'Verify your Caférayah account';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #8B4513; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Caférayah</h1>
      </div>
      
      <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
        <h2>Verify Your Email Address</h2>
        
        <p>Hello,</p>
        
        <p>Thank you for registering with Caférayah! To complete your registration and verify your email address, please use the verification code below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 24px; letter-spacing: 4px; font-weight: bold;">
            ${verificationCode}
          </div>
        </div>
        
        <p>Enter this code on the verification page to complete your registration.</p>
        
        <p>If you didn't create an account with us, you can safely ignore this email.</p>
        
        <p>This code will expire in 24 hours for security reasons.</p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p>&copy; ${new Date().getFullYear()} Caférayah. All rights reserved.</p>
      </div>
    </div>
  `;
  
  return await sendEmail({ to: email, subject, html });
} 