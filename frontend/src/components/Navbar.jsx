import { NavLink } from 'react-router-dom';

export default function Navbar({ items }) {
  return (
    <nav className="border-b border-white/10 px-6 py-3">
      <ul className="flex flex-wrap items-center gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-[#001219] text-white shadow-[0_10px_20px_rgba(0,87,255,0.24)]'
                    : 'border border-white/10 bg-white/[0.04] text-white/85 hover:-translate-y-[1px] hover:bg-white/[0.08]'
                } active:scale-95`
              }
            >
              {Icon ? <Icon className="text-xs" /> : null}
              {item.label}
            </NavLink>
          </li>
          );
        })}
      </ul>
    </nav>
  );
}
