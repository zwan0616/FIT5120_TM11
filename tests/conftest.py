"""
Add the project root to sys.path so that `app.*` imports resolve
when running pytest from the nutri-health-api/ directory.
"""
import os
import sys

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "nutri-health-api"))
sys.path.insert(0, BACKEND_ROOT)
