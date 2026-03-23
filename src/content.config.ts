import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const navItemSchema = z.object({
  label: z.string(),
  href: z.string(),
});

const featureSchema = z.object({
  title: z.string(),
  text: z.string(),
});

const bookingStepSchema = z.object({
  number: z.string(),
  title: z.string(),
  text: z.string(),
});

const settings = defineCollection({
  loader: glob({ pattern: "**/*.yml", base: "./src/content/settings" }),
  schema: z.object({
    meta: z.object({
      title: z.string(),
      description: z.string(),
    }),
    branding: z.object({
      name: z.string(),
      monogram: z.string(),
      tagline: z.string(),
    }),
    contact: z.object({
      instagramHandle: z.string(),
      instagramUrl: z.string().url(),
    }),
    navigation: z.array(navItemSchema),
    hero: z.object({
      eyebrow: z.string(),
      title: z.string(),
      lead: z.string(),
      primaryCtaLabel: z.string(),
      secondaryCtaLabel: z.string(),
      secondaryCtaHref: z.string(),
      highlights: z.array(z.string()),
      noteEyebrow: z.string(),
      noteTitle: z.string(),
      primaryImage: z.string(),
      secondaryImage: z.string(),
    }),
    intro: z.object({
      eyebrow: z.string(),
      title: z.string(),
      text: z.string(),
      features: z.array(featureSchema),
    }),
    booking: z.object({
      eyebrow: z.string(),
      title: z.string(),
      text: z.string(),
      steps: z.array(bookingStepSchema),
    }),
  }),
});

const pricingItemSchema = z.object({
  label: z.string(),
  detail: z.string().optional(),
  price: z.string(),
});

const pricing = defineCollection({
  loader: glob({ pattern: "**/*.yml", base: "./src/content/pricing" }),
  schema: z.object({
    section: z.object({
      eyebrow: z.string(),
      title: z.string(),
      description: z.string(),
    }),
    sidebar: z.object({
      title: z.string(),
      text: z.string(),
      checklist: z.array(z.string()),
      ctaLabel: z.string(),
    }),
    categories: z.array(
      z.object({
        order: z.number().int(),
        title: z.string(),
        wide: z.boolean().default(false),
        items: z.array(pricingItemSchema),
      })
    ),
  }),
});

const gallery = defineCollection({
  loader: glob({ pattern: "**/*.yml", base: "./src/content/gallery" }),
  schema: z.object({
    section: z.object({
      eyebrow: z.string(),
      title: z.string(),
      description: z.string(),
    }),
    items: z.array(
      z.object({
        order: z.number().int(),
        label: z.string(),
        alt: z.string(),
        image: z.string(),
      })
    ),
  }),
});

export const collections = {
  gallery,
  pricing,
  settings,
};
