import asyncio
import logging
import signal
import sys
from pathlib import Path

from config import WorkerConfig
from api_client import TGMarketerAPIClient
from session_manager import SessionManager
from message_sender import MessageSender
from heartbeat import HeartbeatService

logger = logging.getLogger(__name__)

class TGWorker:
    def __init__(self, config_path='config.toml'):
        self.config = WorkerConfig(config_path)
        self.setup_logging()

        self.api_client = TGMarketerAPIClient(
            self.config.api_url,
            self.config.jwt_token,
            self.config.worker_id
        )

        self.session_manager = SessionManager(self.config)
        self.message_sender = MessageSender(self.config, self.session_manager, self.api_client)
        self.heartbeat_service = HeartbeatService(self.config, self.api_client, self.session_manager)

        self.running = False
        self.setup_signal_handlers()

    def setup_logging(self):
        log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(logging.Formatter(log_format))

        # File handler
        file_handler = logging.FileHandler(self.config.log_file)
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(logging.Formatter(log_format))

        # Root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(getattr(logging, self.config.log_level))
        root_logger.addHandler(console_handler)
        root_logger.addHandler(file_handler)

        logger.info("Logging initialized")

    def setup_signal_handlers(self):
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        self.running = False

    async def start(self):
        logger.info(f"Starting TG Marketer Worker: {self.config.worker_id}")
        logger.info(f"API URL: {self.config.api_url}")
        logger.info(f"Sessions root: {self.config.sessions_root_dir}")

        # Discover sessions
        if self.config.auto_discover:
            sessions = self.session_manager.discover_sessions()
            logger.info(f"Discovered {len(sessions)} session(s)")
            for session in sessions:
                logger.info(f"  - {session['session_key']}: {session['path']}")

        # Start heartbeat service
        await self.heartbeat_service.start()

        # Main loop
        self.running = True
        idle_count = 0
        max_idle = self.config.idle_timeout_sec / (self.config.poll_interval_ms / 1000)

        logger.info("Entering main polling loop...")

        while self.running:
            try:
                # Fetch pending jobs
                jobs = self.api_client.get_pending_jobs(limit=self.config.max_parallel_sessions * 2)

                if jobs:
                    idle_count = 0
                    logger.info(f"Fetched {len(jobs)} job(s) for processing")

                    # Process jobs
                    stats = await self.message_sender.process_jobs(jobs)

                    logger.info(f"Batch complete: {stats}")

                    # Update heartbeat stats
                    self.heartbeat_service.stats['messages_sent'] += stats['success']
                    self.heartbeat_service.stats['messages_failed'] += stats['failed']
                else:
                    idle_count += 1
                    if idle_count % 10 == 0:
                        logger.debug(f"No jobs available ({idle_count} idle polls)")

                # Sleep for poll interval
                await asyncio.sleep(self.config.poll_interval_ms / 1000)

            except KeyboardInterrupt:
                logger.info("Keyboard interrupt received")
                break
            except Exception as e:
                logger.error(f"Error in main loop: {e}", exc_info=True)
                self.heartbeat_service.set_error(str(e))
                await asyncio.sleep(5)

        # Graceful shutdown
        await self.shutdown()

    async def shutdown(self):
        logger.info("Shutting down worker...")

        # Stop heartbeat
        await self.heartbeat_service.stop()

        # Close all sessions
        await self.session_manager.close_all()

        logger.info("Worker shutdown complete")

def main():
    config_path = sys.argv[1] if len(sys.argv) > 1 else 'config.toml'

    if not Path(config_path).exists():
        print(f"Error: Config file not found: {config_path}")
        print("Please copy config.example.toml to config.toml and configure it")
        sys.exit(1)

    worker = TGWorker(config_path)

    try:
        asyncio.run(worker.start())
    except KeyboardInterrupt:
        logger.info("Worker terminated by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    main()
