"""
Add the backend package to sys.path so that `app.*` imports resolve
when running pytest from the repository root.
"""
import os
import sys

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "nutri-health-api"))
sys.path.insert(0, BACKEND_ROOT)

# Avoid import-time failures when database.py requires DATABASE_URL.
# Use a PostgreSQL-style URL so SQLAlchemy pool options are accepted.
os.environ.setdefault(
	"DATABASE_URL",
	"postgresql+psycopg2://user:password@localhost:5432/nutrihealth",
)
