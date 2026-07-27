export const COUNTRY_OPTIONS = [
  "United States of America",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Greece",
  "Turkey",
  "United Arab Emirates",
  "Saudi Arabia",
  "Egypt",
  "Lebanon",
  "Jordan",
  "India",
  "Japan",
  "South Korea",
  "Indonesia",
  "Brazil",
  "Mexico",
  "Other",
] as const;

export const COUNTRY_DIAL_OPTIONS = [
  { country: "United States of America", iso: "US", code: "+1" },
  { country: "United Kingdom", iso: "GB", code: "+44" },
  { country: "Canada", iso: "CA", code: "+1" },
  { country: "Australia", iso: "AU", code: "+61" },
  { country: "Germany", iso: "DE", code: "+49" },
  { country: "France", iso: "FR", code: "+33" },
  { country: "Italy", iso: "IT", code: "+39" },
  { country: "Spain", iso: "ES", code: "+34" },
  { country: "Greece", iso: "GR", code: "+30" },
  { country: "Turkey", iso: "TR", code: "+90" },
  { country: "United Arab Emirates", iso: "AE", code: "+971" },
  { country: "Saudi Arabia", iso: "SA", code: "+966" },
  { country: "Egypt", iso: "EG", code: "+20" },
  { country: "Lebanon", iso: "LB", code: "+961" },
  { country: "Jordan", iso: "JO", code: "+962" },
  { country: "India", iso: "IN", code: "+91" },
  { country: "Japan", iso: "JP", code: "+81" },
  { country: "South Korea", iso: "KR", code: "+82" },
  { country: "Indonesia", iso: "ID", code: "+62" },
  { country: "Brazil", iso: "BR", code: "+55" },
  { country: "Mexico", iso: "MX", code: "+52" },
  { country: "Other", iso: "OT", code: "+000" },
] as const;

export type CountryDialOption = (typeof COUNTRY_DIAL_OPTIONS)[number];

export function dialCodeForCountry(country: string) {
  return (
    COUNTRY_DIAL_OPTIONS.find((option) => option.country === country)?.code ??
    "+1"
  );
}
