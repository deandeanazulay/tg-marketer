import logging
import asyncio
import socket
from datetime import datetime

logger = logging.getLogger(__name__)

class HeartbeatService:
    def __init__(self, config, api_client, session_manager):
        self.config = config
        self.api_client = api_client
        self.session_manager = session_manager
        self.hostname = socket.gethostname()
        self.version = "1.0.0"
        self.stats = {
            'messages_sent': 0,
            'messages_failed': 0,
            'uptime_seconds': 0,
            'last_error': None,
            'started_at': datetime.now().isoformat()
        }
        self.running = False
        self.task = None

    async def start(self):
        self.running = True
        self.task = asyncio.create_task(self._heartbeat_loop())
        logger.info("Heartbeat service started")

    async def stop(self):
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info("Heartbeat service stopped")

    async def _heartbeat_loop(self):
        start_time = datetime.now()

        while self.running:
            try:
                # Calculate uptime
                uptime = (datetime.now() - start_time).total_seconds()
                self.stats['uptime_seconds'] = int(uptime)

                # Get active sessions
                active_accounts = self.session_manager.get_active_sessions()

                # Send heartbeat
                success = self.api_client.send_heartbeat(
                    hostname=self.hostname,
                    version=self.version,
                    active_accounts=active_accounts,
                    stats=self.stats
                )

                if success:
                    logger.debug(f"Heartbeat sent successfully. Active accounts: {len(active_accounts)}")
                else:
                    logger.warning("Failed to send heartbeat")

            except Exception as e:
                logger.error(f"Error in heartbeat loop: {e}")
                self.stats['last_error'] = str(e)

            # Sleep for configured interval
            await asyncio.sleep(self.config.heartbeat_interval_sec)

    def increment_sent(self):
        self.stats['messages_sent'] += 1

    def increment_failed(self):
        self.stats['messages_failed'] += 1

    def set_error(self, error: str):
        self.stats['last_error'] = error
