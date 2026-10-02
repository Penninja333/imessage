import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(resolve(__dirname, "tokens.json"), "utf8"));

function generateCss() {
  const light = tokens.color.light;
  const dark = tokens.color.dark;

  const lightVars = Object.entries(light)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join("\n");

  const darkVars = Object.entries(dark)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join("\n");

  let presetBlocks = "";
  for (const [name, preset] of Object.entries(tokens.color.presets)) {
    const lp = preset.light;
    const dp = preset.dark;
    presetBlocks += `html[data-theme="light"][data-theme-preset="${name}"] {\n`;
    presetBlocks += `  --accent: ${lp.accent};\n`;
    presetBlocks += `  --accent-foreground: ${lp.accentForeground};\n`;
    presetBlocks += `}\n`;
    presetBlocks += `html[data-theme="dark"][data-theme-preset="${name}"] {\n`;
    presetBlocks += `  --accent: ${dp.accent};\n`;
    presetBlocks += `  --accent-foreground: ${dp.accentForeground};\n`;
    presetBlocks += `}\n\n`;
  }

  const spacingVars = Object.entries(tokens.spacing)
    .map(([k, v]) => `  --space-${k}: ${v};`)
    .join("\n");
  const radiusVars = Object.entries(tokens.radius)
    .map(([k, v]) => `  --radius-${k}: ${v};`)
    .join("\n");
  const fontVars = Object.entries(tokens.font.family)
    .map(([k, v]) => `  --font-${k}: ${v};`)
    .join("\n");

  return `/* AUTO-GENERATED from tokens.json. Do not edit — run \`npm run build\` in packages/design-tokens. */
:root {
${lightVars}
${spacingVars}
${radiusVars}
${fontVars}
}

html[data-theme="dark"] {
${darkVars}
}

${presetBlocks}`;
}

function generateTs() {
  const light = tokens.color.light;
  const dark = tokens.color.dark;
  const presets = tokens.color.presets;

  const lightEntries = Object.entries(light)
    .map(([k, v]) => `  ${k}: "${v}",`)
    .join("\n");

  const darkEntries = Object.entries(dark)
    .map(([k, v]) => `  ${k}: "${v}",`)
    .join("\n");

  let presetEntries = "";
  for (const [name, preset] of Object.entries(presets)) {
    presetEntries += `  ${name}: {\n`;
    presetEntries += `    light: { accent: "${preset.light.accent}", accentForeground: "${preset.light.accentForeground}" },\n`;
    presetEntries += `    dark: { accent: "${preset.dark.accent}", accentForeground: "${preset.dark.accentForeground}" },\n`;
    presetEntries += `  },\n`;
  }

  const spacingEntries = Object.entries(tokens.spacing)
    .map(([k, v]) => `  ${k}: "${v}",`)
    .join("\n");

  const radiusEntries = Object.entries(tokens.radius)
    .map(([k, v]) => `  ${k}: "${v}",`)
    .join("\n");

  return `// AUTO-GENERATED from tokens.json. Do not edit — run \`npm run build\` in packages/design-tokens.

export const lightColors = {
${lightEntries}
} as const;

export const darkColors = {
${darkEntries}
} as const;

export const accentPresets = {
${presetEntries}} as const;

export const spacing = {
${spacingEntries}
} as const;

export const radius = {
${radiusEntries}
} as const;

export const breakpoints = {
  mobile: ${tokens.breakpoint.mobile},
  tablet: ${tokens.breakpoint.tablet},
  desktop: ${tokens.breakpoint.desktop},
} as const;

export const fontSizes = {
${Object.entries(tokens.font.size).map(([k, v]) => `  ${k}: "${v}",`).join("\n")}
} as const;
`;
}

writeFileSync(resolve(__dirname, "tokens.css"), generateCss());
writeFileSync(resolve(__dirname, "tokens.ts"), generateTs());
console.log("Generated tokens.css and tokens.ts");
