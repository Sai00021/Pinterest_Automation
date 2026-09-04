import { Env } from './types';
import { AutomationOrchestrator } from './scheduler/orchestrator';
import { D1Repository } from './database/repository';

export default {
  /**
   * Handle HTTP requests (Fetch API)
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Health Check
    if (path === '/health' || path === '/') {
      return new Response(JSON.stringify({
        status: 'UP',
        worker: 'pinterest-automation',
        time: new Date().toISOString(),
        dry_run: String(env.DRY_RUN).toLowerCase() === 'true'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Authentication Helper
    const isAuthorized = () => {
      const authHeader = request.headers.get('X-Admin-Token');
      return authHeader && authHeader === env.ADMIN_API_KEY;
    };

    // 3. Manual Automation Run (Protected)
    if (path === '/manual-run' && request.method === 'POST') {
      if (!isAuthorized()) return new Response('Unauthorized', { status: 401 });

      const orchestrator = new AutomationOrchestrator(env);
      ctx.waitUntil(orchestrator.run().then(res => {
        console.log(`Manual Run Result: ${JSON.stringify(res)}`);
      }));

      return new Response(JSON.stringify({ message: 'Automation orchestrator started in background.' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Manual Ingestion (Protected)
    if (path === '/ingest' && request.method === 'POST') {
      if (!isAuthorized()) return new Response('Unauthorized', { status: 401 });

      const orchestrator = new AutomationOrchestrator(env);
      ctx.waitUntil(orchestrator.run().then(res => {
        console.log(`Ingestion Result: ${JSON.stringify(res)}`);
      }));

      return new Response(JSON.stringify({ message: 'Amazon product ingestion and variant generation started.' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 5. Execution Report
    if (path === '/report') {
      const repo = new D1Repository(env.DB);
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      const pins = await repo.getRecentPins(limit);

      return new Response(JSON.stringify({
        summary: 'Recent Pinterest Publishing History',
        count: pins.length,
        pins: pins
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  },

  /**
   * Handle Cron Triggers (Scheduled API)
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Cron Trigger Fired: ${event.cron} at ${new Date().toISOString()}`);

    const orchestrator = new AutomationOrchestrator(env);
    await orchestrator.run();
  }
};
