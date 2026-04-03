import { env } from "./config/env.js";
import { prisma } from "./lib/db.js";
import { buildApp } from "./app.js";

async function start() {
  const app = buildApp();

  try {
    await prisma.$connect();
    await app.listen({
      port: env.port,
      host: env.host
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
