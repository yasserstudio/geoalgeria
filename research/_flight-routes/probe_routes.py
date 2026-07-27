import json,time,importlib.util,urllib.error
spec=importlib.util.spec_from_file_location("soar","soar.py"); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

GROUP_A=[("TLM","LYS"),("TLM","MRS"),("TLM","CDG"),("TLM","ORY"),
         ("ORN","BRU"),("ORN","LIS"),("ORN","ETZ"),("CZL","TLS"),("BLJ","CDG")]
GROUP_B=[("ALG","ZRH"),("ALG","HRG"),("ALG","SSH"),("CZL","ADB"),("ALG","BUD"),("BUD","ALG"),("ALG","IST")]
DATES=["2026-08-12","2026-11-18"]

def query(o,d,date,sid):
    return m.call("soar_search_flights",{
        "origin":o,"destination":d,"date":date,"passengers":1,
        "max_connections":0,"stops":0,
        "require_origin":[o],"require_destination":[d],
        "limit":50},sid)

def extract(resp):
    legs=[]
    try:
        txt=resp["result"]["content"][0]["text"]
        data=json.loads(txt)
    except Exception:
        return legs,resp
    for off in data.get("offers",[]):
        for sl in off.get("slices",[]):
            if sl.get("stops")!=0: continue
            segs=sl.get("segments",[])
            if len(segs)!=1: continue
            s=segs[0]
            legs.append({"o":s["origin"],"d":s["destination"],"carrier":s.get("carrier_iata"),
                         "fn":s.get("flight_number"),"dep":s.get("departure"),"dur":s.get("duration")})
    return legs,None

out={}
sid=m.session()
for grp,pairs in (("A",GROUP_A),("B",GROUP_B)):
    for (o,d) in pairs:
        for date in DATES:
            key=f"{o}-{d}@{date}"
            legs=None
            for attempt in range(3):
                try:
                    r=query(o,d,date,sid); legs,err=extract(r); break
                except urllib.error.HTTPError as e:
                    if e.code in (400,404): legs=[]; break
                    time.sleep(5)
                    try: sid=m.session()
                    except Exception: pass
                except Exception:
                    time.sleep(5)
            if legs is None:
                out[key]={"error":"failed after retries"}; print(key,"ERROR"); continue
            uniq={}
            for l in legs:
                uniq.setdefault((l["carrier"],l["fn"]),l)
            out[key]={"group":grp,"nonstop_count":len(legs),
                      "carriers":sorted({l['carrier'] for l in legs if l['carrier']}),
                      "flights":[{"carrier":k[0],"flight_number":k[1],"dep":v["dep"],"dur":v["dur"]} for k,v in uniq.items()]}
            print(key,"->",out[key]["carriers"] or "NO NONSTOP", f"({len(legs)} offers)")
            time.sleep(2)
json.dump(out,open("soar-nonstop-probe.json","w"),indent=1)
print("\nWROTE soar-nonstop-probe.json")
