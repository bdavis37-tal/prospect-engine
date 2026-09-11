"""Durable bounded worker. Run independently with python -m app.worker."""
from __future__ import annotations
import json
import logging
import multiprocessing as mp
import os
import queue
import time
import uuid
from app.storage import connection, initialize
from app.engine.models import PortfolioInput
from app.engine.scenario_engine import analyze
from app.engine.portfolio_optimizer import OptimizationError

logger=logging.getLogger('prospect-engine.worker')


def execute(payload, messages):
    try:
        result=analyze(PortfolioInput.model_validate_json(payload),lambda value,text: messages.put(('progress',value,text)))
        messages.put(('completed',result.model_dump_json()))
    except OptimizationError as exc:
        messages.put(('failed',exc.code,str(exc)))
    except Exception as exc:
        logger.error('run failed type=%s',type(exc).__name__)
        messages.put(('failed','execution_failed','Analysis failed. Check the inputs and retry.'))


def tick(worker_id):
    now=time.time()
    with connection() as db:
        db.execute('INSERT OR REPLACE INTO worker_health VALUES(?,?)',(worker_id,now))
        db.execute("UPDATE jobs SET status='failed',error_code='interrupted',message='Worker stopped before completion. Retry this run.',updated=? WHERE status IN ('running','cancelling') AND updated<?",(now,now-60))
        db.execute('DELETE FROM worker_health WHERE heartbeat<?',(now-86400,))


def run_one(worker_id='test-worker', timeout_seconds=None):
    tick(worker_id)
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        row=db.execute("SELECT * FROM jobs WHERE status='queued' ORDER BY created LIMIT 1").fetchone()
        if row is None: return False
        db.execute("UPDATE jobs SET status='running',updated=?,message='Starting simulation' WHERE id=?",(time.time(),row['id']))
    context=mp.get_context('spawn')
    messages=context.Queue()
    process=context.Process(target=execute,args=(row['input'],messages),daemon=True)
    process.start()
    start=time.monotonic()
    limit=timeout_seconds if timeout_seconds is not None else int(os.environ.get('JOB_TIMEOUT_SECONDS','300'))
    terminal=False
    try:
        while not terminal:
            tick(worker_id)
            with connection() as db:
                status=db.execute('SELECT status FROM jobs WHERE id=?',(row['id'],)).fetchone()[0]
                if status=='cancelling':
                    db.execute("UPDATE jobs SET status='cancelled',message='Run cancelled',updated=? WHERE id=?",(time.time(),row['id']))
                    break
                if time.monotonic()-start > limit:
                    db.execute("UPDATE jobs SET status='failed',error_code='timeout',message='Run exceeded execution limit. Reduce workload and retry.',updated=? WHERE id=?",(time.time(),row['id']))
                    break
                db.execute('UPDATE jobs SET updated=? WHERE id=?',(time.time(),row['id']))
            try:
                message=messages.get(timeout=.5)
            except queue.Empty:
                if not process.is_alive():
                    # Queue feeder can lag process termination; give it one bounded read.
                    try: message=messages.get(timeout=1)
                    except queue.Empty: message=('failed','worker_crashed','Worker exited unexpectedly. Retry the run.')
                else: continue
            with connection() as db:
                if message[0]=='progress':
                    db.execute('UPDATE jobs SET progress=?,message=?,updated=? WHERE id=? AND status=\'running\'',(message[1],message[2],time.time(),row['id']))
                elif message[0]=='completed':
                    db.execute("UPDATE jobs SET status='completed',progress=1,message='Analysis complete',result=?,updated=? WHERE id=? AND status='running'",(message[1],time.time(),row['id']))
                    terminal=True
                else:
                    db.execute("UPDATE jobs SET status='failed',error_code=?,message=?,updated=? WHERE id=? AND status='running'",(message[1],message[2],time.time(),row['id']))
                    terminal=True
                if terminal:
                    # Cancellation wins a race with a result; never leave a cancelling job orphaned.
                    db.execute("UPDATE jobs SET status='cancelled',message='Run cancelled',updated=? WHERE id=? AND status='cancelling'",(time.time(),row['id']))
    finally:
        if process.is_alive(): process.terminate()
        process.join(timeout=5)
        if process.is_alive(): process.kill(); process.join(timeout=5)
        messages.close()
    logger.info('run finished id=%s elapsed=%.2f',row['id'],time.monotonic()-start)
    return True


def main():
    logging.basicConfig(level=logging.INFO)
    initialize()
    worker_id=str(uuid.uuid4())
    while True:
        if not run_one(worker_id): time.sleep(1)


if __name__=='__main__': main()
