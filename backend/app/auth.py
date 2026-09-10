from __future__ import annotations
import os
import hashlib
import secrets
from urllib.parse import urlparse
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request
from starlette.responses import RedirectResponse

router = APIRouter(prefix='/api/auth', tags=['identity'])
oauth = OAuth()


def configure_auth():
    mode = os.environ.get('AUTH_MODE', 'local')
    production = os.environ.get('APP_ENV') == 'production'
    if mode not in {'local','oidc'}:
        raise RuntimeError('AUTH_MODE must be local or oidc')
    if production and mode != 'oidc':
        raise RuntimeError('Production requires managed OIDC authentication')
    if mode == 'oidc':
        required = ['OIDC_CLIENT_ID','OIDC_CLIENT_SECRET','OIDC_METADATA_URL','PUBLIC_ORIGIN','SESSION_SECRET','OIDC_ALLOWED_SUBJECTS']
        if any(not os.environ.get(k) for k in required):
            raise RuntimeError('OIDC configuration is incomplete: ' + ', '.join(required))
        if len(os.environ['SESSION_SECRET']) < 32:
            raise RuntimeError('SESSION_SECRET must contain at least 32 random characters')
        if not os.environ['PUBLIC_ORIGIN'].startswith('https://') or not os.environ['OIDC_METADATA_URL'].startswith('https://'):
            raise RuntimeError('OIDC and public origins must use HTTPS')
        oauth.register('identity', client_id=os.environ['OIDC_CLIENT_ID'], client_secret=os.environ['OIDC_CLIENT_SECRET'],
                       server_metadata_url=os.environ['OIDC_METADATA_URL'], client_kwargs={'scope':'openid profile email', 'code_challenge_method':'S256'})


def current_user(request: Request) -> str:
    mode = os.environ.get('AUTH_MODE','local')
    if mode == 'local':
        # Explicit loopback development only. Remote deployments must use OIDC.
        if request.url.hostname not in {'localhost','127.0.0.1','testserver'}:
            raise HTTPException(403, 'Local mode is restricted to loopback hosts')
        owner = 'local-developer'
    else:
        owner = request.session.get('owner')
        if not owner:
            raise HTTPException(401, 'Sign in to access saved work')
    if request.method not in {'GET','HEAD','OPTIONS'}:
        if len(request.headers.getlist('origin')) > 1:
            raise HTTPException(403, 'Multiple request origins are not allowed')
        origin = request.headers.get('origin')
        expected = os.environ.get('PUBLIC_ORIGIN', '').rstrip('/')
        allowed = origin == expected if mode != 'local' else urlparse(origin or '').hostname in {'localhost','127.0.0.1','testserver'}
        if origin and not allowed:
            raise HTTPException(403, 'Request origin is not allowed')
        if request.headers.get('x-requested-with') != 'prospect-engine':
            raise HTTPException(403, 'Required request verification header is missing')
    return owner


@router.get('/me')
def me(request: Request, owner: str = Depends(current_user)):
    return {'name': request.session.get('name','Local workspace'), 'mode':os.environ.get('AUTH_MODE','local'), 'workspace_id':hashlib.sha256(owner.encode()).hexdigest()[:24]}


@router.get('/login')
async def login(request: Request):
    if os.environ.get('AUTH_MODE','local') == 'local': return RedirectResponse('/')
    return await oauth.identity.authorize_redirect(request, os.environ['PUBLIC_ORIGIN'].rstrip('/') + '/api/auth/callback')


@router.get('/callback')
async def callback(request: Request):
    if os.environ.get('AUTH_MODE','local') != 'oidc': raise HTTPException(404)
    try:
        token = await oauth.identity.authorize_access_token(request)
        info = token['userinfo']  # Authlib validates issuer, audience, signature, state and nonce.
        if info['sub'] not in {v.strip() for v in os.environ['OIDC_ALLOWED_SUBJECTS'].split(',')}:
            raise ValueError('Not authorized')
        request.session.clear()
        request.session.update(owner=info['iss'] + '|' + info['sub'], name=info.get('name','Analyst'))
    except Exception:
        request.session.clear()
        raise HTTPException(401, 'Sign-in failed or your account is not authorized') from None
    return RedirectResponse('/')


@router.post('/logout')
def logout(request: Request, owner: str = Depends(current_user)):
    request.session.clear()
    return {'status':'signed_out'}
