import asyncio
import importlib

import pytest
from pydantic import ValidationError


@pytest.fixture()
def reason_module(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:password@localhost:5432/nutrihealth")
    import app.routers.reason as reason_router

    return importlib.reload(reason_router)


def test_get_reason_returns_response_and_calls_builder(monkeypatch, reason_module):
    captured = {}

    def _fake_builder(**kwargs):
        captured.update(kwargs)
        return "Because apples help you grow."

    monkeypatch.setattr(reason_module, "build_personalized_reason", _fake_builder)

    payload = reason_module.ReasonRequest(
        food_id="apple",
        food_name="Apple",
        category="fruits",
        section_name="super_power_foods",
        goal_id="grow",
        likes=["fruits"],
        dislikes=["fish"],
    )

    result = asyncio.run(reason_module.get_reason(payload=payload, current_user={"username": "demo"}))

    assert result.food_id == "apple"
    assert result.food_name == "Apple"
    assert result.reason == "Because apples help you grow."
    assert captured == {
        "food_name": "Apple",
        "category": "fruits",
        "section_name": "super_power_foods",
        "goal_id": "grow",
        "likes": ["fruits"],
        "dislikes": ["fish"],
    }


def test_reason_request_rejects_invalid_goal(reason_module):
    with pytest.raises(ValidationError) as exc_info:
        reason_module.ReasonRequest(
            food_name="Apple",
            category="fruits",
            section_name="super_power_foods",
            goal_id="unknown",
        )

    assert "goal_id" in str(exc_info.value)


def test_reason_request_rejects_invalid_section(reason_module):
    with pytest.raises(ValidationError) as exc_info:
        reason_module.ReasonRequest(
            food_name="Apple",
            category="fruits",
            section_name="unknown",
            goal_id="grow",
        )

    assert "section_name" in str(exc_info.value)
