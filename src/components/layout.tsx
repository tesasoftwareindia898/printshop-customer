import { ReactNode } from "react";
import { Link } from "wouter";
import { Printer } from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary hover:opacity-90 transition-opacity" data-testid="link-home">
            <Printer className="w-6 h-6" />
            <span>PrintShop</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-admin">
              Admin
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <footer className="border-t py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Neighborhood PrintShop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
