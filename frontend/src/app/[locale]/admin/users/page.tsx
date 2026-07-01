'use client';
import { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';
import { UserCheck, UserX } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try { setUsers(await api.adminGetUsers()); } catch { setError('ໂຫຼດຂໍ້ມູນລົ້ມເຫລວ'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function toggle(user: any) {
    try {
      if (user.is_active) {
        await api.adminDeactivateUser(user.id);
      } else {
        await api.adminActivateUser(user.id);
      }
      await load();
    } catch (e: any) {
      setError(e.message ?? 'ຜິດພາດ');
    }
  }

  const roleLabel: Record<string, string> = { broker: 'ນາຍໜ້າ', owner: 'ເຈົ້າຂອງ', buyer: 'ຜູ້ຊື້', admin: 'Admin' };

  return (
    <div>
      <h1 className="text-lg font-semibold mb-4">ຜູ້ໃຊ້ງານ</h1>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {loading ? (
        <p className="text-gray-400 text-sm">ກຳລັງໂຫຼດ...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left text-xs text-gray-500">
                <th className="px-3 py-2">ຊື່</th>
                <th className="px-3 py-2">ເບີໂທ</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">ສະຖານະ</th>
                <th className="px-3 py-2">ສ້າງວັນທີ</th>
                <th className="px-3 py-2">ຈັດການ</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{u.full_name}</td>
                  <td className="px-3 py-2 text-gray-500">{u.phone_e164}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
                      {roleLabel[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {u.is_active
                      ? <span className="text-green-600 text-xs">ເປີດໃຊ້</span>
                      : <span className="text-red-500 text-xs">ປິດ</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-400 text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => toggle(u)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${
                          u.is_active
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-green-200 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {u.is_active ? <><UserX className="w-3 h-3" /> ປິດ</> : <><UserCheck className="w-3 h-3" /> ເປີດ</>}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length && <p className="text-gray-400 text-sm py-4 text-center">ບໍ່ມີຂໍ້ມູນ</p>}
        </div>
      )}
    </div>
  );
}
