import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const authDir = path.resolve(currentDir, "../../test-results/.auth");
export const adminStoragePath = path.join(authDir, "admin.json");
export const driverStoragePath = path.join(authDir, "driver.json");
