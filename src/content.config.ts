import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    description: z.string().default(""),
    tags: z.array(z.string()).default([]),
    series: z.string().optional(),
    seriesPrefix: z.string().default(""),
    episode: z.number().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
