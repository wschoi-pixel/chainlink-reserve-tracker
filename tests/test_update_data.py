import json
from pathlib import Path
import sys
import unittest
from datetime import datetime, timezone
from decimal import Decimal
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import update_data as c


TX_A = '0x' + 'a' * 64
TX_B = '0x' + 'b' * 64
TX_C = '0x' + 'c' * 64


def transfer(tx, direction, link, when='2026-10-15T12:00:00Z', index=1, token=c.LINK):
    reserve = {'hash': c.RESERVE}
    outside = {'hash': '0x'+'1'*40}
    return {'transaction_hash': tx, 'log_index': index, 'timestamp': when,
            'from': outside if direction=='in' else reserve,
            'to': reserve if direction=='in' else outside,
            'token': {'address': token, 'decimals': '18'},
            'total': {'value': str(int(Decimal(str(link)) * 10**18)), 'decimals': '18'}}


class MockHttp:
    def __init__(self):
        self.history_pages = [
            {'items': [transfer(TX_B, 'in', '75', index=2), transfer(TX_A, 'in', '100', when='2026-09-01T00:00:00Z'),
                       transfer(TX_A, 'in', '100', when='2026-09-01T00:00:00Z')], 'next_page_params': {'page': '2'}},
            {'items': [transfer(TX_C, 'out', '5', when='2026-10-17T00:00:00Z'),
                       transfer(TX_A, 'in', '3', when='2026-09-01T00:00:00Z', index=3),
                       transfer(TX_A, 'in', '10', when='2026-09-01T00:00:00Z', index=4, token='0x'+'4'*40)], 'next_page_params': None}
        ]
        self.urls=[]
        self.price_available=True

    def get(self, url):
        self.urls.append(url)
        parsed=urlparse(url)
        if '/token-transfers' in parsed.path:
            return self.history_pages[1 if parse_qs(parsed.query).get('page')==['2'] else 0]
        if '/token-balances' in parsed.path:
            return [{'token': {'address': c.LINK, 'decimals': '18'}, 'value': str(173*10**18)}]
        if '/coins/markets' in parsed.path:
            return [{'id':'chainlink','current_price':12,'market_cap':9_000_000_000,'circulating_supply':750_000_000}]
        if '/batchHistorical' in parsed.path:
            if not self.price_available:raise RuntimeError('price timeout')
            payload=json.loads(parse_qs(parsed.query)['coins'][0]); timestamps=payload[c.COIN]
            return {'coins': {c.COIN: {'prices': [{'timestamp':t,'price':12,'confidence':.99} for t in timestamps]}}}
        raise AssertionError('Unexpected URL: '+url)


class CollectorTests(unittest.TestCase):
    def test_parse_filters_other_token(self):
        self.assertIsNone(c.parse_transfer(transfer(TX_A,'in',1,token='0x'+'4'*40)))

    def test_prelaunch_funding_is_included_in_reconciliation(self):
        m = MockHttp()
        m.history_pages[0]['items'].append(transfer(TX_A, 'in', 1, when='2025-07-31T14:00:23Z', index=112))
        original_get = m.get
        def with_funding(url):
            result = original_get(url)
            if '/token-balances' in url:
                result[0]['value'] = str(174 * 10**18)
            return result
        m.get = with_funding
        doc = c.run(m)
        self.assertTrue(doc['reserve']['reconciled'])
        self.assertEqual(doc['reserve']['balance_link'], 174)
        self.assertEqual(doc['history']['start'], '2025-07-31')

    def test_backfill_reconcile_and_price(self):
        m=MockHttp();doc=c.run(m, now='2026-10-20T00:00:00Z')
        self.assertTrue(doc['reserve']['reconciled'])
        self.assertEqual(doc['reserve']['balance_link'],173)
        self.assertEqual(doc['reserve']['usd_value'],2076)
        self.assertEqual(doc['reserve']['market_cap_share_pct'],round(2076/9e9*100,4))
        self.assertEqual(doc['history']['event_count'],4)  # 3 deposits, 1 withdrawal
        self.assertEqual(doc['history']['tx_count'],3)
        self.assertEqual(doc['last_deposit']['tx_hash'],TX_B)
        self.assertEqual(doc['last_deposit']['usd_estimate'],900)
        self.assertEqual(len(m.urls),5)  # 2 history pages, balance, market, batch
        txa=next(t for t in doc['transactions'] if t['tx_hash']==TX_A)
        self.assertEqual(txa['link'],103)
        self.assertEqual(txa['usd_estimate'],1236)

    def test_missing_prices_not_zero(self):
        m=MockHttp();m.price_available=False
        doc=c.run(m)
        self.assertEqual(doc['history']['unpriced_inflow_events'],3)
        self.assertIsNone(doc['last_deposit']['usd_estimate'])
        self.assertIsNone(doc['daily'][0]['usd_in_estimate'])

    def test_bad_balance_halts_publication(self):
        m=MockHttp();old=m.get
        def bad(url):
            result=old(url)
            if '/token-balances' in url:return [{'token': {'address': c.LINK, 'decimals':'18'}, 'value': str(172*10**18)}]
            return result
        m.get=bad
        with self.assertRaisesRegex(RuntimeError,'mismatch'):
            c.run(m)

    def test_price_cache_used(self):
        m=MockHttp();first=c.run(m)
        m.urls.clear();second=c.run(m,prior=first)
        self.assertEqual(second['last_deposit']['usd_estimate'],900)
        self.assertFalse(any('batchHistorical' in u for u in m.urls))

    def test_missing_log_index_is_error(self):
        item=transfer(TX_A,'in',100)
        del item['log_index']
        with self.assertRaisesRegex(ValueError,'log_index'):
            c.parse_transfer(item)


if __name__=='__main__':unittest.main()
