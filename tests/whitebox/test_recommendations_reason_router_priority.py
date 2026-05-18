from __future__ import annotations

import asyncio
from unittest.mock import MagicMock

import pytest
from fastapi import BackgroundTasks, HTTPException

import app.routers.reason as reason_router
import app.routers.recommendations as recommendations_router
from app.schemas.recommendation import EnrichedFoodItem, RecommendationRequest
from app.schemas.reason import ReasonRequest


def _enriched_item(food_id: str, food_name: str, category: str, reason: str = "Because it helps") -> EnrichedFoodItem:
    return EnrichedFoodItem(
        food_id=food_id,
        food_name=food_name,
        category=category,
        image_url=f"/static/category_fallback/{category}.png",
        image_status="fallback",
        reason=reason,
    )


def test_reason_endpoint_uses_template_builder(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = {}

    def fake_builder(**kwargs):
        captured.update(kwargs)
        return "This food matches your goal."

    monkeypatch.setattr(reason_router, "build_personalized_reason", fake_builder)

    async def _run():
        return await reason_router.get_reason(
            payload=ReasonRequest(
                food_name="Apple",
                category="fruit",
                section_name="super_power_foods",
                goal_id="grow",
                food_id="apple-1",
                likes=["fruit"],
                dislikes=["snack"],
            ),
            current_user={"username": "demo"},
        )

    response = asyncio.run(_run())

    assert response.food_id == "apple-1"
    assert response.reason == "This food matches your goal."
    assert captured["food_name"] == "Apple"
    assert captured["goal_id"] == "grow"
    assert captured["section_name"] == "super_power_foods"


def test_recommendations_endpoint_returns_enriched_lists_and_queues_images(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = RecommendationRequest(
        goal_id="grow",
        likes=["fruit"],
        dislikes=["snack"],
        blacklist=[],
        allergies=[],
    )
    background_tasks = BackgroundTasks()
    raw_model_output = "raw model output"
    parsed = {"super_power_foods": [], "tiny_hero_foods": [], "try_less_foods": []}
    topup_result = {
        "super_power_foods": [
            {
                "food_id": "apple-1",
                "food_name": "Apple",
                "category": "fruit",
                "image_url": "/static/category_fallback/fruit.png",
                "image_status": "fallback",
                "reason": "Great choice",
            }
        ],
        "tiny_hero_foods": [
            {
                "food_id": "carrot-1",
                "food_name": "Carrot",
                "category": "vegetable",
                "image_url": "/static/category_fallback/vegetable.png",
                "image_status": "fallback",
                "reason": "Good for variety",
            }
        ],
        "try_less_foods": [
            {
                "food_id": "cookie-1",
                "food_name": "Cookie",
                "category": "snack",
                "image_url": "/static/category_fallback/snack.png",
                "image_status": "fallback",
                "reason": "A treat food",
            }
        ],
    }

    monkeypatch.setattr(recommendations_router, "call_model", MagicMock(return_value=raw_model_output))
    monkeypatch.setattr(recommendations_router, "parse_model_output", MagicMock(return_value=parsed))
    monkeypatch.setattr(recommendations_router, "resolve_forbidden", MagicMock(return_value=({"fruit"}, {"apple"})))
    monkeypatch.setattr(recommendations_router, "filter_output", MagicMock(return_value=parsed))
    monkeypatch.setattr(recommendations_router, "filter_tiny_hero_by_likes", MagicMock(return_value=parsed))
    monkeypatch.setattr(recommendations_router, "rewrite_try_less_by_likes", MagicMock(return_value=parsed))
    monkeypatch.setattr(recommendations_router, "topup_sections", MagicMock(return_value=topup_result))
    monkeypatch.setattr(
        recommendations_router,
        "enrich_recommendation_items",
        lambda items: [
            _enriched_item(
                item["food_id"],
                item["food_name"],
                item["category"],
                item["reason"],
            )
            for item in items
        ],
    )
    monkeypatch.setattr(recommendations_router, "_find_metadata_image", MagicMock(return_value=None))
    monkeypatch.setattr(recommendations_router, "should_queue_generation", MagicMock(return_value=True))
    monkeypatch.setattr(recommendations_router, "mark_pending", MagicMock())
    monkeypatch.setattr(recommendations_router, "generate_and_cache_food_image", MagicMock())

    async def _run():
        return await recommendations_router.recommend(
            payload=payload,
            background_tasks=background_tasks,
            current_user={"username": "demo"},
        )

    response = asyncio.run(_run())

    assert len(response.super_power_foods) == 1
    assert response.super_power_foods[0].food_name == "Apple"
    assert response.tiny_hero_foods[0].food_name == "Carrot"
    assert response.try_less_foods[0].food_name == "Cookie"
    assert len(background_tasks.tasks) == 3
    assert recommendations_router.mark_pending.call_count == 3


def test_recommendations_endpoint_rejects_invalid_model_output(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(recommendations_router, "call_model", MagicMock(return_value="raw"))
    monkeypatch.setattr(recommendations_router, "parse_model_output", MagicMock(return_value=None))

    async def _run():
        return await recommendations_router.recommend(
            payload=RecommendationRequest(
                goal_id="grow",
                likes=[],
                dislikes=[],
                blacklist=[],
                allergies=[],
            ),
            background_tasks=BackgroundTasks(),
            current_user={"username": "demo"},
        )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(_run())

    assert exc_info.value.status_code == 502
