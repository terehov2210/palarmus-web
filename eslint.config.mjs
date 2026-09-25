import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    /**
     * One file, one rule.
     *
     * `react-hooks/immutability` is the right default everywhere else in this
     * codebase, and it is unsatisfiable in a react-three-fiber frame callback:
     * the whole point of `useFrame` is to mutate a scene graph, a camera and
     * the DOM nodes overlaid on them, sixty times a second, without going
     * through React state. Routing the model's rotation and six marker
     * transforms through `setState` instead would mean sixty renders a second
     * of the entire hero — which is precisely what the rule is normally
     * protecting against.
     *
     * Keep the exemption to this file. Everything React *should* re-render for
     * — which card is open, whether the frame is narrow — is still state.
     */
    files: ["src/components/hero-model.tsx"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
]);

export default eslintConfig;
