'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Button from '@/components/ui/Button';

interface DashboardNavProps {
  onSignOut: () => void;
  userEmail?: string;
}

export default function DashboardNav({ onSignOut, userEmail }: DashboardNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: HomeIcon },
  ];

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-blue-400">📈</span>
            <span className="text-lg font-semibold text-gray-100">OptiTrack HK</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-blue-600/20 text-blue-400' 
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}
                  `}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {userEmail && (
              <span className="hidden sm:block text-sm text-gray-400 truncate max-w-[150px]">
                {userEmail}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={onSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="md:hidden border-t border-gray-800 px-2 py-2 flex gap-1 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap
                ${isActive 
                  ? 'bg-blue-600/20 text-blue-400' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}
              `}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Icons
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
