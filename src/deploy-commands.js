import { deployCommands } from "./services/commandDeployment.js";

try {
  const result = await deployCommands();
  console.log(`Deployed ${result.count} slash commands to ${result.scope}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
