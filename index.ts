import { mergeDeepRight, assocPath, isNotNil } from 'ramda';

type Output = Record<string, Record<string, Record<string, Record<string, string>>>>;
type Color = {
  rgba: string;
  hex: string;
};

figma.showUI(__html__, { width: 400, height: 600 });

// Slugify string
const s = (text: string): string => {
  return text
    // Convert to lowercase
    .toLowerCase()
    // Replace spaces and punctuation with hyphens
    .replace(/[^\w\s-]/g, '')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Remove consecutive hyphens
    .replace(/-+/g, '-');
};

// Convert RGBA to hex
const rgbaToHex = ({ r, g, b, a = 1 }: RGBA) => {
  const toHex = (n) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  if (a === 1) {
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
};

// Build color object
const getColor = (color: RGB | RGBA): {
  rgba: string;
  hex: string;
} => {
  const { r, g, b } = color;
  const rgba = `rgba(${Math.round(255 * r)}, ${Math.round(255 * g)}, ${Math.round(255 * b)}, ${(color as RGBA).a || 1})`;
  const hex = rgbaToHex(color as RGBA);
  return { rgba, hex };
};

const getAllVariables = async () => {
  const references: Record<string, string> = {};
  let output: Output = {};

  const variables = await figma.variables.getLocalVariablesAsync();
  const collections =  await figma.variables.getLocalVariableCollectionsAsync();

  // Build references object
  for (const collection of collections) {
    references[collection.id] = collection.name;
    for (const mode of collection.modes) {
      references[mode.modeId] = mode.name;
    }
  }
  
  // Build output object
  for (const variable of variables) {
    const path = variable.name.split('/').map(s);
    const value: Record<string, string | number | boolean | Color> = {};

    // Resolve variable values
    for (const [key, modeValue] of Object.entries(variable.valuesByMode)) {
      let mode = s(references[key]);
      if (mode === 'mode') mode = 'default';

      // Simple values
      if (typeof modeValue === 'string' || typeof modeValue === 'number' || typeof modeValue === 'boolean') {
        value[mode] = modeValue;
      }

      // Colors
      if (isNotNil((modeValue as RGB | RGBA).r)) {
        value[mode] = getColor(modeValue as RGB | RGBA);
      }

      // Aliases
      if (isNotNil((modeValue as VariableAlias).id)) {
        const target = await figma.variables.getVariableByIdAsync((modeValue as VariableAlias).id);
        if (target !== null) {
          const targetValue = target.valuesByMode[Object.keys(target.valuesByMode)[0]] as string | number | boolean | RGB | RGBA;
          if (isNotNil((targetValue as RGB | RGBA).r)) {
            value[mode] = getColor(targetValue as RGB | RGBA);
          } else {
            value[mode] = targetValue as string | number | boolean;
          }
        }
      }
    }

    // Append to output
    output = mergeDeepRight(output, {
      [s(references[variable.variableCollectionId])]: assocPath(
        path,
        value,
        output[references[variable.variableCollectionId]]
      ),
    });

    // Sort output first level keys
    output = Object.keys(output).sort().reduce((acc: Output, key) => {
      acc[key] = output[key];
      return acc;
    }, {});
  }

  return output;
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'copy-variables') {
    const variables = await getAllVariables();
    const variablesString = JSON.stringify(variables, null, 2);
    figma.ui.postMessage({ type: 'copy', text: variablesString });
  }
};