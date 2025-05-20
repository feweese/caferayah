import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminLayout } from "@/components/layout/admin-layout";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NewUserForm } from "@/components/admin/user-form";

export default async function NewUserPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Only admin and super_admin can create users
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  // Super admin can create any role, admin can only create customers
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  return (
    <AdminLayout>
      <div className="container px-0">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Add New User</h1>
            <p className="text-muted-foreground mt-1">
              {isSuperAdmin ? "Create a new admin or customer user" : "Create a new customer user"}
            </p>
          </div>
          <div>
            <Link href="/admin/users">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <NewUserForm isSuperAdmin={isSuperAdmin} />
        </div>
      </div>
    </AdminLayout>
  );
} 