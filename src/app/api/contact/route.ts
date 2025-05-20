import { NextResponse } from "next/server";
import { z } from "zod";
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail, formatContactMessageHtml, formatContactMessageText } from "@/lib/mail";

// Schema for validating the request body
const contactSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  subject: z.string().min(2, { message: "Subject must be at least 2 characters" }),
  message: z.string().min(10, { message: "Message must be at least 10 characters" }),
});

// Local storage fallback for development
const saveToLocalFile = async (messageData) => {
  try {
    // Create directory if it doesn't exist
    const dirPath = path.join(process.cwd(), 'local-data');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    const filePath = path.join(dirPath, 'contact-messages.json');
    
    // Read existing data or create empty array
    let messages = [];
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      messages = JSON.parse(fileContent);
    }
    
    // Add new message with id and timestamps
    const newMessage = {
      id: uuidv4(),
      ...messageData,
      status: "UNREAD",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    messages.push(newMessage);
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
    
    return newMessage;
  } catch (error) {
    console.error("Error saving to local file:", error);
    throw error;
  }
};

export async function POST(req: Request) {
  try {
    // Parse and validate the request body
    const body = await req.json();
    const result = contactSchema.safeParse(body);
    
    if (!result.success) {
      // Return validation errors
      return NextResponse.json(
        { 
          success: false, 
          errors: result.error.errors 
        }, 
        { status: 400 }
      );
    }
    
    const { name, email, subject, message } = result.data;
    
    // Send an email notification
    let emailSent = false;
    try {
      // Format the email content
      const htmlContent = formatContactMessageHtml(name, email, subject, message);
      const textContent = formatContactMessageText(name, email, subject, message);
      
      // Send to the café's email (use the same email as sender if you want to receive it in the same account)
      emailSent = await sendEmail({
        to: process.env.EMAIL_USER || 'contact@caferayah.com', // You can change this to any recipient email
        subject: `[Contact Form] ${subject}`,
        html: htmlContent,
        text: textContent,
      });
      
      if (emailSent) {
        console.log('Contact form email sent successfully');
      } else {
        console.warn('Failed to send contact form email');
      }
    } catch (emailError) {
      console.error('Error sending contact form email:', emailError);
    }
    
    // If email failed, try to save locally as a backup
    let savedToFile = false;
    if (!emailSent) {
      try {
        if (process.env.NODE_ENV !== 'production') {
          await saveToLocalFile({ name, email, subject, message });
          console.log('Contact message saved to local file');
          savedToFile = true;
        }
      } catch (localSaveError) {
        console.error("Failed to save to local file:", localSaveError);
      }
    }
    
    // If either email was sent or data was saved to file, consider it a success
    if (emailSent || savedToFile) {
      return NextResponse.json({
        success: true,
        message: "Your message has been received. We'll get back to you soon!",
        emailSent,
        savedToFile
      });
    }
    
    // If both operations failed, return an error
    return NextResponse.json(
      { 
        success: false, 
        message: "We're experiencing technical difficulties. Please try again later or contact us directly via phone."
      }, 
      { status: 500 }
    );
  } catch (error) {
    console.error("Error processing contact form submission:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to process your message. Please try again later."
      }, 
      { status: 500 }
    );
  }
} 