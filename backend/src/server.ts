import app from './app';
import { env } from './config/env';
import { registerAuditListeners } from './lib/audit/audit.emitter';

// Register Observer listeners before the server starts
registerAuditListeners();

app.listen(env.PORT, () => {
  console.log(`🏨  Sky Nest API running on http://localhost:${env.PORT}`);
  console.log(`    Environment : ${env.NODE_ENV}`);
  console.log(`    CORS origins: ${env.ALLOWED_ORIGINS}`);
});
