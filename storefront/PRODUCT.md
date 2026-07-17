# Product

## Register

product

## Platform

web

## Users

Developers and architects evaluating the SimpleStore reference implementation. They are scanning the codebase to understand how microservices, event-driven sagas, and BFF patterns fit together. Secondary: anyone learning modern full-stack patterns with Spring Boot and Next.js.

## Product Purpose

Demonstrate a working end-to-end e-commerce reference architecture: catalog browsing, cart management, checkout saga orchestration, authentication, and order history. Every feature exists to prove the pattern works, not to compete with real stores.

## Positioning

A working reference for Spring Boot microservices with a modern Next.js storefront. The storefront proves the backend patterns are real, not diagrams.

## Brand Personality

Clean, functional, trustworthy. The interface earns credibility through clarity — clear hierarchy, predictable affordances, no decorative excess. Readable code made visible.

## Anti-references

None specified. Default: avoid e-commerce clichés (countdown timers, fake urgency, upsell modals). The storefront should not pretend to be a real store.

## Design Principles

- **Working code over mock data.** Every interaction hits a real backend. The interface proves the system works.
- **Restraint earns trust.** No decorative motion, no marketing copy, no fake social proof. The quality of the implementation is the argument.
- **One component, one responsibility.** Shared components like `StyledLink` and `LinkPill` replace duplicated inline patterns. Write once, reuse everywhere.
- **Tokens over hard-coded values.** Every color, radius, and shadow pulls from the design token system. Consistent by construction.

## Accessibility & Inclusion

WCAG AA as the floor. Semantic HTML, visible focus rings, reduced-motion support, 16px minimum body text, proper form labels and error states.
