'use client';
import { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';
import { CheckCircle, Archive } from 'lucide-react';

const statusColour: Record<string, string> = {
  active: 'text-green-600',
  pending_owner: 'text-yellow-600',
  draft: 'text-gray-400',
  sold: 'text-blue-600',
  archived: 'text-gray-400',
};

export default function AdminPropertiesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);

  async function load(off = 0) {
    setLoading(true);
    try { setRows(await api.adminGetProperties(off)); }
    catch { setError('ໂຫຼດຂໍ້ມູນລົ້ມເຫລວ'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(offset); }, [offset]);

  async function doSold(id: string) {
    if (!confirm('Mark as SOLD?')) return;
    try { await api.markPropertySold(id); load(offset); }
    catch (e: any) { setError(e.message); }
  }

  async function doArchive(id: string) {
    if (!confirm('Archive this property?')) return;
    try { await api.archiveProperty(id); load(offset); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <h1 className="text-lg font-semibold mb-4">ທີ່ດິນທັງໝົດ</h1>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {loading ? (
        <p className="text-gray-400 text-sm">ກຳລັງໂຫຼດ...</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left text-xs text-gray-500">
                  <th className="px-3 py-2">ທີ່ຕັ້ງ</th>
                  <th className="px-3 py-2">ປະເພດ</th>
                  <th className="px-3 py-2">ລາຄາ</th>
                  <th className="px-3 py-2">ສະຖານະ</th>
                  <th className="px-3 py-2">ສ້າງໂດຍ</th>
                  <th className="px-3 py-2">ວັນທີ</th>
                  <th className="px-3 py-2">ຈັດການ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">{p.province}, {p.district}</td>
                    <td className="px-3 py-2 text-gray-500">{p.land_type}</td>
                    <td className="px-3 py-2">
                      {p.owner_set_price ? `${Number(p.owner_set_price).toLocaleString()} ${p.price_currency}` : '—'}
                    </td>
                    <td className={`px-3 py-2 text-xs font-medium ${statusColour[p.status] ?? 'text-gray-600'}`}>
                      {p.status}
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{p.created_by_name ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {p.status === 'active' && (
                          <button onClick={() => doSold(p.id)}
                            className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Sold
                          </button>
                        )}
                        {!['sold', 'archived'].includes(p.status) && (
                          <button onClick={() => doArchive(p.id)}
                            className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                            <Archive className="w-3 h-3" /> Archive
                          </button>
                        )}
                      </div>
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
