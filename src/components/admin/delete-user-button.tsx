"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteUserButtonProps {
  userId: string;
  userName: string;
}

export function DeleteUserButton({ userId, userName }: DeleteUserButtonProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle error locally without throwing
        setError(data.message || data.error || "Failed to delete user");
        toast.error("Error deleting user", {
          description: data.message || data.error || "Failed to delete user",
        });
        setIsDeleting(false);
        return; // Return early without throwing
      }

      toast.success("User deleted", {
        description: `${userName} has been deleted successfully.`,
      });

      // Close dialog first, then redirect
      setShowDeleteDialog(false);
      
      // Small delay to ensure the dialog closes smoothly before navigation
      setTimeout(() => {
        router.push("/admin/users");
        router.refresh();
      }, 300);
      
    } catch (error) {
      // This should now only catch network errors, not API errors
      console.error("Network error when deleting user:", error);
      setError("Network error. Please check your connection and try again.");
      toast.error("Network error", {
        description: "Please check your connection and try again."
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Button 
        variant="destructive" 
        onClick={() => setShowDeleteDialog(true)}
        disabled={isDeleting}
      >
        {isDeleting ? "Deleting..." : "Delete User"}
      </Button>

      <Dialog open={showDeleteDialog} onOpenChange={(open) => {
        if (!isDeleting) setShowDeleteDialog(open);
        if (!open) setError(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This will permanently delete the user &quot;{userName}&quot; and all their associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="bg-red-50 text-red-800 p-3 rounded-md flex items-start gap-2 text-sm">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Failed to delete user</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 