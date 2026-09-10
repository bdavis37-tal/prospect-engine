"""CI-only loopback smoke test: preserve result hashes across a container restart."""
import json
import sys
from pathlib import Path
from urllib.request import urlopen

base = "http://127.0.0.1:8080/api"
def get(path):
    with urlopen(base+path,timeout=20) as response: return json.load(response)

path = Path("artifacts/restart-snapshot.json")
if sys.argv[1] == "snapshot":
    jobs = [j for j in get("/jobs") if j["status"]=="completed"]
    assert jobs, "Browser tests must complete a real run first"
    hashes={j["id"]:get("/jobs/"+j["id"]+"/result")["input_hash"] for j in jobs}
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(hashes),encoding="utf-8")
else:
    for id, digest in json.loads(path.read_text(encoding="utf-8")).items():
        assert get("/jobs/"+id+"/result")["input_hash"]==digest
    assert get("/ready")["status"]=="ready"
    print("Container restart preserved saved result fingerprints")
