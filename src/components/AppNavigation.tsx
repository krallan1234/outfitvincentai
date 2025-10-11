import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Home, LayoutGrid, Sparkles, Users, User, LogOut, LogIn, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const navigationItems = [
  { name: 'Home', href: '/', icon: Home, public: true },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutGrid, public: false },
  { name: 'Outfits', href: '/outfits', icon: Sparkles, public: false },
  { name: 'Planner', href: '/planner', icon: CalendarDays, public: false },
  { name: 'Community', href: '/community', icon: Users, public: false },
  { name: 'Profile', href: '/profile', icon: User, public: false },
];

export const AppNavigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setIsOpen(false);
  };

  const handleNavClick = () => {
    setIsOpen(false);
  };

  const filteredItems = navigationItems.filter(item => 
    item.public || isAuthenticated
  );

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const NavItems = ({ mobile = false, onItemClick }: { mobile?: boolean; onItemClick?: () => void }) => (
    <>
      {filteredItems.map((item) => {
        const IconComponent = item.icon;
        return (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={onItemClick}
            className={({ isActive }) => cn(
              mobile 
                ? "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
                : "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
              isActive && (mobile 
                ? "bg-muted text-foreground" 
                : "bg-muted text-foreground")
            )}
          >
            <IconComponent className={mobile ? "h-5 w-5" : "h-4 w-4"} />
            {item.name}
          </NavLink>
        );
      })}
    </>
  );

  return (
    <>
      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-50 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="p-6 pb-4">
              <SheetTitle className="text-left">Outfit AI</SheetTitle>
            </SheetHeader>
            
            <div className="flex flex-col h-full">
              <nav className="flex-1 px-6 pb-6">
                <div className="space-y-2">
                  <NavItems mobile onItemClick={handleNavClick} />
                </div>
              </nav>

              {/* Mobile Auth Section */}
              <div className="border-t px-6 py-4">
                {isAuthenticated ? (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Signed in as {user?.email}
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleSignOut}
                      className="w-full justify-start"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={() => {
                      navigate('/auth');
                      handleNavClick();
                    }}
                    className="w-full justify-start"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Navigation */}
      <header className="hidden lg:flex sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <NavLink to="/" className="flex items-center gap-2 font-bold text-xl">
              <Sparkles className="h-6 w-6 text-primary" />
              Outfit AI
            </NavLink>
            
            <nav className="flex items-center gap-2">
              <NavItems />
            </nav>
          </div>

          {/* Desktop Auth Section */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {user?.email}
                </span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button onClick={() => navigate('/auth')}>
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};