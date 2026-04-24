import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Code2, LogOut, Plus, User as UserIcon } from "lucide-react";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Code2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-gradient">DevHub</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/services/new">
                  <Plus className="ml-1 h-4 w-4" />
                  خدمة جديدة
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon">
                <Link to="/profile" aria-label="الملف الشخصي">
                  <UserIcon className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
                aria-label="تسجيل الخروج"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button asChild className="bg-gradient-primary shadow-glow">
              <Link to="/auth">تسجيل الدخول</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
