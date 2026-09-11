from __future__ import annotations
import json
import time
import uuid
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import Field
from app.auth import current_user
from app.engine.models import BaseModel, PortfolioInput, AnalysisResult
from app.engine.scenario_engine import MODEL_VERSION, input_hash
from app.storage import connection

router = APIRouter(prefix='/api', tags=['portfolio'])


class PortfolioWrite(BaseModel):
    input: PortfolioInput
    revision: int | None = Field(default=None, ge=1)


class RunRequest(BaseModel):
    portfolio_id: str
    input: PortfolioInput


class PortfolioRecord(BaseModel):
    id: str
    name: str
    input: PortfolioInput
    revision: int
    updated: float


class JobRecord(BaseModel):
    id: str
    portfolio_id: str
    input_hash: str
    model_version: str
    status: str
    progress: float
    message: str
    error_code: str | None
    created: float
    updated: float


def owned(db, table, id, owner):
    # Table is selected only by our code, never user input.
    row = db.execute(f'SELECT * FROM {table} WHERE id=? AND owner=?',(id,owner)).fetchone()
    if row is None: raise HTTPException(404,'Not found')
    return row


def record(row):
    return {k: row[k] for k in JobRecord.model_fields}


def portfolio_record(row):
    return {**{k:row[k] for k in ['id','name','revision','updated']},'input':json.loads(row['input'])}


def audit(db, owner, action, resource):
    db.execute('INSERT INTO audit_events(owner,action,resource,created) VALUES(?,?,?,?)',(owner,action,resource,time.time()))


@router.get('/health')
def health(): return {'status':'ok','model_version':MODEL_VERSION}


@router.get('/ready')
def ready():
    with connection() as db:
        db.execute('SELECT version FROM schema_version').fetchone()
        heartbeat = db.execute('SELECT MAX(heartbeat) FROM worker_health').fetchone()[0]
    if heartbeat is None or heartbeat < time.time()-30: raise HTTPException(503,'Worker is unavailable')
    return {'status':'ready'}


@router.get('/portfolios', response_model=list[PortfolioRecord])
def portfolios(owner: str = Depends(current_user)):
    with connection() as db:
        return [portfolio_record(r) for r in db.execute('SELECT * FROM portfolios WHERE owner=? ORDER BY updated DESC LIMIT 100',(owner,))]


@router.post('/portfolios', response_model=PortfolioRecord, status_code=201)
def create_portfolio(payload: PortfolioWrite, owner: str = Depends(current_user)):
    id = str(uuid.uuid4())
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        if db.execute('SELECT COUNT(*) FROM portfolios WHERE owner=?',(owner,)).fetchone()[0] >= 100:
            raise HTTPException(429,'Workspace portfolio limit reached')
        db.execute('INSERT INTO portfolios(id,owner,name,input,updated) VALUES(?,?,?,?,?)',(id,owner,payload.input.name,payload.input.model_dump_json(),time.time()))
        audit(db,owner,'portfolio.created',id)
        return portfolio_record(owned(db,'portfolios',id,owner))


@router.put('/portfolios/{id}', response_model=PortfolioRecord)
def save_portfolio(id: str, payload: PortfolioWrite, owner: str = Depends(current_user)):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        row=owned(db,'portfolios',id,owner)
        if payload.revision != row['revision']: raise HTTPException(409,'This portfolio changed in another session. Reload before saving.')
        db.execute('UPDATE portfolios SET name=?,input=?,revision=revision+1,updated=? WHERE id=?',(payload.input.name,payload.input.model_dump_json(),time.time(),id))
        audit(db,owner,'portfolio.saved',id)
        return portfolio_record(owned(db,'portfolios',id,owner))


@router.post('/jobs', response_model=JobRecord, status_code=202)
def submit(payload: RunRequest, idempotency_key: str = Header(min_length=8,max_length=100), owner: str = Depends(current_user)):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        owned(db,'portfolios',payload.portfolio_id,owner)
        existing=db.execute('SELECT * FROM jobs WHERE owner=? AND idempotency_key=?',(owner,idempotency_key)).fetchone()
        digest=input_hash(payload.input)
        if existing:
            if existing['input_hash'] != digest or existing['portfolio_id'] != payload.portfolio_id:
                raise HTTPException(409,'This request key was already used for different inputs')
            return record(existing)
        active=db.execute("SELECT COUNT(*) FROM jobs WHERE owner=? AND status IN ('queued','running','cancelling')",(owner,)).fetchone()[0]
        recent=db.execute('SELECT COUNT(*) FROM jobs WHERE owner=? AND created>?',(owner,time.time()-3600)).fetchone()[0]
        queued=db.execute("SELECT COUNT(*) FROM jobs WHERE status IN ('queued','running','cancelling')").fetchone()[0]
        total=db.execute('SELECT COUNT(*) FROM jobs WHERE owner=?',(owner,)).fetchone()[0]
        if active >= 2 or recent >= 30 or queued >= 16 or total >= 1000:
            raise HTTPException(429,'Run quota reached. Wait for active runs to finish or contact the administrator.')
        id=str(uuid.uuid4()); now=time.time()
        db.execute('INSERT INTO jobs(id,owner,portfolio_id,input,input_hash,model_version,status,created,updated,idempotency_key) VALUES(?,?,?,?,?,?,?,?,?,?)',
                   (id,owner,payload.portfolio_id,payload.input.model_dump_json(),digest,MODEL_VERSION,'queued',now,now,idempotency_key))
        audit(db,owner,'run.queued',id)
        return record(owned(db,'jobs',id,owner))


@router.get('/jobs',response_model=list[JobRecord])
def jobs(portfolio_id: str | None = None, owner: str = Depends(current_user)):
    with connection() as db:
        return [record(r) for r in db.execute('SELECT * FROM jobs WHERE owner=? AND (? IS NULL OR portfolio_id=?) ORDER BY created DESC LIMIT 100',(owner,portfolio_id,portfolio_id))]


@router.get('/jobs/{id}',response_model=JobRecord)
def job(id: str, owner: str = Depends(current_user)):
    with connection() as db: return record(owned(db,'jobs',id,owner))


@router.get('/jobs/{id}/result',response_model=AnalysisResult)
def result(id: str, owner: str = Depends(current_user)):
    with connection() as db:
        row=owned(db,'jobs',id,owner)
        if row['status'] != 'completed': raise HTTPException(409,'Results are not available until the run completes')
        try:
            return AnalysisResult.model_validate_json(row['result'])
        except ValueError:
            raise HTTPException(409,'This saved run uses an earlier result format. Re-run its saved inputs with the current model.') from None


@router.post('/jobs/{id}/cancel',response_model=JobRecord)
def cancel(id: str, owner: str = Depends(current_user)):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        row=owned(db,'jobs',id,owner)
        if row['status'] in {'queued','running'}:
            state='cancelled' if row['status']=='queued' else 'cancelling'
            db.execute('UPDATE jobs SET status=?,updated=? WHERE id=?',(state,time.time(),id))
            audit(db,owner,'run.cancelled',id)
        return record(owned(db,'jobs',id,owner))


@router.get('/metrics')
def metrics(owner: str = Depends(current_user)):
    with connection() as db:
        counts={r['status']:r['n'] for r in db.execute('SELECT status,COUNT(*) n FROM jobs WHERE owner=? GROUP BY status',(owner,))}
    return {'runs':counts}
