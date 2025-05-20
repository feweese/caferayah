import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
    console.log("Starting payment proof upload process...");
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log("Upload rejected: User not authenticated");
      return NextResponse.json(
        { error: "Unauthorized", details: "You must be logged in" },
        { status: 401 }
      );
    }

    console.log(`User authenticated: ${session.user.email}`);
    
    // Process the form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    // Validate the file
    if (!file) {
      console.log("Upload rejected: No file provided");
      return NextResponse.json(
        { error: "Bad Request", details: "No file provided" },
        { status: 400 }
      );
    }

    console.log(`File info: name=${file.name}, type=${file.type}, size=${file.size} bytes`);
    
    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      console.log(`Upload rejected: Invalid file type (${file.type})`);
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
      
      console.log(`Upload rejected: File too large (${fileSizeMB}MB > ${maxSizeMB}MB)`);
      return NextResponse.json(
        { 
          error: "File too large", 
          details: `Maximum file size is ${maxSizeMB}MB. Your file is ${fileSizeMB}MB.` 
        },
        { status: 400 }
      );
    }

    try {
      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate a unique ID for the file
      const uniqueId = uuidv4();

      // Upload to Cloudinary
      console.log("Uploading payment proof to Cloudinary...");
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { 
            folder: "caferayah/payment_proofs",
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

      console.log(`Payment proof uploaded successfully to Cloudinary. URL: ${result.secure_url}`);
      
      // Return success response
      return NextResponse.json({ url: result.secure_url });
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
    console.error("Payment proof upload error:", error);
    return NextResponse.json(
      { 
        error: "Server error", 
        details: error instanceof Error ? error.message : "Failed to process payment proof upload" 
      },
      { status: 500 }
    );
  }
} 