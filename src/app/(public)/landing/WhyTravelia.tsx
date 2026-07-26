import { CalendarCheckIcon, ChecklistIcon, WalletIcon } from "./icons";

const REASONS = [
  {
    icon: ChecklistIcon,
    title: "Smart itineraries",
    description: "Custom day-by-day plans built around your interests.",
  },
  {
    icon: CalendarCheckIcon,
    title: "Trusted bookings",
    description: "Handpicked stays and experiences from trusted partners.",
  },
  {
    icon: WalletIcon,
    title: "Budget & checklist tools",
    description: "Stay on budget and never miss a thing with our helpful tools.",
  },
];

export function WhyTravelia() {
  return (
    <section className="lp-section lp-section--white">
      <div className="lp-wrap">
        <h2 className="lp-title lp-title--center">Why Travelia?</h2>
        <div className="lp-why">
          {REASONS.map((reason) => (
            <div key={reason.title} className="lp-why__item">
              <reason.icon className="lp-why__icon" />
              <div>
                <h3>{reason.title}</h3>
                <p>{reason.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
