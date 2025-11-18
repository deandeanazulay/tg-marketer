"""
Telethon automation script for session folders.
Retrieves messages from Saved Messages and posts to groups in round-robin fashion.
"""

import asyncio
import random
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from telethon import TelegramClient, errors
from telethon.tl.types import Message, Chat, Channel

logger = logging.getLogger(__name__)


class SessionScript:
    """Automation script that runs within a session folder context."""

    def __init__(
        self,
        session_path: str,
        api_id: int,
        api_hash: str,
        config: Dict,
        api_client: Optional[any] = None,
        session_id: Optional[str] = None
    ):
        self.session_path = session_path
        self.api_id = api_id
        self.api_hash = api_hash
        self.config = config
        self.api_client = api_client
        self.session_id = session_id

        self.client: Optional[TelegramClient] = None
        self.running = False
        self.saved_messages: List[Message] = []
        self.target_groups: List[Dict] = []
        self.current_group_index = 0

        # Script configuration
        self.delay_min = config.get('delay_min_sec', 2)
        self.delay_max = config.get('delay_max_sec', 5)
        self.group_delay = config.get('group_delay_sec', 12)
        self.max_messages_per_cycle = config.get('max_messages_per_cycle', 50)

        # Statistics
        self.messages_sent = 0
        self.messages_failed = 0
        self.cycle_count = 0

    async def start(self):
        """Initialize and start the automation script."""
        try:
            self.log_info("Starting session script")

            # Initialize Telegram client
            self.client = TelegramClient(
                self.session_path,
                self.api_id,
                self.api_hash
            )

            await self.client.connect()

            if not await self.client.is_user_authorized():
                self.log_error("Session is not authorized")
                raise Exception("Session not authorized")

            me = await self.client.get_me()
            self.log_info(f"Connected as {me.first_name} ({me.id})")

            # Load saved messages
            await self.load_saved_messages()

            # Discover target groups
            await self.discover_groups()

            self.running = True

            # Start main loop
            await self.run_loop()

        except Exception as e:
            self.log_error(f"Script error: {e}")
            raise
        finally:
            if self.client:
                await self.client.disconnect()

    async def stop(self):
        """Stop the automation script gracefully."""
        self.log_info("Stopping session script")
        self.running = False

    async def load_saved_messages(self):
        """Load messages from Saved Messages."""
        try:
            self.log_info("Loading messages from Saved Messages")

            # Get "me" entity which represents Saved Messages
            me = await self.client.get_me()

            # Fetch messages from Saved Messages
            messages = []
            async for message in self.client.iter_messages('me', limit=100):
                if message.text:  # Only text messages
                    messages.append(message)

            self.saved_messages = messages
            self.log_info(f"Loaded {len(messages)} message(s) from Saved Messages")

        except Exception as e:
            self.log_error(f"Failed to load saved messages: {e}")
            raise

    async def discover_groups(self):
        """Discover all groups/channels the user is a member of."""
        try:
            self.log_info("Discovering groups and channels")

            groups = []
            async for dialog in self.client.iter_dialogs():
                # Check if it's a group or channel
                if dialog.is_group or dialog.is_channel:
                    # Check if we can send messages
                    entity = dialog.entity

                    # Skip if we can't send messages
                    if hasattr(entity, 'broadcast') and entity.broadcast and not hasattr(entity, 'creator'):
                        continue

                    groups.append({
                        'id': dialog.id,
                        'title': dialog.title,
                        'entity': entity
                    })

            self.target_groups = groups
            self.log_info(f"Found {len(groups)} targetable group(s)")

            if len(groups) == 0:
                self.log_warning("No groups found to send messages to")

        except Exception as e:
            self.log_error(f"Failed to discover groups: {e}")
            raise

    async def run_loop(self):
        """Main automation loop."""
        self.log_info("Entering main automation loop")

        while self.running:
            try:
                # Check if we have messages and groups
                if not self.saved_messages:
                    self.log_warning("No messages in Saved Messages, waiting...")
                    await asyncio.sleep(60)
                    await self.load_saved_messages()
                    continue

                if not self.target_groups:
                    self.log_warning("No target groups found, waiting...")
                    await asyncio.sleep(60)
                    await self.discover_groups()
                    continue

                # Start a new cycle
                self.cycle_count += 1
                self.log_info(f"Starting cycle {self.cycle_count}")

                messages_in_cycle = 0

                # Send messages in round-robin fashion
                while messages_in_cycle < self.max_messages_per_cycle and self.running:
                    # Pick a random message
                    message = random.choice(self.saved_messages)

                    # Get next group (round-robin)
                    group = self.target_groups[self.current_group_index]
                    self.current_group_index = (self.current_group_index + 1) % len(self.target_groups)

                    # Send message
                    success = await self.send_message(group, message.text)

                    if success:
                        self.messages_sent += 1
                        messages_in_cycle += 1

                        # Update stats in API
                        await self.update_stats(messages_sent=1)
                    else:
                        self.messages_failed += 1
                        await self.update_stats(messages_failed=1)

                    # Random delay between messages
                    delay = random.uniform(self.delay_min, self.delay_max)
                    self.log_info(f"Waiting {delay:.1f}s before next message")
                    await asyncio.sleep(delay)

                # Cycle complete
                self.log_info(f"Cycle {self.cycle_count} complete. Sent {messages_in_cycle} messages")

                # Wait before next cycle
                cycle_delay = self.group_delay * len(self.target_groups)
                self.log_info(f"Waiting {cycle_delay}s before next cycle")
                await asyncio.sleep(cycle_delay)

            except errors.FloodWaitError as e:
                wait_time = e.seconds
                self.log_warning(f"FloodWait: must wait {wait_time}s")
                await asyncio.sleep(wait_time)

            except Exception as e:
                self.log_error(f"Error in main loop: {e}")
                await asyncio.sleep(30)

    async def send_message(self, group: Dict, text: str) -> bool:
        """Send a message to a specific group."""
        try:
            await self.client.send_message(group['entity'], text)
            self.log_success(f"Sent to {group['title']}")
            return True

        except errors.FloodWaitError as e:
            self.log_warning(f"FloodWait on {group['title']}: {e.seconds}s")
            raise

        except errors.ChatWriteForbiddenError:
            self.log_error(f"Cannot write to {group['title']} (forbidden)")
            return False

        except errors.UserBannedInChannelError:
            self.log_error(f"Banned in {group['title']}")
            return False

        except Exception as e:
            self.log_error(f"Failed to send to {group['title']}: {e}")
            return False

    def log_info(self, message: str):
        """Log info message."""
        logger.info(message)
        if self.api_client and self.session_id:
            asyncio.create_task(self.api_client.log_session(
                self.session_id, 'info', message
            ))

    def log_success(self, message: str):
        """Log success message."""
        logger.info(message)
        if self.api_client and self.session_id:
            asyncio.create_task(self.api_client.log_session(
                self.session_id, 'success', message
            ))

    def log_warning(self, message: str):
        """Log warning message."""
        logger.warning(message)
        if self.api_client and self.session_id:
            asyncio.create_task(self.api_client.log_session(
                self.session_id, 'warning', message
            ))

    def log_error(self, message: str):
        """Log error message."""
        logger.error(message)
        if self.api_client and self.session_id:
            asyncio.create_task(self.api_client.log_session(
                self.session_id, 'error', message
            ))

    async def update_stats(self, messages_sent: int = 0, messages_failed: int = 0):
        """Update statistics via API."""
        if self.api_client and self.session_id:
            try:
                await self.api_client.update_session_stats(
                    self.session_id,
                    messages_sent=messages_sent,
                    messages_failed=messages_failed,
                    groups_targeted=len(self.target_groups)
                )
            except Exception as e:
                logger.error(f"Failed to update stats: {e}")


async def run_session_script(
    session_path: str,
    api_id: int,
    api_hash: str,
    config: Dict,
    api_client: Optional[any] = None,
    session_id: Optional[str] = None
):
    """
    Main entry point for running the session automation script.

    Args:
        session_path: Path to the .session file (without extension)
        api_id: Telegram API ID
        api_hash: Telegram API hash
        config: Script configuration dict
        api_client: Optional API client for logging
        session_id: Optional session ID for logging
    """
    script = SessionScript(session_path, api_id, api_hash, config, api_client, session_id)

    try:
        await script.start()
    except KeyboardInterrupt:
        logger.info("Script interrupted by user")
        await script.stop()
    except Exception as e:
        logger.error(f"Script failed: {e}", exc_info=True)
        raise


if __name__ == '__main__':
    import sys
    import os

    if len(sys.argv) < 4:
        print("Usage: python session_script.py <session_path> <api_id> <api_hash>")
        sys.exit(1)

    session_path = sys.argv[1]
    api_id = int(sys.argv[2])
    api_hash = sys.argv[3]

    # Default config
    config = {
        'delay_min_sec': 2,
        'delay_max_sec': 5,
        'group_delay_sec': 12,
        'max_messages_per_cycle': 50
    }

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Run the script
    asyncio.run(run_session_script(session_path, api_id, api_hash, config))
