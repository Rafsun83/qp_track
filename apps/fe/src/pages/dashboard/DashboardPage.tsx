import { Link } from "react-router-dom";
import "./DashboardPage.css";

const FEATURE_CARDS = [
  {
    to: "/profile",
    icon: "\u{1F464}",
    title: "Profile",
    description: "View your account details - name, username, email and login activity.",
  },
  {
    to: "/organizations",
    icon: "\u{1F3E2}",
    title: "Organizations",
    description: "Create organizations, add members and manage who belongs to each one.",
  },
];

export function DashboardPage() {
  return (
    <div className="dashboard-page">
      <h1 className="dashboard-page__title">Dashboard</h1>
      <p className="dashboard-page__subtitle">
        QP Track keeps track of your organizations and the people in them.
      </p>

      <div className="dashboard-cards">
        {FEATURE_CARDS.map((card) => (
          <Link key={card.to} to={card.to} className="dashboard-card">
            <span className="dashboard-card__icon" aria-hidden="true">
              {card.icon}
            </span>
            <span className="dashboard-card__title">{card.title}</span>
            <span className="dashboard-card__description">{card.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
