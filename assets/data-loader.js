'use strict';
class ReserveDataError extends Error {
  constructor(kind, status) { super(kind); this.kind=kind; this.status=status; }
}
async function fetchReserveSnapshot(path, {fetchImpl=fetch, wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {
  for (let attempt=0;attempt<3;attempt++) {
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    try {
      // Revalidate the published file without generating a new CDN URL on every visit.
      const response=await fetchImpl(path,{cache:'no-cache',signal:controller.signal});
      if (!response.ok) throw new ReserveDataError('http',response.status);
      let doc;
      try { doc=await response.json(); } catch { throw new ReserveDataError('format'); }
      if (!doc || doc.schema_version!==1 || !Array.isArray(doc.events) || !Array.isArray(doc.transactions) || !doc.reserve || !doc.market || !doc.history || !Array.isArray(doc.daily)) throw new ReserveDataError('format');
      if (doc.reserve.reconciled!==true) throw new ReserveDataError('verification');
      return doc;
    } catch (error) {
      const failure=error instanceof ReserveDataError ? error : new ReserveDataError('network');
      const retry=failure.kind==='network' || (failure.kind==='http' && [404,408,429,500,502,503,504].includes(failure.status));
      if (!retry || attempt===2) throw failure;
    } finally { clearTimeout(timeout); }
    await wait([500,1500][attempt]);
  }
}
if (typeof module!=='undefined' && module.exports) module.exports={fetchReserveSnapshot,ReserveDataError};
