const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const fs = require("fs");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders || []), workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react") {
    return {
      filePath: path.resolve(projectRoot, "node_modules/react/index.js"),
      type: "sourceFile",
    };
  }
  if (moduleName === "react/jsx-runtime") {
    return {
      filePath: path.resolve(projectRoot, "node_modules/react/jsx-runtime.js"),
      type: "sourceFile",
    };
  }
  if (moduleName === "react/jsx-dev-runtime") {
    return {
      filePath: path.resolve(projectRoot, "node_modules/react/jsx-dev-runtime.js"),
      type: "sourceFile",
    };
  }
  if (moduleName.startsWith("react/")) {
    const subpath = moduleName.slice("react/".length);
    const candidateJs = path.resolve(
      projectRoot,
      "node_modules/react",
      subpath.endsWith(".js") ? subpath : `${subpath}.js`,
    );
    const candidateDirect = path.resolve(projectRoot, "node_modules/react", subpath);
    if (fs.existsSync(candidateJs)) {
      return { filePath: candidateJs, type: "sourceFile" };
    }
    if (fs.existsSync(candidateDirect)) {
      return { filePath: candidateDirect, type: "sourceFile" };
    }
    return {
      filePath: path.resolve(projectRoot, "node_modules/react/index.js"),
      type: "sourceFile",
    };
  }
  if (moduleName === "react-is") {
    return {
      filePath: path.resolve(projectRoot, "node_modules/react-is/index.js"),
      type: "sourceFile",
    };
  }
  if (moduleName.startsWith("react-is/")) {
    const subpath = moduleName.slice("react-is/".length);
    const candidateJs = path.resolve(
      projectRoot,
      "node_modules/react-is",
      subpath.endsWith(".js") ? subpath : `${subpath}.js`,
    );
    if (fs.existsSync(candidateJs)) {
      return { filePath: candidateJs, type: "sourceFile" };
    }
    return {
      filePath: path.resolve(projectRoot, "node_modules/react-is/index.js"),
      type: "sourceFile",
    };
  }
  if (moduleName === "react-dom" || moduleName.startsWith("react-dom/")) {
    return {
      filePath: path.resolve(projectRoot, "emptyModule.js"),
      type: "sourceFile",
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
