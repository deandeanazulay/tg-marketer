import os
import toml
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

class WorkerConfig:
    def __init__(self, config_path='config.toml'):
        self.config_path = Path(config_path)
        if not self.config_path.exists():
            raise FileNotFoundError(f"Config file not found: {config_path}")

        self.config = toml.load(self.config_path)

        # Server settings
        self.api_url = self.config['server']['tg_marketer_api_url']
        self.jwt_token = os.getenv('TG_MARKETER_JWT') or self.config['server']['jwt_token']
        self.worker_id = self.config['server']['worker_id']

        # Worker settings
        self.poll_interval_ms = self.config['worker']['poll_interval_ms']
        self.max_parallel_sessions = self.config['worker']['max_parallel_sessions']
        self.heartbeat_interval_sec = self.config['worker']['heartbeat_interval_sec']
        self.idle_timeout_sec = self.config['worker']['idle_timeout_sec']

        # Session settings
        self.sessions_root_dir = Path(self.config['sessions']['root_dir'])
        self.auto_discover = self.config['sessions']['auto_discover']
        self.session_extension = self.config['sessions']['session_extension']

        # Sending settings
        self.default_delay_min_sec = self.config['sending']['default_delay_min_sec']
        self.default_delay_max_sec = self.config['sending']['default_delay_max_sec']
        self.group_delay_sec = self.config['sending']['group_delay_sec']
        self.flood_wait_multiplier = self.config['sending']['flood_wait_multiplier']
        self.max_retries = self.config['sending']['max_retries']

        # Limits
        self.global_hourly_limit = self.config['limits']['global_hourly_limit']
        self.global_daily_limit = self.config['limits']['global_daily_limit']

        # Logging
        self.log_level = self.config['logging']['level']
        self.log_file = Path(self.config['logging']['file'])
        self.log_max_size_mb = self.config['logging']['max_size_mb']
        self.log_backup_count = self.config['logging']['backup_count']

        # Ensure log directory exists
        self.log_file.parent.mkdir(parents=True, exist_ok=True)

    def get_session_path(self, session_key: str) -> Path:
        return self.sessions_root_dir / session_key / f"{session_key}{self.session_extension}"

    def discover_sessions(self) -> list:
        if not self.sessions_root_dir.exists():
            return []

        sessions = []
        for folder in self.sessions_root_dir.iterdir():
            if folder.is_dir():
                session_file = folder / f"{folder.name}{self.session_extension}"
                if session_file.exists():
                    sessions.append({
                        'session_key': folder.name,
                        'path': session_file
                    })

        return sessions
