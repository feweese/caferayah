"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MinimalIcons as Icons } from "@/components/minimal-icons";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface GCashPaymentProps {
  onPaymentProofUploaded: (imageUrl: string) => void;
  isLoading: boolean;
  total: number;
}

export function GCashPayment({ onPaymentProofUploaded, isLoading, total }: GCashPaymentProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size too large. Please upload an image smaller than 5MB.");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }

    // Create a preview URL
    const localPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(localPreviewUrl);

    // Upload to Cloudinary
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "payment_proofs");
      
      const response = await fetch("/api/upload/payment-proof", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      onPaymentProofUploaded(data.url);
      toast.success("Payment proof uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload payment proof. Please try again.");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-t border-border pt-4">
        <h3 className="text-base font-medium mb-2">GCash Payment Information</h3>
        <div className="text-sm text-muted-foreground mb-4">
          <p>Please send your payment to the GCash number below:</p>
          <p className="font-semibold mt-1">GCash Number: 09060057323</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
            <DialogTrigger asChild>
              <button className="relative w-48 h-48 border rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                <Image 
                  src="/images/gcash-qr.jpg" 
                  alt="GCash QR Code" 
                  fill
                  className="object-contain"
                />
                <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">Click to enlarge</span>
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>GCash QR Code</DialogTitle>
                <DialogDescription>
                  Scan this code with your GCash app to make payment.
                </DialogDescription>
              </DialogHeader>
              <div className="relative w-full max-w-full aspect-square mx-auto">
                <Image 
                  src="/images/gcash-qr.jpg" 
                  alt="GCash QR Code" 
                  fill
                  priority
                  quality={100}
                  className="object-contain"
                />
              </div>
              <div className="text-center text-sm text-muted-foreground mt-2">
                Hold your phone camera directly to this QR code to scan
              </div>
            </DialogContent>
          </Dialog>
          <div className="space-y-3 flex-1">
            <ol className="list-decimal pl-5 text-sm space-y-2">
              <li>Scan this QR code using your GCash app or send the payment to the number shown above.</li>
              <li>Enter the exact amount: <span className="font-medium">₱{total.toFixed(2)}</span></li>
              <li>Complete the payment in your GCash app.</li>
              <li>Take a screenshot of the payment confirmation.</li>
              <li>Upload the screenshot below as proof of payment.</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="text-base font-medium mb-2">Upload Payment Proof</h3>
        
        <div className="grid gap-4">
          {previewUrl && (
            <Card className="overflow-hidden">
              <CardContent className="p-2">
                <div className="relative w-full h-64">
                  <Image 
                    src={previewUrl}
                    alt="Payment proof preview"
                    fill
                    className="object-contain"
                  />
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="flex-1"
              id="payment-proof"
              disabled={isUploading || isLoading}
            />
            {isUploading && (
              <div className="flex items-center">
                <Icons.spinner className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm">Uploading...</span>
              </div>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            {previewUrl ? 
              "You can upload a different image if needed." : 
              "Please upload a screenshot of your payment confirmation."
            }
          </div>
        </div>
      </div>
    </div>
  );
} 