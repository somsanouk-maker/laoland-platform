'use client';
import { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';

const statusColour: Record<string, string> = {
  requested: 'text-yellow-600',
  active: 'text-green-600',
  revoked: 'text-red-500',
  renounced: 'text-gray-400',
  expired: 'text-gray-400',
};

export default function AdminMandatesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);

  async function load(off = 0) {
    setLoading(true);
    try { setRows(await api.adminGetMandates(off)); }
    catch { setError('ໂຫຼດຂໍ້ມູນລົ້ມເຫລວ'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(offset); }, [offset]);

  return (
    <div>
      <h1 className="text-lg font-semibold mb-4">Mandates ທັງໝົດ</h1>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {loading ? (
        <p className="text-gray-400 text-sm">ກຳລັງໂຫຼດ...</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left text-xs text-gray-500">
                  <th className="px-3 py-2">ທີ່ດິນ</th>
                  <th className="px-3 py-2">ນາຍໜ້າ</th>
                  <th className="px-3 py-2">ປະເພດ</th>
                  <th className="px-3 py-2">ສະຖານະ</th>
                  <th className="px-3 py-2">ຄ່ານາຍໜ້າ</th>
                  <th className="px-3 py-2">ວັນທີ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">{m.province}, {m.district} <span className="text-gray-400">({m.land_type})</span></td>
                    <td className="px-3 py-2">
                      <div>{m.broker_name}</div>
                      <div className="text-gray-400 text-xs">{m.broker_phone}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs">
                        {m.mandate_type === 'exclusive' ? '⭐ Exclusive' : 'Open'}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-xs font-medium ${statusColour[m.status] ?? 'text-gray-600'}`}>
                      {m.status}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{m.commission_pct}%</td>
                    <td className="px-3 py-2 text-gray-400 text-xs">{new Date(m.created_at).toLocaleDateString()}</td>
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
