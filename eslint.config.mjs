import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "target/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "rustup-init.exe",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
];

export default eslintConfig;
