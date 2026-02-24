import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Building2, Download, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { Task } from '../types';

export default function AdminEnterpriseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [enterprise, setEnterprise] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const res = await api.admin.getEnterpriseDetail(Number(id));
      setEnterprise(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="py-12 text-center text-slate-400">加载中...</div>;
  if (error) return <div className="py-12 text-center text-red-500 font-bold">{error}</div>;
  if (!enterprise) return <div className="py-12 text-center text-slate-400">未找到企业信息</div>;

  const calculateProgress = (task: Task) => {
    if (!task.actual_value) return 0;
    if (task.target_type === 'number') {
      const actual = parseFloat(task.actual_value);
      const target = parseFloat(task.target_value);
      if (target === 0) return 0;
      return Math.min(Math.round((actual / target) * 100), 100);
    } else {
      return task.actual_value === task.target_value ? 100 : 0;
    }
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate('/admin/accounts?tab=enterprises')}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        返回企业列表
      </button>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-xl text-white">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{enterprise.enterprise_name}</h2>
            <p className="text-slate-500 text-sm">账号：{enterprise.username}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-900">考核任务填报详情</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/30 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="px-6 py-4">任务名称</th>
                <th className="px-6 py-4">目标值</th>
                <th className="px-6 py-4">实际值</th>
                <th className="px-6 py-4">佐证附件</th>
                <th className="px-6 py-4">备注说明</th>
                <th className="px-6 py-4 w-48">进度</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enterprise.tasks.map((task: Task) => {
                const progress = calculateProgress(task);
                return (
                  <tr key={task.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{task.name}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {task.target_type === 'number' ? task.target_value : (task.target_value === '是' ? '是' : '否')}
                    </td>
                    <td className="px-6 py-4">
                      {task.actual_value ? (
                        <span className="text-slate-900 font-semibold">
                          {task.target_type === 'number' ? task.actual_value : (task.actual_value === '是' ? '是' : '否')}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {task.attachments && task.attachments.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {task.attachments.map(att => (
                            <a 
                              key={att.id}
                              href={`/api/download/${att.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-medium text-xs group"
                            >
                              <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                              <span className="max-w-[120px] truncate">{att.name}</span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-sm">未上传</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {task.remarks ? (
                        <div className="text-sm text-slate-600 max-w-[200px] break-words" title={task.remarks}>
                          {task.remarks}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-sm">无备注</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                          <span className={progress === 100 ? 'text-emerald-600' : 'text-slate-400'}>{progress}%</span>
                          {progress === 100 ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : null}
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
