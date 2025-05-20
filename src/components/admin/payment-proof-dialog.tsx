"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PaymentProofDialogProps {
  imageUrl: string;
}

export function PaymentProofDialog({ imageUrl }: PaymentProofDialogProps) {
  const [open, setOpen] = useState(false);
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="relative h-80 w-full cursor-pointer hover:opacity-95 transition-opacity">
          <div className="block relative h-full w-full">
            <Image 
              src={imageUrl} 
              alt="Payment proof" 
              fill
              className="object-contain"
            />
            <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <span className="bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                Click to enlarge
              </span>
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Payment Proof</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-[600px] mx-auto">
          <Image 
            src={imageUrl} 
            alt="Payment proof" 
            fill
            className="object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
} 