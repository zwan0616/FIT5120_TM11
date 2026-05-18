from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

import app.routers.scan as scan_router


class DummyUploadFile:
    def __init__(self, content: bytes, content_type: str = "image/jpeg"):
        self._content = content
        self.content_type = content_type

    async def read(self) -> bytes:
        return self._content


def _recognised_payload(food_name: str = "Apple", score: int = 3) -> dict:
    return {
        "is_food": True,
        "confidence": 0.96,
        "food_name": food_name,
        "primary_object": food_name,
        "reject_reason": "",
        "nutritional_info": {},
        "assessment_score": score,
        "assessment": "placeholder",
        "alternatives": [],
    }


def test_scan_rejects_invalid_file_type() -> None:
    async def _run() -> None:
        await scan_router.scan_food(
            file=DummyUploadFile(b"png-bytes", "text/plain"),
            blacklist="[]",
            likes="[]",
            dislikes="[]",
            db=MagicMock(),
            current_user={"username": "demo"},
        )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(_run())

    assert exc_info.value.status_code == 400
    assert exc_info.value.headers["X-Error-Code"] == "INVALID_FILE"


def test_scan_returns_cached_result_without_vision_call(monkeypatch: pytest.MonkeyPatch) -> None:
    cached_result = {
        "recognised": True,
        "confidence": 0.99,
        "food_name": "Apple",
        "nutritional_info": {},
        "assessment_score": 3,
        "assessment": "Cached result",
        "alternatives": [],
    }

    monkeypatch.setattr(scan_router, "hash_image", MagicMock(return_value="image-hash"))
    monkeypatch.setattr(scan_router, "get_cached_result", MagicMock(return_value=cached_result))
    monkeypatch.setattr(scan_router.gemini_service, "analyze_food_image", AsyncMock())

    async def _run():
        return await scan_router.scan_food(
        file=DummyUploadFile(b"image-bytes"),
        blacklist="[]",
        likes="[]",
        dislikes="[]",
        db=MagicMock(),
        current_user={"username": "demo"},
    )

    result = asyncio.run(_run())

    assert result.food_name == "Apple"
    assert result.assessment_score == 3
    scan_router.gemini_service.analyze_food_image.assert_not_awaited()


def test_scan_rejects_non_food_results(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(scan_router, "hash_image", MagicMock(return_value="image-hash"))
    monkeypatch.setattr(scan_router, "get_cached_result", MagicMock(return_value=None))
    monkeypatch.setattr(
        scan_router.gemini_service,
        "analyze_food_image",
        AsyncMock(
            return_value={
                "is_food": False,
                "confidence": 0.98,
                "food_name": "keyboard",
                "primary_object": "keyboard",
                "reject_reason": "not_food",
            }
        ),
    )

    async def _run() -> None:
        await scan_router.scan_food(
            file=DummyUploadFile(b"image-bytes"),
            blacklist="[]",
            likes="[]",
            dislikes="[]",
            db=MagicMock(),
            current_user={"username": "demo"},
        )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(_run())

    assert exc_info.value.status_code == 400
    assert exc_info.value.headers["X-Error-Code"] == "NOT_FOOD"


def test_scan_happy_path_caches_healthy_results(monkeypatch: pytest.MonkeyPatch) -> None:
    cache_result = MagicMock(return_value=True)
    analyze = AsyncMock(return_value=_recognised_payload(score=3))
    score = MagicMock(
        return_value={
            "assessment_score": 3,
            "assessment": "Great choice",
            "score_source": "db",
            "matched_cn_code": 12,
            "health_grade": "A",
        }
    )

    monkeypatch.setattr(scan_router, "hash_image", MagicMock(return_value="image-hash"))
    monkeypatch.setattr(scan_router, "get_cached_result", MagicMock(return_value=None))
    monkeypatch.setattr(scan_router.gemini_service, "analyze_food_image", analyze)
    monkeypatch.setattr(scan_router, "apply_database_first_score", score)
    monkeypatch.setattr(scan_router, "infer_food_category", MagicMock(return_value="fruit"))
    monkeypatch.setattr(scan_router, "cache_result", cache_result)
    monkeypatch.setattr(scan_router, "get_scan_alternatives", MagicMock())

    async def _run():
        return await scan_router.scan_food(
        file=DummyUploadFile(b"image-bytes"),
        blacklist="[]",
        likes="[]",
        dislikes="[]",
        db=MagicMock(),
        current_user={"username": "demo"},
    )

    result = asyncio.run(_run())

    assert result.recognised is True
    assert result.assessment_score == 3
    assert result.alternatives == []
    cache_result.assert_called_once()
    scan_router.get_scan_alternatives.assert_not_called()


def test_scan_generates_alternatives_for_lower_scores(monkeypatch: pytest.MonkeyPatch) -> None:
    cache_result = MagicMock(return_value=True)
    analyze = AsyncMock(return_value=_recognised_payload(food_name="Chocolate cookie", score=1))
    score = MagicMock(
        return_value={
            "assessment_score": 1,
            "assessment": "Try less often",
            "score_source": "db",
            "matched_cn_code": 99,
            "health_grade": "E",
        }
    )
    alternatives = [
        {"name": "Oatmeal Cookie", "description": "A gentler swap"},
        {"name": "Apple Slices", "description": "Naturally sweet"},
    ]

    monkeypatch.setattr(scan_router, "hash_image", MagicMock(return_value="image-hash"))
    monkeypatch.setattr(scan_router, "get_cached_result", MagicMock(return_value=None))
    monkeypatch.setattr(scan_router.gemini_service, "analyze_food_image", analyze)
    monkeypatch.setattr(scan_router, "apply_database_first_score", score)
    monkeypatch.setattr(scan_router, "infer_food_category", MagicMock(return_value="snack"))
    monkeypatch.setattr(scan_router, "cache_result", cache_result)
    monkeypatch.setattr(scan_router, "get_scan_alternatives", MagicMock(return_value=alternatives))

    async def _run():
        return await scan_router.scan_food(
        file=DummyUploadFile(b"image-bytes"),
        blacklist="[]",
        likes="[]",
        dislikes="[]",
        db=MagicMock(),
        current_user={"username": "demo"},
    )

    result = asyncio.run(_run())

    assert result.assessment_score == 1
    assert len(result.alternatives) == 2
    assert "Oatmeal%20Cookie%20food%20photography%20white%20background" in result.alternatives[0].image_url
    cache_result.assert_called_once()
    scan_router.get_scan_alternatives.assert_called_once()
