import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { NewUserForm } from "@/components/admin/user-form";
import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { ArrowLeft, User, UserCog } from "lucide-react";

export default async function EditUserPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Only admins can access this page
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  // Remove the awaiting of params
  const userId = params.id;
  
  // Get user details
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    redirect("/admin/users");
  }

  // Regular admins can only edit customer users
  if (session.user.role === "ADMIN" && user.role !== "CUSTOMER") {
    redirect("/admin/users");
  }

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  return (
    <AdminLayout>
      <div className="container px-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div>
            <div className="flex items-center mb-1">
              <Link href="/admin/users" className="mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-3xl font-bold tracking-tight flex items-center">
                {user.role === "CUSTOMER" ? (
                  <User className="mr-3 h-8 w-8 text-primary" />
                ) : (
                  <UserCog className="mr-3 h-8 w-8 text-primary" />
                )}
                Edit {user.role === "CUSTOMER" ? "Customer" : user.role === "ADMIN" ? "Admin" : "Super Admin"}
              </h1>
            </div>
            <p className="text-muted-foreground mt-1 ml-6">
              Update information for {user.name}
            </p>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            <Link href="/admin/users">
              <Button variant="outline" className="shadow-sm transition-all hover:shadow">Cancel</Button>
            </Link>
            {(user.role === "CUSTOMER" || (isSuperAdmin && user.role === "ADMIN")) && (
              <DeleteUserButton userId={user.id} userName={user.name} />
            )}
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <NewUserForm 
            isSuperAdmin={isSuperAdmin} 
            user={{
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              phoneNumber: user.phoneNumber || undefined,
              address: user.address || undefined,
            }}
          />
        </div>
      </div>
    </AdminLayout>
  );
} 