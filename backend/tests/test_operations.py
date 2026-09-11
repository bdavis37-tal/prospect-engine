import asyncio
import time
import pytest
from starlette.requests import Request
from fastapi import HTTPException
from app.auth import configure_auth, current_user, callback, oauth
from app.storage import initialize, connection
from app.worker import tick
from scripts.backup import copy_database


def request(method="GET", session=None, headers=()):
    return Request({"type":"http","method":method,"scheme":"https","path":"/api/portfolios","server":("app.example",443),"headers":list(headers),"session":session or {}})


def test_production_refuses_local_or_incomplete_identity(monkeypatch):
    monkeypatch.setenv("APP_ENV","production")
    monkeypatch.setenv("AUTH_MODE","local")
    with pytest.raises(RuntimeError,match="requires"): configure_auth()
    monkeypatch.setenv("AUTH_MODE","oidc")
    monkeypatch.delenv("OIDC_CLIENT_ID",raising=False)
    with pytest.raises(RuntimeError,match="incomplete"): configure_auth()


def test_oidc_requires_identity_and_rejects_forged_origin(monkeypatch):
    monkeypatch.setenv("AUTH_MODE","oidc")
    monkeypatch.setenv("PUBLIC_ORIGIN","https://app.example")
    with pytest.raises(HTTPException) as error: current_user(request())
    assert error.value.status_code==401
    assert current_user(request(session={"owner":"issuer|sub"}))=="issuer|sub"
    headers=[(b"origin",b"https://attacker.example"),(b"x-requested-with",b"prospect-engine")]
    with pytest.raises(HTTPException) as error: current_user(request("POST",{"owner":"issuer|sub"},headers))
    assert error.value.status_code==403


def test_callback_rejects_unlisted_identity_and_clears_session(monkeypatch):
    monkeypatch.setenv("AUTH_MODE","oidc")
    monkeypatch.setenv("OIDC_ALLOWED_SUBJECTS","approved")
    class Identity:
        async def authorize_access_token(self, request):
            return {"userinfo":{"sub":"unapproved","iss":"https://issuer.example"}}
    monkeypatch.setitem(oauth._clients,"identity",Identity())
    req=request(session={"owner":"old"})
    with pytest.raises(HTTPException) as error: asyncio.run(callback(req))
    assert error.value.status_code==401
    assert req.session=={}


def test_backup_restore_preserves_rows_and_refuses_overwrite(tmp_path,monkeypatch):
    original=tmp_path/"live.sqlite3"
    monkeypatch.setenv("DATABASE_PATH",str(original)); initialize()
    with connection() as db:
        db.execute("INSERT INTO portfolios VALUES(?,?,?,?,?,?)",("p","owner","Saved","{}",3,time.time()))
        db.execute("INSERT INTO audit_events(owner,action,resource,created) VALUES(?,?,?,?)",("owner","save","p",time.time()))
    backup=tmp_path/"backup.sqlite3"; restored=tmp_path/"restored.sqlite3"
    assert copy_database(original,backup)=={"portfolios":1,"jobs":0,"audit_events":1}
    assert copy_database(backup,restored)=={"portfolios":1,"jobs":0,"audit_events":1}
    with pytest.raises(ValueError,match="new file"): copy_database(original,restored)
    monkeypatch.setenv("DATABASE_PATH",str(restored))
    with connection() as db: assert db.execute("SELECT revision FROM portfolios").fetchone()[0]==3


def test_worker_recovers_orphaned_run(tmp_path,monkeypatch):
    monkeypatch.setenv("DATABASE_PATH",str(tmp_path/"db.sqlite3")); initialize()
    with connection() as db:
        db.execute("INSERT INTO portfolios VALUES(?,?,?,?,?,?)",("p","o","P","{}",1,0))
        db.execute("INSERT INTO jobs(id,owner,portfolio_id,input,input_hash,model_version,status,created,updated,idempotency_key) VALUES(?,?,?,?,?,?,?,?,?,?)",("j","o","p","{}","hash","2.0.0","running",0,0,"key"))
    tick("restarted-worker")
    with connection() as db:
        row=db.execute("SELECT status,error_code FROM jobs").fetchone()
        assert tuple(row)==("failed","interrupted")
