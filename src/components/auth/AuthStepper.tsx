type Step = {
  id: number;
  label: string;
};

type AuthStepperProps = {
  steps: Step[];
  current: number;
  hint?: string;
};

/** Matches Travelia register mockup: teal filled active/done, gray upcoming. */
export function AuthStepper({ steps, current, hint }: AuthStepperProps) {
  return (
    <div className="mb-4 sm:mb-5">
      <ol className="flex items-start justify-between">
        {steps.map((step, index) => {
          const reached = step.id <= current;
          const lineBeforeActive = step.id <= current;
          const lineAfterDone = step.id < current;

          return (
            <li key={step.id} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {index > 0 ? (
                  <span
                    className={`h-[2px] flex-1 ${lineBeforeActive ? "bg-[#127E83]" : "bg-[#D1D5DB]"}`}
                    aria-hidden
                  />
                ) : (
                  <span className="flex-1" aria-hidden />
                )}
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    reached
                      ? "bg-[#127E83] text-white"
                      : "border-2 border-[#D1D5DB] bg-white text-[#9CA3AF]"
                  }`}
                >
                  {step.id}
                </span>
                {index < steps.length - 1 ? (
                  <span
                    className={`h-[2px] flex-1 ${lineAfterDone ? "bg-[#127E83]" : "bg-[#D1D5DB]"}`}
                    aria-hidden
                  />
                ) : (
                  <span className="flex-1" aria-hidden />
                )}
              </div>
              <span
                className={`mt-2 text-[11px] font-medium sm:text-xs ${
                  reached ? "text-[#127E83]" : "text-[#9CA3AF]"
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
      {hint ? (
        <p className="mt-2 text-center text-xs text-[#67717A]">{hint}</p>
      ) : null}
    </div>
  );
}
