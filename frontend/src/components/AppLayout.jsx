import { Outlet } from 'react-router-dom';
import { SlDocs, SlHome, SlLocationPin, SlSettings } from 'react-icons/sl';
import Navbar from './Navbar';

const roleNavItems = {
  citizen: [
    { to: '/dashboard', label: 'Dashboard', icon: SlHome },
    { to: '/complaints', label: 'Complaints', icon: SlDocs },
    { to: '/track', label: 'Track', icon: SlLocationPin }
  ],
  officer: [
    { to: '/dashboard', label: 'Dashboard', icon: SlHome },
    { to: '/complaints', label: 'Complaints', icon: SlDocs },
    { to: '/track', label: 'Track', icon: SlLocationPin }
  ],
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: SlHome },
    { to: '/complaints', label: 'Complaints', icon: SlDocs },
    { to: '/track', label: 'Track', icon: SlLocationPin },
    { to: '/admin', label: 'Admin', icon: SlSettings }
  ]
};

export default function AppLayout({ user, onLogout }) {
  const navItems = roleNavItems[user?.role] || roleNavItems.citizen;

  return (
    <div className="app-shell relative min-h-screen overflow-hidden">

      {/* ✅ Background Image */}
      <div
        className="absolute inset-0 -z-20 backdrop-blur-xl"
        style={{
          backgroundImage: "url('/backgrounddta.jpg')",
          backgroundPosition: "center 65%",
          backgroundAttachment: "fixed",
          backgroundSize: "180%",
        }}
      />

      {/* ✅ Blur + Overlay */}
      <div className="absolute inset-0 -z-10 bg-black/10 " />

      {/* UI */}
      <div className="relative min-h-screen px-4 py-5 md:px-6 md:py-6">
        <div className="w-full min-h-[calc(100vh-2.5rem)] overflow-x-hidden  shadow-[0_20px_50px_rgba(15,23,42,0.3)] backdrop-blur-[20px]">
          
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
            <div className="flex items-center gap-3">
              <img src="/sevasetu-logo.png" alt="Sevasetu logo" className="h-9 w-auto rounded-lg border border-white/20 bg-white p-1" />
              <div>
                <h1 className="font-display text-xl font-bold text-white">Sevasetu</h1>
                <p className="text-xs text-white/70">
                  {user?.name} ({user?.role})
                </p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="btn-secondary hover:-translate-y-[1px] active:scale-95 transition-all duration-200"
            >
              Logout
            </button>
          </header>

          <Navbar items={navItems} />

          <div className="p-4 md:p-6">
            <main className="space-y-4 text-slate-100">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
