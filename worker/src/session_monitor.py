"""
Session monitoring and control system.
Manages multiple session scripts and coordinates their execution.
"""

import asyncio
import logging
from typing import Dict, Optional
from pathlib import Path
import subprocess
import signal

from config import WorkerConfig
from api_client import TGMarketerAPIClient
from session_script import run_session_script

logger = logging.getLogger(__name__)


class SessionMonitor:
    """Monitors and controls session automation scripts."""

    def __init__(self, config: WorkerConfig, api_client: TGMarketerAPIClient):
        self.config = config
        self.api_client = api_client
        self.running_scripts: Dict[str, asyncio.Task] = {}
        self.running = False

    async def start(self):
        """Start the session monitor."""
        logger.info("Starting session monitor")
        self.running = True

        # Start monitoring loop
        await self.monitor_loop()

    async def stop(self):
        """Stop all running scripts and the monitor."""
        logger.info("Stopping session monitor")
        self.running = False

        # Stop all running scripts
        for session_id in list(self.running_scripts.keys()):
            await self.stop_session_script(session_id)

    async def monitor_loop(self):
        """Main monitoring loop that checks for scripts to start/stop."""
        while self.running:
            try:
                # Fetch sessions that should be running
                sessions = await self.fetch_active_sessions()

                for session in sessions:
                    session_id = session['id']
                    script_status = session['script_status']

                    # Start script if it should be running but isn't
                    if script_status == 'running' and session_id not in self.running_scripts:
                        await self.start_session_script(session)

                    # Stop script if it should be stopped but is running
                    elif script_status in ['stopped', 'idle'] and session_id in self.running_scripts:
                        await self.stop_session_script(session_id)

                # Clean up completed tasks
                completed_ids = []
                for session_id, task in self.running_scripts.items():
                    if task.done():
                        completed_ids.append(session_id)
                        try:
                            await task  # Raise any exceptions
                        except Exception as e:
                            logger.error(f"Script {session_id} failed: {e}")
                            await self.mark_session_error(session_id, str(e))

                for session_id in completed_ids:
                    del self.running_scripts[session_id]
                    await self.mark_session_stopped(session_id)

                # Wait before next check
                await asyncio.sleep(10)

            except Exception as e:
                logger.error(f"Error in monitor loop: {e}", exc_info=True)
                await asyncio.sleep(30)

    async def fetch_active_sessions(self) -> list:
        """Fetch sessions from the API."""
        try:
            # This would be an API call to get sessions
            # For now, return empty list as placeholder
            return []
        except Exception as e:
            logger.error(f"Failed to fetch sessions: {e}")
            return []

    async def start_session_script(self, session: Dict):
        """Start an automation script for a session."""
        session_id = session['id']
        session_key = session['telegram_user_id']

        logger.info(f"Starting script for session {session_key}")

        try:
            # Build session file path
            session_folder = Path(self.config.sessions_root_dir) / session_key
            session_file = session_folder / f"{session_key}.session"

            if not session_file.exists():
                raise FileNotFoundError(f"Session file not found: {session_file}")

            # Get script config from session
            script_config = session.get('script_config', {
                'delay_min_sec': 2,
                'delay_max_sec': 5,
                'group_delay_sec': 12,
                'max_messages_per_cycle': 50
            })

            # Create task to run the script
            task = asyncio.create_task(
                run_session_script(
                    session_path=str(session_file.parent / session_key),
                    api_id=self.config.telegram_api_id,
                    api_hash=self.config.telegram_api_hash,
                    config=script_config,
                    api_client=self.api_client,
                    session_id=session_id
                )
            )

            self.running_scripts[session_id] = task

            # Mark session as running
            await self.mark_session_running(session_id)

            logger.info(f"Script started for session {session_key}")

        except Exception as e:
            logger.error(f"Failed to start script for {session_key}: {e}")
            await self.mark_session_error(session_id, str(e))

    async def stop_session_script(self, session_id: str):
        """Stop an automation script."""
        if session_id not in self.running_scripts:
            return

        logger.info(f"Stopping script for session {session_id}")

        task = self.running_scripts[session_id]
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error stopping script: {e}")

        del self.running_scripts[session_id]
        await self.mark_session_stopped(session_id)

    async def mark_session_running(self, session_id: str):
        """Mark a session as running in the database."""
        try:
            # This would be an API call to update session status
            pass
        except Exception as e:
            logger.error(f"Failed to mark session running: {e}")

    async def mark_session_stopped(self, session_id: str):
        """Mark a session as stopped in the database."""
        try:
            # This would be an API call to update session status
            pass
        except Exception as e:
            logger.error(f"Failed to mark session stopped: {e}")

    async def mark_session_error(self, session_id: str, error_message: str):
        """Mark a session as having an error."""
        try:
            # This would be an API call to update session status and error message
            pass
        except Exception as e:
            logger.error(f"Failed to mark session error: {e}")

    def get_running_count(self) -> int:
        """Get the number of currently running scripts."""
        return len(self.running_scripts)

    def get_running_session_ids(self) -> list:
        """Get list of session IDs that are currently running."""
        return list(self.running_scripts.keys())


async def launch_telegram_instance(session_folder: Path, telegram_exe_path: Optional[Path] = None):
    """
    Launch a separate Telegram Desktop instance for a session folder.

    This uses the portable Telegram Desktop method where placing telegram.exe
    in a folder makes it use that folder for data/sessions.

    Args:
        session_folder: Path to the session folder
        telegram_exe_path: Optional path to telegram.exe. If None, looks in session_folder
    """
    if telegram_exe_path is None:
        telegram_exe_path = session_folder / 'telegram.exe'

    if not telegram_exe_path.exists():
        raise FileNotFoundError(f"telegram.exe not found at {telegram_exe_path}")

    logger.info(f"Launching Telegram instance for {session_folder.name}")

    try:
        # Launch telegram.exe in the session folder
        # The working directory being set to the session folder makes Telegram
        # use that folder for its data
        process = subprocess.Popen(
            [str(telegram_exe_path)],
            cwd=str(session_folder),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if hasattr(subprocess, 'CREATE_NEW_PROCESS_GROUP') else 0
        )

        logger.info(f"Telegram instance launched with PID {process.pid}")
        return process

    except Exception as e:
        logger.error(f"Failed to launch Telegram instance: {e}")
        raise


def create_session_folder(root_dir: Path, telegram_user_id: str) -> Path:
    """
    Create a session folder with the proper structure.

    Args:
        root_dir: Root directory for all sessions
        telegram_user_id: Telegram user ID (used as folder name)

    Returns:
        Path to the created session folder
    """
    session_folder = root_dir / telegram_user_id
    session_folder.mkdir(parents=True, exist_ok=True)

    logger.info(f"Created session folder: {session_folder}")

    # Create a README file explaining the folder structure
    readme_path = session_folder / 'README.txt'
    readme_content = f"""
Session Folder: {telegram_user_id}

This folder is used for Telegram session management.

Files you can place here:
  - telegram.exe: Place Telegram Desktop executable here to launch a separate instance
  - {telegram_user_id}.session: Telethon session file for automation

The folder name matches your Telegram User ID for easy identification.

Do not manually edit or delete files unless you know what you're doing.
"""

    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(readme_content.strip())

    return session_folder


if __name__ == '__main__':
    # Example usage
    import sys

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    if len(sys.argv) > 1:
        action = sys.argv[1]

        if action == 'create' and len(sys.argv) >= 4:
            root_dir = Path(sys.argv[2])
            user_id = sys.argv[3]
            folder = create_session_folder(root_dir, user_id)
            print(f"Created session folder: {folder}")

        elif action == 'launch' and len(sys.argv) >= 3:
            session_folder = Path(sys.argv[2])
            asyncio.run(launch_telegram_instance(session_folder))

        else:
            print("Usage:")
            print("  python session_monitor.py create <root_dir> <telegram_user_id>")
            print("  python session_monitor.py launch <session_folder>")
    else:
        print("Session Monitor - use with appropriate arguments")
