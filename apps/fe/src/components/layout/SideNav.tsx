import { NavLink } from "react-router-dom";
import "./SideNav.css";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/profile", label: "Profile" },
  { to: "/organizations", label: "Organizations" },
];

export function SideNav() {
  return (
    <nav className="side-nav">
      <ul className="side-nav__list">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                isActive
                  ? "side-nav__link side-nav__link--active"
                  : "side-nav__link"
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
