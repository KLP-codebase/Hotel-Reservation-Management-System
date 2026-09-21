import app from './app';
import { env } from './config/env';
import { registerAuditListeners } from './lib/audit/audit.emitter';
import { db } from './config/db';
import { syncAliveBookingDates } from './services/alive-dates.service';

// Register Observer listeners before the server starts
registerAuditListeners();

// Sync alive test booking dates and events relatively moving forward
syncAliveBookingDates(db).catch(err => console.warn('Startup alive dates sync notice:', err));

app.listen(env.PORT, () => {
  console.log(`🏨  Sky Nest API running on http://localhost:${env.PORT}`);
  console.log(`    Environment : ${env.NODE_ENV}`);
  console.log(`    CORS origins: ${env.ALLOWED_ORIGINS}`);
});
