import logging
import random
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from telethon import TelegramClient
from telethon.errors import (
    FloodWaitError, ChatWriteForbiddenError, UserBannedInChannelError,
    ChannelPrivateError, ChatAdminRequiredError, RPCError
)

logger = logging.getLogger(__name__)

class MessageSender:
    def __init__(self, config, session_manager, api_client):
        self.config = config
        self.session_manager = session_manager
        self.api_client = api_client

    async def send_message(self, job: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        job_id = job['id']
        session_key = job.get('session_key')
        chat_id = job.get('chat_id_bigint') or job.get('chat_id')
        template_text = job.get('template_text', '')
        account_id = job.get('account_id')

        if not session_key or not chat_id:
            error = "Missing session_key or chat_id"
            logger.error(f"Job {job_id}: {error}")
            return False, error

        # Check cooldown
        if self.session_manager.is_in_cooldown(session_key):
            logger.info(f"Session {session_key} is in cooldown, skipping job {job_id}")
            return False, "Account in cooldown"

        # Get Telethon client
        client = await self.session_manager.get_client(session_key)
        if not client:
            error = f"Failed to load session {session_key}"
            logger.error(f"Job {job_id}: {error}")
            return False, error

        try:
            # Update job status to running
            await self.api_client.update_job(job_id, 'running')

            # Add random delay before sending
            delay = random.uniform(
                self.config.default_delay_min_sec,
                self.config.default_delay_max_sec
            )
            await asyncio.sleep(delay)

            # Send the message
            await client.send_message(
                int(chat_id),
                template_text
            )

            logger.info(f"Successfully sent message for job {job_id} to chat {chat_id}")

            # Update job as done
            await self.api_client.update_job(job_id, 'done', sent_at=datetime.now().isoformat())

            # Add delay after sending
            await asyncio.sleep(self.config.group_delay_sec)

            return True, None

        except FloodWaitError as e:
            wait_seconds = e.seconds * self.config.flood_wait_multiplier
            logger.warning(f"FloodWait for session {session_key}: {wait_seconds}s")

            # Set cooldown on session
            self.session_manager.set_cooldown(session_key, wait_seconds)

            # Update account in API
            flood_wait_until = (datetime.now() + timedelta(seconds=wait_seconds)).isoformat()
            await self.api_client.update_account(
                account_id,
                status='cooldown',
                flood_wait_until=flood_wait_until
            )

            # Mark job for retry
            await self.api_client.update_job(
                job_id,
                'failed',
                error_message=f"FloodWait: {e.seconds}s"
            )

            return False, f"FloodWait: {wait_seconds}s"

        except ChatWriteForbiddenError as e:
            error = f"Cannot send to chat {chat_id}: Write forbidden"
            logger.error(f"Job {job_id}: {error}")
            await self.api_client.update_job(job_id, 'failed', error_message=error)
            return False, error

        except (UserBannedInChannelError, ChannelPrivateError, ChatAdminRequiredError) as e:
            error = f"Access denied to chat {chat_id}: {str(e)}"
            logger.error(f"Job {job_id}: {error}")
            await self.api_client.update_job(job_id, 'failed', error_message=error)
            return False, error

        except RPCError as e:
            error = f"Telegram RPC error: {str(e)}"
            logger.error(f"Job {job_id}: {error}")
            await self.api_client.update_job(job_id, 'failed', error_message=error)
            return False, error

        except Exception as e:
            error = f"Unexpected error: {str(e)}"
            logger.error(f"Job {job_id}: {error}", exc_info=True)
            await self.api_client.update_job(job_id, 'failed', error_message=error)
            return False, error

    async def process_jobs(self, jobs: list) -> Dict[str, int]:
        stats = {'success': 0, 'failed': 0, 'skipped': 0}

        for job in jobs:
            success, error = await self.send_message(job)

            if success:
                stats['success'] += 1
            elif error and 'cooldown' in error.lower():
                stats['skipped'] += 1
            else:
                stats['failed'] += 1

        return stats
