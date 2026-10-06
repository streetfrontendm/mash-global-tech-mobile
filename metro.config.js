// Metro config for the mobile app.
//
// The app deliberately imports shared code straight out of the web repo
// (`@/lib/money`, `@/lib/types`, `@/lib/catalog`, `@/data/products`) so price
// formatting, domain types and the offline catalogue can never drift between
// platforms. Those files live one level up, so the repo root is added to the
// watch folders — otherwise Metro wouldn't see them.
//
// The alias itself lives in tsconfig.json (`paths`), which Metro reads.

const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [repoRoot];

module.exports = config;
