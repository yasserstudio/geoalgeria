import json,time,math,importlib.util,urllib.error
spec=importlib.util.spec_from_file_location("soar","soar.py"); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

C={"TLM":(35.0167,-1.45),"LYS":(45.7256,5.0811),"MRS":(43.4393,5.2214),"CDG":(49.0097,2.5479),
   "ORY":(48.7233,2.3794),"ORN":(35.6394,-0.6212),"BRU":(50.9014,4.4844),"LIS":(38.7742,-9.1342),
   "ETZ":(48.9821,6.2513),"CZL":(36.2760,6.6204),"TLS":(43.6291,1.3638),"BLJ":(35.7521,6.3086),
   "ALG":(36.6910,3.2154),"ZRH":(47.4647,8.5492),"HRG":(27.1783,33.7994),"SSH":(27.9773,34.3950),
   "ADB":(38.2924,27.1570),"BUD":(47.4369,19.2556),"SXB":(48.5383,7.6282),"BJA":(36.7120,5.0699)}
def gc(a,b):
    (la1,lo1),(la2,lo2)=C[a],C[b]
    p1,p2=math.radians(la1),math.radians(la2); dl=math.radians(lo2-lo1)
    return 6371*math.acos(min(1,math.sin(p1)*math.sin(p2)+math.cos(p1)*math.cos(p2)*math.cos(dl)))
def iso_min(s):
    h=mn=0
    if 'H' in s: h=int(s.split('T')[1].split('H')[0]); s2=s.split('H')[1]
    else: s2=s.split('T')[1]
    if 'M' in s2: mn=int(s2.replace('M',''))
    return h*60+mn

PAIRS=[("TLM","LYS"),("TLM","MRS"),("TLM","CDG"),("TLM","ORY"),("ORN","BRU"),("ORN","LIS"),
       ("ORN","ETZ"),("ETZ","ORN"),("CZL","TLS"),("BLJ","CDG"),("BLJ","ORY"),
       ("ALG","HRG"),("ALG","SSH"),("CZL","ADB"),("ALG","BUD"),("BUD","ALG"),("ALG","SXB")]
DATES=["2026-08-%02d"%d for d in range(10,17)]   # Mon 10 Aug .. Sun 16 Aug 2026

out={}; sid=m.session()
for (o,d) in PAIRS:
    rows=[]
    for date in DATES:
        legs=None
        for attempt in range(3):
            try:
                r=m.call("soar_search_flights",{"origin":o,"destination":d,"date":date,"passengers":1,
                    "max_connections":0,"stops":0,"require_origin":[o],"require_destination":[d],"limit":50},sid)
                data=json.loads(r["result"]["content"][0]["text"]); legs=[]
                for off in data.get("offers",[]):
                    for sl in off.get("slices",[]):
                        if sl.get("stops")!=0 or len(sl.get("segments",[]))!=1: continue
                        s=sl["segments"][0]
                        legs.append({"carrier":s.get("carrier_iata"),"fn":s.get("flight_number"),
                                     "dep":s.get("departure"),"dur_min":iso_min(s.get("duration","PT0H0M"))})
                break
            except urllib.error.HTTPError as e:
                if e.code in (400,404): legs=[]; break
                time.sleep(5)
                try: sid=m.session()
                except Exception: pass
            except Exception:
                time.sleep(5)
        if legs is None: legs=[]
        seen=set()
        for l in legs:
            key=(l["carrier"],l["fn"])
            if key in seen: continue
            seen.add(key)
            exp=gc(o,d)/800*60+30
            l["expected_min"]=round(exp)
            l["verdict"]="nonstop" if l["dur_min"]<=exp*1.35 else "LIKELY TECH STOP"
            l["date"]=date; rows.append(l)
        time.sleep(1.5)
    out[f"{o}-{d}"]=rows
    if rows:
        print(f"{o}-{d}:")
        for r in sorted(rows,key=lambda x:(x['carrier'] or '',x['fn'] or '')):
            print(f"   {r['date']} {r['carrier']}{r['fn']} {r['dur_min']}min (exp ~{r['expected_min']}) {r['verdict']}")
    else:
        print(f"{o}-{d}: nothing all week")
json.dump(out,open("soar-week-probe.json","w"),indent=1)
print("\nWROTE soar-week-probe.json")
