/**
 * speaker service
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreService(
  "api::speaker.speaker",
  ({ strapi }) => ({
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
