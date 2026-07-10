"""Supabase HTTP client for repository layer."""

from __future__ import annotations

import os
from typing import Any, Optional

import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


class SupabaseRestClient:
    """Minimal Supabase PostgREST client."""

    def __init__(self, url: Optional[str] = None, service_key: Optional[str] = None) -> None:
        self.url = (url or SUPABASE_URL).rstrip("/")
        self.service_key = service_key or SUPABASE_SERVICE_ROLE_KEY
        if not self.url or not self.service_key:
            self.enabled = False
        else:
            self.enabled = True

    def _headers(self) -> dict[str, str]:
        return {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    def select_one(
        self,
        table: str,
        filters: dict[str, str],
        columns: str = "*",
    ) -> Optional[dict[str, Any]]:
        if not self.enabled:
            return None
        params = "&".join(f"{k}=eq.{v}" for k, v in filters.items())
        url = f"{self.url}/rest/v1/{table}?select={columns}&{params}&limit=1"
        with httpx.Client(timeout=30.0) as client:
            res = client.get(url, headers=self._headers())
            res.raise_for_status()
            rows = res.json()
            return rows[0] if rows else None

    def select_many(
        self,
        table: str,
        filters: dict[str, str],
        columns: str = "*",
        order: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        if not self.enabled:
            return []
        params = "&".join(f"{k}=eq.{v}" for k, v in filters.items())
        url = f"{self.url}/rest/v1/{table}?select={columns}&{params}"
        if order:
            url += f"&order={order}"
        with httpx.Client(timeout=30.0) as client:
            res = client.get(url, headers=self._headers())
            res.raise_for_status()
            return res.json()

    def insert(self, table: str, row: dict[str, Any]) -> dict[str, Any]:
        if not self.enabled:
            return row
        url = f"{self.url}/rest/v1/{table}"
        with httpx.Client(timeout=30.0) as client:
            res = client.post(url, headers=self._headers(), json=row)
            res.raise_for_status()
            data = res.json()
            return data[0] if isinstance(data, list) and data else data

    def update(
        self,
        table: str,
        filters: dict[str, str],
        patch: dict[str, Any],
    ) -> None:
        if not self.enabled:
            return
        params = "&".join(f"{k}=eq.{v}" for k, v in filters.items())
        url = f"{self.url}/rest/v1/{table}?{params}"
        with httpx.Client(timeout=30.0) as client:
            res = client.patch(url, headers=self._headers(), json=patch)
            res.raise_for_status()
