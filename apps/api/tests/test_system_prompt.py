import pytest
import os
import sys

# Ensure repo root and apps/api are in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ai.prompts.system_prompt import get_system_prompt, _LEVEL_PERSONAS


def test_system_prompt_vaani_persona():
    for level, persona in _LEVEL_PERSONAS.items():
        assert "Vaani (ResearchMind AI)" in persona
        assert "J.A.R.V.I.S" not in persona


def test_get_system_prompt_modes_and_levels():
    prompt_btech = get_system_prompt(level="btech", language="English", mode="teach")
    assert "Vaani (ResearchMind AI)" in prompt_btech
    assert "TEACH MODE" in prompt_btech

    prompt_phd = get_system_prompt(level="phd", language="English", mode="debate", enable_quality_tracker=True)
    assert "Vaani (ResearchMind AI)" in prompt_phd
    assert "DEBATE MODE" in prompt_phd
    assert "QUALITY TRACKING" in prompt_phd


def test_get_system_prompt_language():
    prompt_hindi = get_system_prompt(level="mtech", language="Hindi")
    assert "Respond primarily in Hindi" in prompt_hindi
