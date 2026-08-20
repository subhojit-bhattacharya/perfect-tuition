import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "zod";

/**
 * The Consent Notice, in both languages.
 *
 * These same files are read by the API at boot, which denormalises the verbatim
 * text into every Enquiry row — so the notice a parent saw and the notice we can
 * later prove they agreed to are guaranteed to be the same words.
 *
 * The version is a plain integer in the filename, never a date. Bump it on any
 * wording change, however small, by adding `v{N}.en.md` *and* `v{N}.bn.md`
 * together — both languages move as one, or the Consent Record starts pointing
 * at text that was never shown.
 */
const consent = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/consent" }),
  schema: z.object({
    version: z.number(),
    locale: z.enum(["en", "bn"]),
    title: z.string(),
    agree: z.string(),
  }),
});

export const collections = { consent };
