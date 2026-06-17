/**
 * Ambient module declarations برای پکیج‌هایی که .d.ts ندارند.
 */

declare module 'tailwindcss-rtl' {
  import type { PluginCreator } from 'tailwindcss/types/config';
  const plugin: { handler: PluginCreator } | PluginCreator;
  export default plugin;
}
