// import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: any }) {
    // Set the reset password URL programmatically if not set
    const pluginStore = strapi.store({
      type: "plugin",
      name: "users-permissions",
    });

    const settings = await pluginStore.get({ key: "email" });
    const publicUrl = process.env.PUBLIC_URL || "http://localhost:1340";

    if (
      settings.reset_password &&
      !settings.reset_password.options.response_url
    ) {
      strapi.log.info("Setting default reset password URL...");
      settings.reset_password.options.response_url = `${publicUrl}/admin/auth/reset-password`;
      await pluginStore.set({ key: "email", value: settings });
    }
  },
};
