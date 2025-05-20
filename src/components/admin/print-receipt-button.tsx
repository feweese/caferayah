"use client";

import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export function PrintReceiptButton() {
  return (
    <Button 
      variant="outline" 
      onClick={() => window.print()}
    >
      <FileText className="h-4 w-4 mr-2" />
      Print Receipt
    </Button>
  );
} 