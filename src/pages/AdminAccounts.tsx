import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Edit2, Key, Trash2, X, AlertTriangle, 
  ChevronLeft, ChevronRight, Check, Building2, Clock, 
  FileText, BarChart3, Download, ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { Account, EnterpriseOverview, Task } from '../types';

export default function AdminAccounts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'accounts';
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [enterprises, setEnterprises] = useState<EnterpriseOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal states
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [resettingId, setResettingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab, page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'accounts') {
        const res = await api.admin.getAccounts(page);
        setAccounts(res.accounts);
        setTotal(res.total);
      } else {
        const res = await api.admin.getEnterprises();
        setEnterprises(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAccountModal = async (id?: number) => {
    if (id) {
      const res = await api.admin.getAccount(id);
      setEditingAccount(res);
    } else {
      setEditingAccount({
        username: '',
        password: '',
        enterprise_name: '',
        tasks: [{ name: '', target_type: 'number', target_value: '' }]
      });
    }
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount.id) {
        await api.admin.updateAccount(editingAccount.id, editingAccount);
      } else {
        await api.admin.createAccount(editingAccount);
      }
      setIsAccountModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetPassword = async () => {
    if (!resettingId) return;
    try {
      await api.admin.resetPassword(resettingId, { password: newPassword });
      setIsResetModalOpen(false);
      setNewPassword('');
      alert('密码重置成功');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletingId) return;
    try {
      await api.admin.deleteAccount(deletingId);
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {activeTab === 'accounts' ? '账号管理' : '企业管理'}
          </h2>
          <p className="text-slate-500">
            {activeTab === 'accounts' ? '管理企业登录账号及考核任务配置' : '查看各企业考核填报进度与详情'}
          </p>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start">
          <button
            onClick={() => setSearchParams({ tab: 'accounts' })}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'accounts' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            账号管理
          </button>
          <button
            onClick={() => setSearchParams({ tab: 'enterprises' })}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'enterprises' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            企业管理
          </button>
        </div>
      </div>

      {activeTab === 'accounts' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="搜索企业或账号..." 
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button 
              onClick={() => handleOpenAccountModal()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-100"
            >
              <Plus className="w-4 h-4" />
              新增账号
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="px-6 py-4">企业名称</th>
                  <th className="px-6 py-4">账号名</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400">加载中...</td></tr>
                ) : accounts.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400">暂无数据</td></tr>
                ) : accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{account.enterprise_name}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{account.username}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenAccountModal(account.id)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setResettingId(account.id); setIsResetModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          title="重置密码"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setDeletingId(account.id); setIsDeleteModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > 10 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
              <span className="text-sm text-slate-500">共 {total} 条数据</span>
              <div className="flex items-center gap-2">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium px-4">{page}</span>
                <button 
                  disabled={page * 10 >= total}
                  onClick={() => setPage(p => p + 1)}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-400">加载中...</div>
          ) : enterprises.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400">暂无企业数据</div>
          ) : enterprises.map((ent) => (
            <motion.div
              key={ent.id}
              whileHover={{ y: -4 }}
              onClick={() => navigate(`/admin/enterprises/${ent.id}`)}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${ent.status === '已填报' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  {ent.status}
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 mb-1">{ent.enterprise_name}</h3>
              <p className="text-sm text-slate-500 mb-4">账号：{ent.username}</p>
              
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>最后填报：{ent.last_reported_at ? new Date(ent.last_reported_at).toLocaleString() : '从未填报'}</span>
                </div>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Account Modal */}
      <AnimatePresence>
        {isAccountModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingAccount?.id ? '编辑账号' : '新增账号'}
                </h3>
                <button onClick={() => setIsAccountModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveAccount} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">企业名称</label>
                    <input 
                      required
                      type="text" 
                      value={editingAccount.enterprise_name}
                      onChange={e => setEditingAccount({...editingAccount, enterprise_name: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="例如：某某科技有限公司"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">账号名</label>
                    <input 
                      required
                      type="text" 
                      value={editingAccount.username}
                      onChange={e => setEditingAccount({...editingAccount, username: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="建议使用企业拼音或简称"
                    />
                  </div>
                  {!editingAccount.id && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">初始密码</label>
                      <input 
                        required
                        type="password" 
                        value={editingAccount.password}
                        onChange={e => setEditingAccount({...editingAccount, password: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="请输入初始密码"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-indigo-600" />
                      考核任务配置
                    </h4>
                    <button 
                      type="button"
                      onClick={() => setEditingAccount({
                        ...editingAccount, 
                        tasks: [...editingAccount.tasks, { name: '', target_type: 'number', target_value: '' }]
                      })}
                      className="text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      添加任务
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editingAccount.tasks.map((task: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 group">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">任务名称</label>
                            <input 
                              required
                              type="text"
                              value={task.name}
                              onChange={e => {
                                const newTasks = [...editingAccount.tasks];
                                newTasks[idx].name = e.target.value;
                                setEditingAccount({...editingAccount, tasks: newTasks});
                              }}
                              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                              placeholder="如：年营收"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">目标类型</label>
                            <select
                              value={task.target_type}
                              onChange={e => {
                                const newTasks = [...editingAccount.tasks];
                                newTasks[idx].target_type = e.target.value;
                                newTasks[idx].target_value = e.target.value === 'boolean' ? '是' : '';
                                setEditingAccount({...editingAccount, tasks: newTasks});
                              }}
                              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                              <option value="number">数字</option>
                              <option value="boolean">布尔</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">目标值</label>
                            {task.target_type === 'number' ? (
                              <input 
                                required
                                type="number"
                                step="any"
                                min="0"
                                value={task.target_value}
                                onChange={e => {
                                  const newTasks = [...editingAccount.tasks];
                                  newTasks[idx].target_value = e.target.value;
                                  setEditingAccount({...editingAccount, tasks: newTasks});
                                }}
                                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            ) : (
                              <select
                                value={task.target_value}
                                onChange={e => {
                                  const newTasks = [...editingAccount.tasks];
                                  newTasks[idx].target_value = e.target.value;
                                  setEditingAccount({...editingAccount, tasks: newTasks});
                                }}
                                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                              >
                                <option value="是">是</option>
                                <option value="否">否</option>
                              </select>
                            )}
                          </div>
                        </div>
                        <button 
                          type="button"
                          disabled={editingAccount.tasks.length <= 1}
                          onClick={() => {
                            const newTasks = editingAccount.tasks.filter((_: any, i: number) => i !== idx);
                            setEditingAccount({...editingAccount, tasks: newTasks});
                          }}
                          className="mt-6 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </form>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleSaveAccount}
                  className="px-6 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-all shadow-lg shadow-indigo-100"
                >
                  保存配置
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-4">重置密码</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">新密码</label>
                  <input 
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="请输入新密码"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
                  <button onClick={handleResetPassword} className="px-4 py-2 text-sm bg-amber-600 text-white hover:bg-amber-700 rounded-lg shadow-lg shadow-amber-100">确认重置</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="bg-red-50 p-2 rounded-lg">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold">确认删除？</h3>
              </div>
              <p className="text-slate-500 text-sm mb-6">
                删除后，该企业的所有考核任务、填报数据及附件将永久移除，无法恢复。
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
                <button onClick={handleDeleteAccount} className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg shadow-lg shadow-red-100">确认删除</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
