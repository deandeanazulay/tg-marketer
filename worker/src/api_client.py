import requests
import time
import logging
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

class TGMarketerAPIClient:
    def __init__(self, api_url: str, jwt_token: str, worker_id: str):
        self.api_url = api_url.rstrip('/')
        self.jwt_token = jwt_token
        self.worker_id = worker_id
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {jwt_token}',
            'Content-Type': 'application/json'
        })

    def _request(self, method: str, endpoint: str, **kwargs) -> Optional[Dict]:
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        max_retries = 3

        for attempt in range(max_retries):
            try:
                response = self.session.request(method, url, timeout=30, **kwargs)
                response.raise_for_status()
                return response.json()
            except requests.exceptions.RequestException as e:
                logger.error(f"API request failed (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    raise

        return None

    def get_pending_jobs(self, limit: int = 10, account_id: Optional[str] = None) -> List[Dict]:
        params = {
            'action': 'pending-jobs',
            'limit': limit,
            'worker_id': self.worker_id
        }
        if account_id:
            params['account_id'] = account_id

        try:
            result = self._request('GET', '/worker', params=params)
            return result.get('jobs', []) if result else []
        except Exception as e:
            logger.error(f"Failed to fetch pending jobs: {e}")
            return []

    def update_job(self, job_id: str, status: str, error_message: Optional[str] = None, sent_at: Optional[str] = None) -> bool:
        data = {
            'job_id': job_id,
            'status': status
        }
        if error_message:
            data['error_message'] = error_message
        if sent_at:
            data['sent_at'] = sent_at

        try:
            result = self._request('POST', '/worker?action=update-job', json=data)
            return result is not None
        except Exception as e:
            logger.error(f"Failed to update job {job_id}: {e}")
            return False

    def update_account(self, account_id: str, status: Optional[str] = None,
                       error_message: Optional[str] = None,
                       flood_wait_until: Optional[str] = None) -> bool:
        data = {'account_id': account_id}
        if status:
            data['status'] = status
        if error_message:
            data['error_message'] = error_message
        if flood_wait_until:
            data['flood_wait_until'] = flood_wait_until

        try:
            result = self._request('POST', '/worker?action=update-account', json=data)
            return result is not None
        except Exception as e:
            logger.error(f"Failed to update account {account_id}: {e}")
            return False

    def send_heartbeat(self, hostname: str, version: str, active_accounts: List[str], stats: Dict[str, Any]) -> bool:
        data = {
            'worker_id': self.worker_id,
            'hostname': hostname,
            'version': version,
            'active_accounts': active_accounts,
            'stats': stats
        }

        try:
            result = self._request('POST', '/worker?action=heartbeat', json=data)
            return result is not None
        except Exception as e:
            logger.error(f"Failed to send heartbeat: {e}")
            return False

    def get_stats(self) -> Optional[Dict]:
        try:
            return self._request('GET', f'/worker?action=stats&worker_id={self.worker_id}')
        except Exception as e:
            logger.error(f"Failed to fetch stats: {e}")
            return None

    def list_accounts(self) -> List[Dict]:
        try:
            result = self._request('GET', '/accounts')
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.error(f"Failed to list accounts: {e}")
            return []
