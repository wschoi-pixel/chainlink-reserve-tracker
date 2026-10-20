"""Generate explicitly synthetic demo data for local visual preview only."""
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import hashlib
import json
from pathlib import Path
from update_data import assemble

base=datetime(2025,8,7,tzinfo=timezone.utc)
end=datetime(2026,10,15,tzinfo=timezone.utc)
items=[]
i=0
while base+timedelta(weeks=i)<end:
    t=base+timedelta(weeks=i)
    amount=60000 + (i*1777)%58000
    price=9.7 + (i%11)*0.47
    tx='0x'+hashlib.sha256(f'synthetic-demo-{i}'.encode()).hexdigest()
    items.append({'id':tx+':0','tx_hash':tx,'log_index':0,'timestamp':t.isoformat(timespec='seconds').replace('+00:00','Z'),
                 'direction':'in','link':amount,'usd_price_at_transfer':round(price,3),'usd_estimate':round(amount*price,2)})
    i+=1
value=Decimal(str(sum(x['link'] for x in items)))
price=12.35
market={'link_usd':price,'market_cap_usd':9_250_000_000,'circulating_supply_link':750_000_000,'source':'SYNTHETIC DEMO','quoted_at':'2026-10-20T00:00:00Z'}
result=assemble(items,value,market,'2026-10-20T00:00:00Z')
result['demo']=True
Path(__file__).resolve().parents[1].joinpath('data/demo.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
