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
    // Set the reset password URL programmatically
    const pluginStore = strapi.store({
      type: "plugin",
      name: "users-permissions",
    });

    const settings = await pluginStore.get({ key: "email" });
    const publicUrl =
      process.env.PUBLIC_URL ||
      "https://hubcommunity-manager.8020digital.com.br";

    if (settings && settings.reset_password) {
      // 1. Force update the response_url
      const newUrl = `${publicUrl}/admin/auth/reset-password`;
      settings.reset_password.options.response_url = newUrl;

      // 2. Fix the message template if it has a redundant ?code= parameter
      // Strapi automatically appends the code to the URL
      let message = settings.reset_password.options.message;
      if (message.includes("<%= URL %>?code=")) {
        strapi.log.info(
          "Cleaning up redundant ?code= parameter from reset password template...",
        );
        settings.reset_password.options.message = message.replace(
          "<%= URL %>?code=<%= TOKEN %>",
          "<%= URL %>",
        );
      }

      await pluginStore.set({ key: "email", value: settings });
      strapi.log.info(`Reset password configuration updated. URL: ${newUrl}`);

      // Verify immediately
      const updatedSettings = await pluginStore.get({ key: "email" });
      strapi.log.info(
        "Verified reset_password options: " +
          JSON.stringify(updatedSettings.reset_password.options),
      );
    }
  },
};
