import pytest


@pytest.fixture()
def reason_builder_module():
    from app.services import reason_builder

    return reason_builder


def test_super_power_reason_mentions_goal_and_likes(reason_builder_module):
    reason = reason_builder_module.build_personalized_reason(
        food_name="Apple",
        category="fruits",
        section_name="super_power_foods",
        goal_id="grow",
        likes=["fruits"],
        dislikes=[],
    )

    assert "Grow Up" in reason
    assert "support strong and steady growth" in reason
    assert "Since you like fruits" in reason
    assert "It can add natural sweetness and helpful vitamins." in reason


def test_tiny_hero_reason_handles_disliked_category_with_plural_grammar(reason_builder_module):
    reason = reason_builder_module.build_personalized_reason(
        food_name="Blueberries",
        category="fruits",
        section_name="tiny_hero_foods",
        goal_id="grow",
        likes=[],
        dislikes=["fruits"],
    )

    assert "they can support strong and steady growth" in reason.lower()
    assert "Even if fruits are not your favorite" in reason


def test_try_less_reason_uses_plural_verb_agreement(reason_builder_module):
    reason = reason_builder_module.build_personalized_reason(
        food_name="Cookies",
        category="snacks",
        section_name="try_less_foods",
        goal_id="feel",
        likes=[],
        dislikes=[],
    )

    assert "Feel Good" in reason
    assert "they do not give much steady fuel" in reason.lower()


def test_unknown_section_falls_back_to_generic_sentence(reason_builder_module):
    reason = reason_builder_module.build_personalized_reason(
        food_name="Tofu",
        category="beans",
        section_name="other",
        goal_id="see",
        likes=[],
        dislikes=[],
    )

    assert "food choices for See Clear" in reason


def test_reason_does_not_use_banned_words(reason_builder_module):
    reason = reason_builder_module.build_personalized_reason(
        food_name="Apple",
        category="fruits",
        section_name="super_power_foods",
        goal_id="grow",
        likes=[],
        dislikes=[],
    )

    lowered = reason.lower()
    for word in reason_builder_module.BANNED_WORDS:
        assert word not in lowered
