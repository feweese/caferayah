import nodemailer from 'nodemailer';

// Create a nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export interface EmailData {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const sendEmail = async (data: EmailData): Promise<boolean> => {
  try {
    const { to, subject, text, html } = data;
    
    const mailOptions = {
      from: `Caférayah <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Format a contact message as HTML
export const formatContactMessageHtml = (
  name: string, 
  email: string, 
  subject: string, 
  message: string
) => {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Message</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; color: #09090b; background-color: #fafafa;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#fafafa">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table width="100%" style="max-width: 600px;" border="0" cellspacing="0" cellpadding="0">
              <!-- Logo -->
              <tr>
                <td align="left" style="padding: 0 0 24px 0;">
                  <div style="font-size: 24px; font-weight: 600; color: #09090b;">Caférayah</div>
                </td>
              </tr>
              
              <!-- Card -->
              <tr>
                <td>
                  <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; margin-bottom: 24px;">
                    <!-- Card Header -->
                    <div style="padding: 24px 24px 0;">
                      <h1 style="margin: 0; font-size: 18px; font-weight: 600; color: #09090b;">New Contact Message</h1>
                      <p style="margin: 8px 0 0; font-size: 14px; color: #71717a;">${today}</p>
                    </div>
                    
                    <!-- Card Content -->
                    <div style="padding: 20px 24px 24px;">
                      <!-- Sender Info -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                        <tr>
                          <td width="40" valign="top">
                            <div style="width: 32px; height: 32px; border-radius: 32px; background-color: #f4f4f5; color: #18181b; font-weight: 600; font-size: 14px; display: inline-block; text-align: center; line-height: 32px;">
                              ${name.charAt(0).toUpperCase()}
                            </div>
                          </td>
                          <td valign="top">
                            <p style="margin: 0; font-size: 15px; font-weight: 500; color: #09090b;">${name}</p>
                            <p style="margin: 2px 0 0; font-size: 14px; color: #71717a;">${email}</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Subject -->
                      <h2 style="margin: 0 0 16px; font-size: 16px; font-weight: 600;">${subject}</h2>
                      
                      <!-- Message -->
                      <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e4e4e7; margin-bottom: 24px;">
                        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #18181b; white-space: pre-wrap;">${message}</p>
                      </div>
                      
                      <!-- Action Buttons -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td>
                            <a href="mailto:${email}?subject=Re: ${subject}" style="display: inline-block; background-color: #18181b; color: white; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-size: 14px; font-weight: 500;">Reply to ${name}</a>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding-top: 12px;">
                  <p style="margin: 0 0 8px; font-size: 14px; color: #71717a;">Sent via contact form</p>
                  <p style="margin: 0; font-size: 14px; color: #a1a1aa;">
                    Caférayah • 464 T. Sulit St., Martinez Del 96, Pateros Metro Manila
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

// Format a contact message as plain text (for email clients that don't support HTML)
export const formatContactMessageText = (
  name: string, 
  email: string, 
  subject: string, 
  message: string
) => {
  return `
NEW CONTACT MESSAGE - CAFÉRAYAH

From: ${name} (${email})
Subject: ${subject}

Message:
${message}

---
This message was sent from the Caférayah website contact form.
464 T. Sulit St., Martinez Del 96, Pateros Metro Manila
  `.trim();
}; 