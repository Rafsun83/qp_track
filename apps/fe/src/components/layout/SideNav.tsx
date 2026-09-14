import { NavLink } from "react-router-dom";
import "./SideNav.css";

const NAV_ITEMS = [
  { to: "/users", label: "Users" },
  { to: "/api-keys", label: "API Key" },
  { to: "/webhook-test", label: "Webhook Test" },
  { to: "/survey-responses", label: "Survey Response" },
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
                isActive ? "side-nav__link side-nav__link--active" : "side-nav__link"
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
