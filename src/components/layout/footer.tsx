"use client";

import Link from "next/link";
import { Icons } from "@/components/icons";

export function Footer() {
  return (
    <footer className="bg-background border-t">
      <div className="container px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Icons.logo className="h-6 w-6" />
              <span className="text-xl font-semibold text-foreground">Caférayah</span>
            </Link>
            <p className="text-muted-foreground max-w-xs">Where every sip brews a story</p>
          </div>
          <div>
            <h6 className="text-lg font-medium mb-4">Quick Links</h6>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/menu" className="text-muted-foreground hover:text-foreground transition-colors">
                  Menu
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h6 className="text-lg font-medium mb-4">Social Media</h6>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="https://www.facebook.com/profile.php?id=61557095964834" 
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icons.facebook className="h-5 w-5" />
                  Facebook
                </Link>
              </li>
              <li>
                <Link 
                  href="https://www.instagram.com/caferayah2024/" 
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icons.instagram className="h-5 w-5" />
                  Instagram
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h6 className="text-lg font-medium mb-4">Contact</h6>
            <address className="not-italic">
              <p className="text-muted-foreground">464 T. Sulit St., Martinez Del 96</p>
              <p className="text-muted-foreground">Pateros Metro Manila</p>
              <p className="text-muted-foreground mt-2">Phone: +639682293427</p>
            </address>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Caférayah. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
} 