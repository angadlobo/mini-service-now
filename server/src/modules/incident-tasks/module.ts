import { Express } from 'express';
import routes from './routes';

export function registerIncidentTasksModule(app: Express) {
  app.use('/api', routes);
}
