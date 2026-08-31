'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calculator } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/calculate', icon: Calculator, label: 'คำนวณ' },
];

export default function NavigationBar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-50">
      {navItems.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 w-full py-2 rounded-xl transition-colors ${
              isActive ? 'text-blue-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
            }`}
          >
            <div className={`${isActive ? 'bg-blue-100 p-1.5 rounded-lg' : 'p-1.5'}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
