from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI, HTTPException

import app.auth as auth_module
import app.main as main_module
import app.routers.auth as auth_router


class DummyFormData:
    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password


class FakeSession:
    def __init__(self):
        self.closed = False

    def close(self) -> None:
        self.closed = True


def test_app_registers_core_routes() -> None:
    paths = {getattr(route, "path", None) for route in main_module.app.routes}

    assert "/" in paths
    assert "/health" in paths
    assert "/admin/cleanup-cache" in paths
    assert "/scan" in paths
    assert "/token" in paths
    assert "/daily-challenge/next" in paths
    assert "/recommendations" in paths
    assert "/recommendations/reason" in paths
    assert any(getattr(route, "path", None) == "/static" for route in main_module.app.routes)


@pytest.mark.asyncio
async def test_lifespan_initializes_database_without_seed(monkeypatch: pytest.MonkeyPatch) -> None:
    init_db = MagicMock()
    session_factory = MagicMock(return_value=FakeSession())

    monkeypatch.setattr(main_module, "init_db", init_db)
    monkeypatch.setattr(main_module, "SessionLocal", session_factory)
    monkeypatch.setattr(main_module, "has_seed_been_initialized", MagicMock())
    monkeypatch.setattr(main_module, "seed_catalog_tables", MagicMock())
    monkeypatch.setattr(main_module, "mark_seed_initialized", MagicMock())
    monkeypatch.setenv("SEED_ON_STARTUP", "false")

    async with main_module.lifespan(FastAPI()):
        pass

    init_db.assert_called_once()
    session_factory.assert_not_called()
    main_module.has_seed_been_initialized.assert_not_called()
    main_module.seed_catalog_tables.assert_not_called()
    main_module.mark_seed_initialized.assert_not_called()


@pytest.mark.asyncio
async def test_lifespan_seeds_when_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = FakeSession()
    init_db = MagicMock()
    session_factory = MagicMock(return_value=fake_db)
    has_seed = MagicMock(return_value=False)
    seed_catalog = MagicMock(return_value={"cn_fdes": 1})
    mark_seed = MagicMock()

    monkeypatch.setattr(main_module, "init_db", init_db)
    monkeypatch.setattr(main_module, "SessionLocal", session_factory)
    monkeypatch.setattr(main_module, "has_seed_been_initialized", has_seed)
    monkeypatch.setattr(main_module, "seed_catalog_tables", seed_catalog)
    monkeypatch.setattr(main_module, "mark_seed_initialized", mark_seed)
    monkeypatch.setenv("SEED_ON_STARTUP", "true")
    monkeypatch.setenv("SEED_KEY", "unit-test-seed")
    monkeypatch.setenv("SEED_FORCE_RELOAD", "false")
    monkeypatch.setenv("SEED_TRUNCATE_BEFORE_LOAD", "true")

    async with main_module.lifespan(FastAPI()):
        pass

    init_db.assert_called_once()
    session_factory.assert_called_once()
    has_seed.assert_called_once_with(fake_db, "unit-test-seed")
    seed_catalog.assert_called_once_with(fake_db, truncate_before_load=True)
    mark_seed.assert_called_once_with(fake_db, "unit-test-seed", init_value="completed")
    assert fake_db.closed is True


@pytest.mark.asyncio
async def test_root_and_health_endpoints() -> None:
    assert await main_module.root() == {
        "name": "NutriHealth API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }
    assert await main_module.health_check() == {
        "status": "healthy",
        "service": "nutrihealth-api",
    }


@pytest.mark.asyncio
async def test_cleanup_cache_endpoint_uses_session_and_cleanup(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = FakeSession()
    session_factory = MagicMock(return_value=fake_db)
    cleanup = MagicMock(return_value=7)

    monkeypatch.setattr(main_module, "SessionLocal", session_factory)
    monkeypatch.setattr("app.services.cache.cleanup_expired_cache", cleanup)

    result = await main_module.cleanup_cache_endpoint()

    assert result == {"status": "success", "entries_deleted": 7}
    session_factory.assert_called_once()
    cleanup.assert_called_once_with(fake_db)
    assert fake_db.closed is True


def test_authenticate_user_and_token_roundtrip() -> None:
    assert auth_module.authenticate_user("demo", "demo123") is True
    assert auth_module.authenticate_user("demo", "wrong") is False

    token = auth_module.create_access_token({"sub": "demo"})
    assert auth_module.decode_access_token(token) == {"username": "demo"}


@pytest.mark.asyncio
async def test_get_current_user_rejects_invalid_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(auth_module, "decode_access_token", MagicMock(return_value=None))

    with pytest.raises(HTTPException) as exc_info:
        await auth_module.get_current_user("bad-token")

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_login_endpoint_success_and_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(auth_router, "authenticate_user", MagicMock(return_value=True))
    monkeypatch.setattr(auth_router, "create_access_token", MagicMock(return_value="token-123"))

    response = await auth_router.login(DummyFormData("demo", "demo123"))
    assert response == {"access_token": "token-123", "token_type": "bearer"}

    monkeypatch.setattr(auth_router, "authenticate_user", MagicMock(return_value=False))

    with pytest.raises(HTTPException) as exc_info:
        await auth_router.login(DummyFormData("demo", "wrong"))

    assert exc_info.value.status_code == 401
