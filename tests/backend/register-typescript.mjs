import { registerHooks } from "node:module";

// Node 24 strips TypeScript natively. Resolve Next.js-style extensionless imports
// for these dependency-free tests without changing the app's package or tsconfig.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") &&
          !/\.[a-z]+$/i.test(specifier)) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});
