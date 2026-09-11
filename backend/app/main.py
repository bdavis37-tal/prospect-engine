from __future__ import annotations
import logging
import os
import secrets
import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from app.auth import configure_auth, router as auth_router
from app.api.routes import router
from app.storage import initialize

logging.basicConfig(level=logging.INFO)
logger=logging.getLogger('prospect-engine')


@asynccontextmanager
async def lifespan(app):
    configure_auth()
    initialize()
    yield


app=FastAPI(title='Prospect Engine API',version='2.0.0',lifespan=lifespan,docs_url=None if os.environ.get('APP_ENV')=='production' else '/docs')
app.add_middleware(SessionMiddleware,secret_key=os.environ.get('SESSION_SECRET') or secrets.token_urlsafe(48),
                   session_cookie='prospect_session',max_age=8*3600,same_site='lax',https_only=os.environ.get('AUTH_MODE')=='oidc')
app.include_router(auth_router)
app.include_router(router)


@app.middleware('http')
async def controls(request: Request, call_next):
    request_id=str(uuid.uuid4()); start=time.monotonic()
    request.state.request_id=request_id
    # Stream with a hard cap, including chunked requests with no Content-Length.
    if request.method in {'POST','PUT','PATCH'}:
        body=bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body)>2_000_000:
                return JSONResponse({'detail':'Request is too large','request_id':request_id},status_code=413)
        request._body=bytes(body)
    response=await call_next(request)
    response.headers['X-Request-ID']=request_id
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['Cache-Control']='no-store'
    logger.info('request id=%s method=%s path=%s status=%s duration_ms=%.0f',request_id,request.method,request.url.path,response.status_code,(time.monotonic()-start)*1000)
    return response


@app.exception_handler(RequestValidationError)
async def validation(request, exc):
    # Do not echo request values: validation errors can contain private inputs.
    fields=[{'field':'.'.join(str(v) for v in e['loc'][1:]),'message':e['msg']} for e in exc.errors()]
    return JSONResponse({'detail':'Check the highlighted inputs','fields':fields,'request_id':request.state.request_id},status_code=422)


@app.exception_handler(HTTPException)
async def http_error(request, exc):
    return JSONResponse({'detail':exc.detail,'request_id':request.state.request_id},status_code=exc.status_code,headers=exc.headers)


@app.exception_handler(Exception)
async def unexpected(request, exc):
    logger.error('request failed id=%s type=%s',request.state.request_id,type(exc).__name__)
    return JSONResponse({'detail':'An unexpected error occurred. Retry or contact support with the request ID.','request_id':request.state.request_id},status_code=500)
