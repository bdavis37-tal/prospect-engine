import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.auth import current_user
from app.worker import run_one
from pathlib import Path

HEADERS={'x-requested-with':'prospect-engine','origin':'http://localhost:5173'}


@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setenv('DATABASE_PATH',str(tmp_path/'test.sqlite3'))
    monkeypatch.setenv('AUTH_MODE','local')
    with TestClient(app) as c: yield c
    app.dependency_overrides.clear()


def payload():
    prospect=json.loads((Path(__file__).parent/'fixtures/single_prospect_permian.json').read_text())
    prospect['decline_params']['well_life_years']=3
    return {'name':'Verified run','prospects':[prospect],'capital_budget':50000000,'simulation_iterations':100,
            'price_scenarios':[{'scenario_name':'Base','oil_price_deck':[{'year':y,'price_per_unit':75} for y in range(1,4)],
                              'gas_price_deck':[{'year':y,'price_per_unit':3} for y in range(1,4)],'price_volatility':0}]}


def create(c):
    r=c.post('/api/portfolios',json={'input':payload()},headers=HEADERS)
    assert r.status_code==201,r.text
    return r.json()


def test_saved_run_lifecycle_and_idempotency(client):
    p=create(client)
    data={'portfolio_id':p['id'],'input':payload()}
    headers={**HEADERS,'Idempotency-Key':'lifecycle-key'}
    r=client.post('/api/jobs',json=data,headers=headers)
    assert r.status_code==202,r.text
    id=r.json()['id']
    assert client.post('/api/jobs',json=data,headers=headers).json()['id']==id
    assert run_one(timeout_seconds=30)
    job=client.get('/api/jobs/'+id).json()
    assert job['status']=='completed',job
    result=client.get('/api/jobs/'+id+'/result').json()
    assert result['input']['name']=='Verified run'
    assert result['input_hash']==job['input_hash']
    assert len(result['scenario_comparison']['scenario_results'][0]['prospect_results'])==1
    assert client.get('/api/portfolios').json()[0]['revision']==1


def test_ownership_and_csrf(client):
    p=create(client)
    assert client.post('/api/portfolios',json={'input':payload()}).status_code==403
    assert client.post('/api/portfolios',json={'input':payload()},headers={**HEADERS,'origin':'https://attacker.test'}).status_code==403
    app.dependency_overrides[current_user]=lambda:'another-user'
    assert client.get('/api/portfolios').json()==[]
    assert client.put('/api/portfolios/'+p['id'],json={'input':payload(),'revision':1},headers=HEADERS).status_code==404
    assert client.post('/api/jobs',json={'portfolio_id':p['id'],'input':payload()},headers={**HEADERS,'Idempotency-Key':'other-user-key'}).status_code==404


def test_stale_save_cancel_and_timeout(client):
    p=create(client)
    assert client.put('/api/portfolios/'+p['id'],json={'input':payload(),'revision':2},headers=HEADERS).status_code==409
    def submit(key): return client.post('/api/jobs',json={'portfolio_id':p['id'],'input':payload()},headers={**HEADERS,'Idempotency-Key':key}).json()['id']
    id=submit('cancelled-key')
    assert client.post('/api/jobs/'+id+'/cancel',headers=HEADERS).json()['status']=='cancelled'
    assert not run_one()
    id=submit('timeout-key')
    run_one(timeout_seconds=0)
    assert client.get('/api/jobs/'+id).json()['error_code']=='timeout'


def test_validation_is_bounded_and_does_not_echo_inputs(client):
    data=payload();data['simulation_iterations']=100000000
    r=client.post('/api/portfolios',json={'input':data},headers=HEADERS)
    assert r.status_code==422
    assert '100000000' not in r.text
    assert r.json()['fields'][0]['field']=='input.simulation_iterations'
    assert client.post('/api/portfolios',content='x'*2000001,headers=HEADERS).status_code==413
