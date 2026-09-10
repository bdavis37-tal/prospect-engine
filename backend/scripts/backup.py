"""Create consistent SQLite backups and verify restoration into a NEW file."""
import argparse
import sqlite3
from pathlib import Path


def copy_database(source: Path, destination: Path):
    if not source.is_file(): raise ValueError('Source database does not exist')
    if destination.exists(): raise ValueError('Destination must be a new file; existing data is never overwritten')
    destination.parent.mkdir(parents=True,exist_ok=True)
    with sqlite3.connect(f'{source.resolve().as_uri()}?mode=ro',uri=True) as src, sqlite3.connect(destination) as dst:
        src.backup(dst)
        if dst.execute('PRAGMA integrity_check').fetchone()[0]!='ok': raise ValueError('Integrity check failed')
        version=dst.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]
        if version!=1: raise ValueError('Unsupported database schema')
        counts={t:dst.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0] for t in ['portfolios','jobs','audit_events']}
    return counts


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path);parser.add_argument('destination',type=Path)
    args=parser.parse_args();print(copy_database(args.source,args.destination))
