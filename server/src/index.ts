import { config } from './config';
import { logger } from './config/logger';
import { initDatabase } from './config/database';
import app from './app';
import { initWorkflowEngine } from './core/workflow-engine';
import { initWebhookDispatcher } from './core/webhook-dispatcher';
import { initSlaEngine } from './modules/sla/engine';

async function main() {
  try {
    await initDatabase();

    // Initialize event-driven engines
    initWorkflowEngine();
    initWebhookDispatcher();
    initSlaEngine();

    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

main();
