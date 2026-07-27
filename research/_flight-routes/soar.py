import json,urllib.request,sys

URL="https://mcp.flysoar.ai/mcp"
def _post(payload, sid=None):
    h={'Content-Type':'application/json','Accept':'application/json, text/event-stream'}
    if sid: h['Mcp-Session-Id']=sid
    req=urllib.request.Request(URL,data=json.dumps(payload).encode(),headers=h)
    r=urllib.request.urlopen(req,timeout=60)
    body=r.read().decode()
    for line in body.splitlines():
        if line.startswith('data: '): body=line[6:]
    return r.headers.get('Mcp-Session-Id'), (json.loads(body) if body.strip().startswith('{') else body)

def session():
    sid,_=_post({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"geoalgeria-probe","version":"0"}}})
    _post({"jsonrpc":"2.0","method":"notifications/initialized"},sid)
    return sid

def call(name,args,sid):
    _,d=_post({"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":name,"arguments":args}},sid)
    return d

if __name__=="__main__":
    sid=session()
    d=call("soar_search_flights",{"origin":sys.argv[1],"destination":sys.argv[2],"date":sys.argv[3],"passengers":1},sid)
    print(json.dumps(d,indent=1)[:3000])
