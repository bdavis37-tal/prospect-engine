from __future__ import annotations
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path


def database_path():
    return Path(os.environ.get('DATABASE_PATH', 'data/prospect-engine.sqlite3')).resolve()


@contextmanager
def connection():
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=30)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    try:
        yield db
        db.commit()
    except BaseException:
        db.rollback()
        raise
    finally:
        db.close()


def initialize():
    with connection() as db:
        db.execute('PRAGMA journal_mode=WAL')
        if db.execute("SELECT 1 FROM sqlite_master WHERE name='schema_version'").fetchone():
            versions = [row[0] for row in db.execute('SELECT version FROM schema_version')]
            if versions != [1]: raise RuntimeError('Unsupported database schema; use the documented migration or restore procedure')
        db.executescript('''
        CREATE TABLE IF NOT EXISTS schema_version(version INTEGER PRIMARY KEY);
        INSERT OR IGNORE INTO schema_version VALUES(1);
        CREATE TABLE IF NOT EXISTS portfolios(
            id TEXT PRIMARY KEY, owner TEXT NOT NULL, name TEXT NOT NULL, input TEXT NOT NULL,
            revision INTEGER NOT NULL DEFAULT 1, updated REAL NOT NULL);
        CREATE INDEX IF NOT EXISTS portfolios_owner ON portfolios(owner,updated);
        CREATE TABLE IF NOT EXISTS jobs(
            id TEXT PRIMARY KEY, owner TEXT NOT NULL, portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
            input TEXT NOT NULL, input_hash TEXT NOT NULL, model_version TEXT NOT NULL,
            status TEXT NOT NULL, progress REAL NOT NULL DEFAULT 0, message TEXT NOT NULL DEFAULT '',
            result TEXT, error_code TEXT, created REAL NOT NULL, updated REAL NOT NULL,
            idempotency_key TEXT NOT NULL, UNIQUE(owner,idempotency_key));
        CREATE INDEX IF NOT EXISTS jobs_owner ON jobs(owner,created);
        CREATE INDEX IF NOT EXISTS jobs_queue ON jobs(status,created);
        CREATE TABLE IF NOT EXISTS worker_health(id TEXT PRIMARY KEY, heartbeat REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS audit_events(id INTEGER PRIMARY KEY, owner TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL, created REAL NOT NULL);
        ''')
