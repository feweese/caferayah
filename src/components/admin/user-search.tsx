"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Users, Mail, BadgeCheck, CalendarClock, Award, Pencil, ShoppingCart } from "lucide-react";
import { UserRole } from "@prisma/client";

// User interface matching what we get from the server
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  image: string | null;
  points?: { points: number } | null;
}

interface UserSearchProps {
  users: User[];
  isSuperAdmin: boolean;
}

export function UserSearch({ users, isSuperAdmin }: UserSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>(users);

  // Update filtered users whenever search term or users change
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const lowercasedSearch = searchTerm.toLowerCase();
    const results = users.filter(
      (user) =>
        user.name.toLowerCase().includes(lowercasedSearch) ||
        user.email.toLowerCase().includes(lowercasedSearch)
    );
    
    setFilteredUsers(results);
  }, [searchTerm, users]);

  return (
    <>
      {/* Search and filters */}
      <div className="bg-card border rounded-lg p-4 space-y-4 mb-6">
        <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center">
          <Search className="h-4 w-4 mr-2" />
          User Filters
        </h3>
        
        <div className="flex gap-4 flex-wrap">
          <div className="space-y-2 flex-1 min-w-[200px]">
            <div className="text-xs font-medium">Search</div>
            <Input
              id="search"
              placeholder="Search by name or email..."
              className="max-w-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="text-xs text-muted-foreground mt-1">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
        {filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[250px]">
                    <div className="flex items-center text-xs font-medium text-muted-foreground">
                      <Users className="h-3.5 w-3.5 mr-2" />
                      User
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center text-xs font-medium text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 mr-2" />
                      Email
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center text-xs font-medium text-muted-foreground">
                      <BadgeCheck className="h-3.5 w-3.5 mr-2" />
                      Role
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center text-xs font-medium text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5 mr-2" />
                      Joined
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center text-xs font-medium text-muted-foreground">
                      <Award className="h-3.5 w-3.5 mr-2" />
                      Loyalty Points
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const initials = user.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase();

                  return (
                    <TableRow key={user.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border shadow-sm">
                            <AvatarImage src={user.image || ""} alt={user.name} />
                            <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <RoleBadge role={user.role} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(user.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Award className="h-4 w-4 text-amber-500 mr-1.5" fill="currentColor" />
                          <span className="font-medium">{user.points?.points || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                          {/* Only allow editing if super admin or if user is a customer */}
                          {(isSuperAdmin || user.role === "CUSTOMER") && (
                            <Link href={`/admin/users/${user.id}`}>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                              >
                                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                Edit
                              </Button>
                            </Link>
                          )}
                          <Link href={`/admin/orders?userId=${user.id}`}>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="hover:bg-green-50 hover:text-green-600 transition-colors"
                            >
                              <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                              Orders
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No users found</p>
            <div className="mt-4">
              <Link href="/admin/users/new">
                <Button>Add New User</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  let bgColor = "";
  let textColor = "";

  switch (role) {
    case "SUPER_ADMIN":
      bgColor = "bg-red-100";
      textColor = "text-red-800";
      break;
    case "ADMIN":
      bgColor = "bg-blue-100";
      textColor = "text-blue-800";
      break;
    case "CUSTOMER":
    default:
      bgColor = "bg-green-100";
      textColor = "text-green-800";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
    >
      {role.charAt(0) + role.slice(1).toLowerCase().replace("_", " ")}
    </span>
  );
} 