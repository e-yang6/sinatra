interface Feature {
  id: string;
  title: string;
  description: string;
  image: string;
}

interface Feature72Props {
  heading?: string;
  description?: string;
  linkUrl?: string;
  linkText?: string;
  features?: Feature[];
}

export const Feature72 = ({
  heading = "Powerful Features",
  description = "Discover the powerful features that make our platform stand out from the rest. Built with the latest technology and designed for maximum productivity.",
  linkUrl = "#",
  linkText = "Learn more",
  features = [
    {
      id: "feature-1",
      title: "Modern Design",
      description:
        "Clean and intuitive interface built with the latest design principles. Optimized for the best user experience.",
      image: "https://www.shadcnblocks.com/images/block/placeholder-1.svg",
    },
    {
      id: "feature-2",
      title: "Responsive Layout",
      description:
        "Fully responsive design that works seamlessly across all devices and screen sizes. Perfect for any platform.",
      image: "https://www.shadcnblocks.com/images/block/placeholder-2.svg",
    },
    {
      id: "feature-3",
      title: "Easy Integration",
      description:
        "Simple integration process with comprehensive documentation and dedicated support team.",
      image: "https://www.shadcnblocks.com/images/block/placeholder-3.svg",
    },
    {
      id: "feature-4",
      title: "Advanced Analytics",
      description:
        "Powerful analytics tools to help you understand your users and make data-driven decisions.",
      image: "https://www.shadcnblocks.com/images/block/placeholder-4.svg",
    },
  ],
}: Feature72Props) => {
  return (
    <section className="pt-24 pb-32">
      <div className="mx-auto max-w-7xl px-6 flex flex-col gap-10">
        <div className="lg:max-w-2xl">
          <h2 className="mb-3 text-xl font-light text-slate-900 md:mb-4 md:text-4xl lg:mb-6 tracking-tighter">
            {heading}
          </h2>
          <p className="text-slate-700 lg:text-lg">{description}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3 lg:gap-6">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="flex flex-col overflow-clip rounded-xl border border-slate-300 bg-slate-50 hover:border-[#6993cf]/30 transition-all duration-300"
            >
              <div>
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="aspect-[16/9] h-full w-full object-cover object-center"
                />
              </div>
              <div className="px-4 py-6 md:px-6 md:py-8 lg:px-6 lg:py-8">
                <h3 className="mb-2 text-base font-light text-slate-900 md:mb-3 md:text-xl lg:mb-4 tracking-tighter">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-700 md:text-base">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
