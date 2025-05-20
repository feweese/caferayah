import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { UserSearch } from "@/components/admin/user-search";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Only Super Admins can view all users including admins
  // Regular admins can only view customers
  if (session.user.role === "SUPER_ADMIN") {
    var users = await db.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        points: true,
      },
    });
  } else if (session.user.role === "ADMIN") {
    var users = await db.user.findMany({
      where: {
        role: "CUSTOMER",
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        points: true,
      },
    });
  } else {
    redirect("/");
  }

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  return (
    <AdminLayout>
      <div className="container px-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
              <Users className="mr-3 h-8 w-8 text-primary" />
              Users
            </h1>
            <p className="text-muted-foreground mt-1">
              {isSuperAdmin ? "Manage all users and their permissions" : "Manage customer accounts"}
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Link href="/admin/users/new">
              <Button className="shadow-sm transition-all hover:shadow">
                {isSuperAdmin ? "Add New User" : "Add New Customer"}
              </Button>
            </Link>
          </div>
        </div>

        {/* Use the client component for search and display */}
        <UserSearch users={users} isSuperAdmin={isSuperAdmin} />
      </div>
    </AdminLayout>
  );
} 