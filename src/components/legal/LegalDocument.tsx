import type { LegalDocumentContent } from "@/lib/constants/legal-content";

type LegalDocumentProps = {
  document: LegalDocumentContent;
};

export function LegalDocument({ document }: LegalDocumentProps) {
  return (
    <article>
      <p className="text-xs font-medium uppercase tracking-wide text-[#67717A]">
        Legal
      </p>
      <h2 className="mt-1 text-xl font-bold text-[#002642]">{document.title}</h2>
      <p className="mt-1 text-xs text-[#67717A]">
        Last updated: {document.updatedAt}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-[#012A3E]">
        {document.intro}
      </p>

      <div className="mt-6 space-y-5">
        {document.sections.map((section) => (
          <section key={section.title}>
            <h3 className="text-sm font-semibold text-[#002642]">
              {section.title}
            </h3>
            <div className="mt-1.5 space-y-2 text-sm leading-relaxed text-[#334155]">
              {section.body}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
