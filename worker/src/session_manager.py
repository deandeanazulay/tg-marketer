import logging
from pathlib import Path
from typing import Dict, Optional
from telethon import TelegramClient
from telethon.errors import FloodWaitError, AuthKeyError, PhoneNumberBannedError
import asyncio

logger = logging.getLogger(__name__)

class SessionManager:
    def __init__(self, config):
        self.config = config
        self.clients: Dict[str, TelegramClient] = {}
        self.cooldowns: Dict[str, float] = {}

    def discover_sessions(self) -> list:
        return self.config.discover_sessions()

    async def get_client(self, session_key: str, api_id: int = None, api_hash: str = None) -> Optional[TelegramClient]:
        if session_key in self.clients:
            client = self.clients[session_key]
            if client.is_connected():
                return client
            else:
                # Reconnect
                try:
                    await client.connect()
                    return client
                except Exception as e:
                    logger.error(f"Failed to reconnect session {session_key}: {e}")
                    del self.clients[session_key]

        # Create new client
        session_path = self.config.get_session_path(session_key)
        if not session_path.exists():
            logger.error(f"Session file not found: {session_path}")
            return None

        # Use default API credentials if not provided
        if not api_id or not api_hash:
            # These should be stored in account settings or config
            # For now, using placeholder values
            api_id = 12345
            api_hash = "placeholder_hash"

        try:
            client = TelegramClient(str(session_path.parent / session_key), api_id, api_hash)
            await client.connect()

            if not await client.is_user_authorized():
                logger.error(f"Session {session_key} is not authorized")
                return None

            self.clients[session_key] = client
            logger.info(f"Successfully loaded session: {session_key}")
            return client

        except AuthKeyError as e:
            logger.error(f"Auth key error for session {session_key}: {e}")
            return None
        except PhoneNumberBannedError as e:
            logger.error(f"Phone number banned for session {session_key}: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to load session {session_key}: {e}")
            return None

    async def close_client(self, session_key: str):
        if session_key in self.clients:
            try:
                await self.clients[session_key].disconnect()
                del self.clients[session_key]
                logger.info(f"Closed session: {session_key}")
            except Exception as e:
                logger.error(f"Error closing session {session_key}: {e}")

    async def close_all(self):
        for session_key in list(self.clients.keys()):
            await self.close_client(session_key)

    def set_cooldown(self, session_key: str, seconds: float):
        import time
        self.cooldowns[session_key] = time.time() + seconds
        logger.info(f"Set cooldown for {session_key}: {seconds} seconds")

    def is_in_cooldown(self, session_key: str) -> bool:
        import time
        if session_key not in self.cooldowns:
            return False

        if time.time() >= self.cooldowns[session_key]:
            del self.cooldowns[session_key]
            return False

        return True

    def get_active_sessions(self) -> list:
        return [key for key, client in self.clients.items() if client.is_connected()]
