'use client';
import { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';

export default function AdminAuditLogPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);

  async function load(off = 0) {
    setLoading(true);
    try { setRows(await api.adminGetAuditLog(off)); }
    catch { setError('ໂຫຼດຂໍ້ມູນລົ້ມເຫລວ'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(offset); }, [offset]);

  return (
    <div>
      <h1 className="text-lg font-semibold mb-4">Audit Log</h1>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {loading ? (
        <p className="text-gray-400 text-sm">ກຳລັງໂຫຼດ...</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left text-xs text-gray-500">
                  <th className="px-3 py-2">ວັນທີ-ເວລາ</th>
                  <th className="px-3 py-2">ຜູ້ດຳເນີນ</th>
                  <th className="px-3 py-2">ການກະທຳ</th>
                  <th className="px-3 py-2">Entity</th>
                  <th className="px-3 py-2">ຂໍ້ມູນ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 align-top">
                    <td className="px-3 py-2 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs font-medium">{a.actor_name ?? '—'}</div>
                      <div className="text-gray-400 text-xs">{a.actor_role}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{a.action}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {a.entity}
                      {a.entity_id && <div className="text-gray-300 text-xs truncate max-w-24">{a.entity_id}</div>}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400 max-w-48">
                      {a.meta ? (
                        <pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(a.meta, null, 2)}</pre>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="text-gray-400 text-sm py-4 text-center">ບໍ່ມີຂໍ້ມູນ</p>}
          </div>
          <div className="flex gap-2 mt-4 text-sm">
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}
              className="px-3 py-1 border rounded disabled:opacity-40">← ກ່ອນ</button>
            <button disabled={rows.length < 50} onClick={() => setOffset(offset + 50)}
              className="px-3 py-1 border rounded disabled:opacity-40">ຕໍ່ໄປ →</button>
          </div>
        </>
      )}
    </div>
  );
}
