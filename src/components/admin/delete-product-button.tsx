"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Trash, AlertTriangle } from "lucide-react";

interface DeleteProductButtonProps {
  productId: string;
  productName: string;
}

export function DeleteProductButton({ productId, productName }: DeleteProductButtonProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      console.log(`Deleting product with ID: ${productId}`);
      
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      console.log(`Delete response status: ${response.status}`);
      
      // Check if response is OK
      if (!response.ok) {
        // For HTTP 400 errors related to products in orders, show a specific message
        if (response.status === 400) {
          setDeleteError("This product is used in orders and cannot be deleted.");
          return;
        }
        
        // For other errors, try to get details from the response
        let errorMessage = `Failed to delete product (Status: ${response.status})`;
        
        try {
          // Try to parse the response as JSON
          const text = await response.text();
          console.log('Response text:', text);
          
          if (text) {
            try {
              const errorData = JSON.parse(text);
              console.log('Parsed error data:', errorData);
              
              if (errorData.error) {
                errorMessage = errorData.error;
              }
              
              if (errorData.details) {
                setDeleteError(errorData.details);
                return;
              }
            } catch (parseErr) {
              console.error('Error parsing JSON:', parseErr);
            }
          }
        } catch (textErr) {
          console.error('Error getting response text:', textErr);
        }
        
        throw new Error(errorMessage);
      }
      
      toast("Product deleted", {
        description: `${productName} has been deleted successfully.`,
      });
      
      // Close the dialog and navigate back to the products list
      setIsDialogOpen(false);
      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast("Error", {
        description: error instanceof Error ? error.message : "Failed to delete product",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setIsDialogOpen(true)}
      >
        <Trash className="mr-2 h-4 w-4" />
        Delete Product
      </Button>
      
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-bold">{productName}</span> from your product catalog. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {deleteError && (
            <div className="flex items-start gap-2 p-3 text-sm border rounded-md bg-amber-50 border-amber-200 text-amber-800">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />
              <div>
                <div className="font-medium">Unable to delete product</div>
                <div>{deleteError}</div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    router.push(`/admin/products/${productId}`);
                  }}
                >
                  Edit Product
                </Button>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            {!deleteError && (
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Product"
                )}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 