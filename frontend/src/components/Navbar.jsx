import { Link, NavLink } from "react-router-dom";

const links = [
  { to: "/setup", label: "Setup Profile & Group" },
  { to: "/panic-check", label: "Run Panic Check" }
];

export default function Navbar() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <Link to="/" className="block transition hover:opacity-80">
          <p className="font-display text-4xl leading-none text-stone-900">Walang Pasok Panic Agent</p>
          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">
            Landing page and control center
          </p>
        </Link>

        <nav className="flex flex-wrap gap-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-xl px-5 py-3 text-sm font-bold transition ${
                  isActive
                    ? "bg-stone-900 text-white"
                    : "bg-lime-200 text-stone-900 hover:bg-lime-300"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
