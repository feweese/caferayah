import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import cloudinary from "@/lib/cloudinary";
import { Readable } from "stream";

// Define allowed file types
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Convert buffer to stream for Cloudinary
const bufferToStream = (buffer: Buffer) => {
  return Readable.from(buffer);
};

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", details: "You must be logged in" },
        { status: 401 }
      );
    }

    // Process the form data
    const formData = await request.formData();
    const file = formData.get("avatar") as File;

    // Validate the file
    if (!file) {
      return NextResponse.json(
        { error: "Bad Request", details: "No file provided" },
        { status: 400 }
      );
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { 
          error: "Invalid file type", 
          details: `File must be one of: ${ALLOWED_FILE_TYPES.join(", ")}` 
        },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
      const fileSizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100;
      
      return NextResponse.json(
        { 
          error: "File too large", 
          details: `Maximum file size is ${maxSizeMB}MB. Your file is ${fileSizeMB}MB.` 
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      // Generate a unique ID for the file
      const uniqueId = uuidv4();

      // Upload to Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { 
            folder: "caferayah/avatars",
            public_id: uniqueId,
            resource_type: "auto"
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        
        bufferToStream(buffer).pipe(uploadStream);
      });

      if (!result || !result.secure_url) {
        throw new Error("Failed to get URL from Cloudinary");
      }

      const avatarUrl = result.secure_url;

      // Update the user's image in the database
      await db.user.update({
        where: { id: session.user.id },
        data: { image: avatarUrl }
      });

      // Return success response with the URL
      return NextResponse.json({ 
        url: avatarUrl,
        message: "Avatar uploaded successfully" 
      });
    } catch (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { 
          error: "Upload failed", 
          details: uploadError instanceof Error ? uploadError.message : "Failed to upload file to storage" 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Server error", details: "Failed to process avatar upload" },
      { status: 500 }
    );
  }
} 