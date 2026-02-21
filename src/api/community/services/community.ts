/**
 * community service
 */

import { factories } from "@strapi/strapi";
import slugify from "slugify";

const MAX_SLUG_LENGTH = 100;

/**
 * Generates a unique slug from the title
 */
async function generateUniqueSlug(
  strapi: any,
  title: string,
  communityId?: string,
): Promise<string> {
  if (!title || typeof title !== "string") {
    throw new Error("Title is required to generate slug");
  }

  // Generate base slug from title
  let baseSlug = slugify(title, {
    lower: true,
    strict: true,
    trim: true,
  });

  // Truncate to max length
  if (baseSlug.length > MAX_SLUG_LENGTH) {
    baseSlug = baseSlug.substring(0, MAX_SLUG_LENGTH);
    // Remove trailing hyphen if truncation caused it
    baseSlug = baseSlug.replace(/-+$/, "");
  }

  let slug = baseSlug;
  let counter = 2;

  // Check for uniqueness and add suffix if needed
  while (true) {
    const filters: any = { slug: { $eq: slug } };

    // Exclude current community when updating
    if (communityId) {
      filters.documentId = { $ne: communityId };
    }

    const existingCommunities = await strapi.entityService.findMany(
      "api::community.community",
      {
        filters,
        limit: 1,
      },
    );

    if (!existingCommunities || existingCommunities.length === 0) {
      break;
    }

    // Slug exists, try with counter suffix
    const suffix = `-${counter}`;
    const maxBaseLength = MAX_SLUG_LENGTH - suffix.length;
    slug = `${baseSlug.substring(0, maxBaseLength)}${suffix}`;
    counter++;
  }

  return slug;
}

export default factories.createCoreService(
  "api::community.community",
  ({ strapi }) => ({
    async create(params: any) {
      // Generate slug before create if not provided
      if (params.data.title && !params.data.slug) {
        params.data.slug = await generateUniqueSlug(strapi, params.data.title);
      }

      return super.create(params);
    },

    async update(documentId: string, params: any) {
      // Regenerate slug if title changed and slug not explicitly set
      if (params.data.title && !params.data.slug) {
        params.data.slug = await generateUniqueSlug(
          strapi,
          params.data.title,
          documentId,
        );
      }

      return super.update(documentId, params);
    },

    async delete(documentId: string, params: any) {
      return super.update(documentId, {
        ...params,
        data: {
          ...params?.data,
          deleted_at: new Date(),
        },
      });
    },
  }),
);
