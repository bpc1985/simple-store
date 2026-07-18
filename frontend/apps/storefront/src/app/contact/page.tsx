"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/page-header";
import { Button } from "@simplestore/ui";
import { Input } from "@simplestore/ui";
import { Card, CardContent } from "@simplestore/ui";
import { Mail, Phone, Clock, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

const CONTACT_INFO = [
  { icon: Mail, label: "Email", value: "support@simplestore.com", href: "mailto:support@simplestore.com" },
  { icon: Phone, label: "Phone", value: "(555) 123-4567", href: "tel:+15551234567" },
  { icon: Clock, label: "Hours", value: "Mon-Fri, 9am-6pm EST" },
];

const FAQ_LINKS = [
  { label: "Shipping Information", href: "/faq#shipping" },
  { label: "Returns & Refunds", href: "/faq#returns" },
  { label: "Order Tracking", href: "/faq#orders" },
];

export default function ContactPage() {
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // ponytail: contact form is demo only — show success toast
    setTimeout(() => {
      setSending(false);
      toast.success("Message sent! We'll reply within 24 hours.");
      (e.target as HTMLFormElement).reset();
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Contact Us"
        description="Have a question? We'd love to hear from you. Send us a message and we'll respond as soon as possible."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />

      <div className="grid md:grid-cols-5 gap-6">
        {/* Form */}
        <Card className="md:col-span-3">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="text-sm font-medium">Name</label>
                <Input id="name" required className="mt-1 h-11" />
              </div>
              <div>
                <label htmlFor="contact-email" className="text-sm font-medium">Email</label>
                <Input id="contact-email" type="email" required className="mt-1 h-11" />
              </div>
              <div>
                <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                <Input id="subject" required className="mt-1 h-11" />
              </div>
              <div>
                <label htmlFor="message" className="text-sm font-medium">Message</label>
                <textarea
                  id="message"
                  required
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 resize-none"
                />
              </div>
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="size-4" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="size-4" />
                Get in Touch
              </h3>
              {CONTACT_INFO.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-3">
                    <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      {item.href ? (
                        <a href={item.href} className="text-sm font-medium hover:text-primary transition-colors">
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-sm font-medium">{item.value}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3">Quick Answers</h3>
              <div className="space-y-1">
                {FAQ_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="block text-sm text-muted-foreground hover:text-primary transition-colors py-1"
                  >
                    {link.label} →
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
