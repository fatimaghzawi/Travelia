function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-[#012A3E] sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#67717A] sm:text-base">
        {description}
      </p>
    </div>
  );
}

export default PlaceholderPage;
