from __future__ import annotations

from datetime import date
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import app.routers.daily_challenge as daily_router


class FakeQuery:
    def __init__(self, first_result=None):
        self.first_result = first_result
        self.filter_calls = []
        self.order_by_calls = []

    def filter(self, *args, **kwargs):
        self.filter_calls.append((args, kwargs))
        return self

    def order_by(self, *args, **kwargs):
        self.order_by_calls.append((args, kwargs))
        return self

    def first(self):
        return self.first_result


class FakeDB:
    def __init__(self, query_result=None, get_result=None):
        self.query_result = query_result or FakeQuery()
        self.get_result = get_result
        self.added = []
        self.commits = 0

    def query(self, *args, **kwargs):
        return self.query_result

    def get(self, *args, **kwargs):
        return self.get_result

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.commits += 1


@pytest.mark.asyncio
async def test_status_reports_completed_today() -> None:
    completion = SimpleNamespace(username="demo", completion_date=date.today())
    db = FakeDB(query_result=FakeQuery(first_result=completion))

    response = await daily_router.check_challenge_status(
        current_user={"username": "demo"},
        db=db,
    )

    assert response.completed_today is True
    assert response.message == daily_router.COMPLETED_MESSAGE


@pytest.mark.asyncio
async def test_status_reports_not_completed() -> None:
    db = FakeDB(query_result=FakeQuery(first_result=None))

    response = await daily_router.check_challenge_status(
        current_user={"username": "demo"},
        db=db,
    )

    assert response.completed_today is False
    assert response.message is None


@pytest.mark.asyncio
async def test_next_challenge_excludes_requested_id(monkeypatch: pytest.MonkeyPatch) -> None:
    task = SimpleNamespace(id=8, task_name="Drink water", tips="Have a glass of water")
    query = FakeQuery(first_result=task)
    captured = {}

    def fake_challenge_query(db, exclude_id=None):
        captured["exclude_id"] = exclude_id
        return query

    monkeypatch.setattr(daily_router, "_challenge_query", fake_challenge_query)

    response = await daily_router.get_next_challenge(
        exclude_id=5,
        current_user={"username": "demo"},
        db=FakeDB(),
    )

    assert captured["exclude_id"] == 5
    assert response.id == 8
    assert response.task_name == "Drink water"


@pytest.mark.asyncio
async def test_next_challenge_returns_404_when_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(daily_router, "_challenge_query", lambda db, exclude_id=None: FakeQuery(first_result=None))

    with pytest.raises(HTTPException) as exc_info:
        await daily_router.get_next_challenge(
            exclude_id=None,
            current_user={"username": "demo"},
            db=FakeDB(),
        )

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_complete_challenge_records_first_completion() -> None:
    task = SimpleNamespace(id=3, task_name="Eat vegetables", feedback="Nice work")
    db = FakeDB(query_result=FakeQuery(first_result=None), get_result=task)

    response = await daily_router.complete_challenge(
        payload=SimpleNamespace(id=3),
        current_user={"username": "demo"},
        db=db,
    )

    assert response.id == 3
    assert response.feedback == "Nice work"
    assert len(db.added) == 1
    assert db.commits == 1


@pytest.mark.asyncio
async def test_complete_challenge_skips_duplicate_write() -> None:
    task = SimpleNamespace(id=4, task_name="Wash hands", feedback="Great hygiene")
    existing = SimpleNamespace(username="demo", completion_date=date.today())
    db = FakeDB(query_result=FakeQuery(first_result=existing), get_result=task)

    response = await daily_router.complete_challenge(
        payload=SimpleNamespace(id=4),
        current_user={"username": "demo"},
        db=db,
    )

    assert response.id == 4
    assert response.task_name == "Wash hands"
    assert db.added == []
    assert db.commits == 0
