import { MapPinIcon, PassportIcon, SuitcaseIcon } from "./icons";

const STEPS = [
  {
    number: 1,
    icon: MapPinIcon,
    title: "Discover destinations",
    description: "Explore handpicked places and find inspiration for your next trip.",
  },
  {
    number: 2,
    icon: PassportIcon,
    title: "Verify passport once",
    description: "Save time by verifying your passport a single time, securely.",
  },
  {
    number: 3,
    icon: SuitcaseIcon,
    title: "Book & go",
    description: "Book stays and experiences, then get ready to travel.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="lp-section lp-section--muted">
      <div className="lp-wrap">
        <h2 className="lp-title lp-title--center">How it works</h2>
        <div className="lp-steps">
          {STEPS.map((step, index) => (
            <div key={step.number} className="lp-step">
              {index > 0 ? <span className="lp-step__line" aria-hidden /> : null}
              <span className="lp-step__icon">
                <step.icon className="lp-step__svg" />
              </span>
              <div className="lp-step__heading">
                <span className="lp-step__badge">{step.number}</span>
                <h3>{step.title}</h3>
              </div>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
