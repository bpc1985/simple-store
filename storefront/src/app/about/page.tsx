import PageHeader from "@/components/ui/page-header";
import StyledLink from "@/components/ui/styled-link";
import { Shield, Truck, Smile } from "lucide-react";

const VALUES = [
  {
    icon: Shield,
    title: "Quality First",
    description: "Every product is selected for durability and craftsmanship. We stand behind everything we sell.",
  },
  {
    icon: Truck,
    title: "Fair Prices",
    description: "No markups. No gimmicks. Just honest pricing on quality goods, with free shipping over $50.",
  },
  {
    icon: Smile,
    title: "Customer Focus",
    description: "Real support from real people. 30-day returns, no questions asked. We're here to help.",
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="About SimpleStore"
        description="Quality goods, fairly priced. We believe shopping should be simple, honest, and enjoyable."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
      />

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold">Our Story</h2>
          <p className="text-muted-foreground leading-relaxed">
            SimpleStore was built as a reference architecture for modern e-commerce
            microservices — but the principles behind it are real. We believe that great
            shopping experiences come from clean, functional design and reliable
            technology.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Every interaction on this store hits a real backend. The catalog is live,
            the cart persists, the checkout saga orchestrates real service communication.
            What you see is what runs — no mock data, no shortcuts.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">Our Values</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start size-12 rounded-xl bg-primary/10 text-primary mb-3">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="font-semibold mb-1">{v.title}</h3>
                  <p className="text-sm text-muted-foreground">{v.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="text-center py-8">
          <h2 className="text-2xl font-semibold mb-3">Ready to explore?</h2>
          <p className="text-muted-foreground mb-4">
            Browse our catalog and see what we have to offer.
          </p>
          <StyledLink href="/products">Browse Products</StyledLink>
        </section>
      </div>
    </div>
  );
}
