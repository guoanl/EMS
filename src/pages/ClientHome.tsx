import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Upload, Download, CheckCircle2, 
  AlertCircle, Save, FileText, X, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { Task, User } from '../types';

export default function ClientHome() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const user = api.user as User;

  // Local state for edits
  const [edits, setEdits] = useState<Record<number, { 
    actualValue: string, 
    remarks: string, 
    newFiles: File[], 
    deleteAttachmentIds: number[] 
  }>>({});

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.client.getTasks();
      setTasks(res);
      // Initialize edits from current values
      const initialEdits: Record<number, { 
        actualValue: string, 
        remarks: string, 
        newFiles: File[], 
        deleteAttachmentIds: number[] 
      }> = {};
      res.forEach((t: Task) => {
        initialEdits[t.id] = { 
          actualValue: t.actual_value || (t.target_type === 'boolean' ? '否' : ''),
          remarks: t.remarks || '',
          newFiles: [],
          deleteAttachmentIds: []
        };
      });
      setEdits(initialEdits);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (task: Task, currentEdit: any) => {
    const val = currentEdit.actualValue;
    if (!val) return 0;
    if (task.target_type === 'number') {
      const actual = parseFloat(val);
      const target = parseFloat(task.target_value);
      if (isNaN(actual) || target === 0) return 0;
      return Math.min(Math.round((actual / target) * 100), 100);
    } else {
      return val === task.target_value ? 100 : 0;
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      const dataToSubmit = Object.entries(edits).map(([taskId, edit]) => {
        edit.newFiles.forEach(file => {
          formData.append(`files_${taskId}`, file);
        });
        return { 
          taskId: Number(taskId), 
          actualValue: edit.actualValue, 
          remarks: edit.remarks,
          deleteAttachmentIds: edit.deleteAttachmentIds
        };
      });
      formData.append('data', JSON.stringify(dataToSubmit));

      await api.client.saveAll(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      fetchTasks();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-12 text-center text-slate-400">加载中...</div>;

  return (
    <div className="space-y-8 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">考核数据填报</h2>
          <p className="text-slate-500">欢迎，{user.enterprise_name}。请如实填报各项考核指标并上传佐证材料。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {tasks.map((task) => {
          const edit = edits[task.id] || { actualValue: '', remarks: '', newFiles: [], deleteAttachmentIds: [] };
          const progress = calculateProgress(task, edit);
          const existingAttachments = (task.attachments || []).filter(a => !edit.deleteAttachmentIds.includes(a.id));
          
          return (
            <motion.div 
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-6 flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{task.name}</h3>
                      <p className="text-sm text-slate-500">
                        目标值：
                        <span className="font-semibold text-slate-700">
                          {task.target_type === 'number' ? `${task.target_value}` : (task.target_value === '是' ? '是' : '否')}
                        </span>
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${progress === 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      进度：{progress}%
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">实际完成值</label>
                      {task.target_type === 'number' ? (
                        <input 
                          type="number"
                          step="any"
                          min="0"
                          value={edit.actualValue}
                          onChange={e => setEdits(prev => ({...prev, [task.id]: { ...prev[task.id], actualValue: e.target.value }}))}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="请输入数值"
                        />
                      ) : (
                        <div className="flex gap-4">
                          {['是', '否'].map(opt => (
                            <label key={opt} className="flex-1 cursor-pointer">
                              <input 
                                type="radio"
                                name={`task_${task.id}`}
                                value={opt}
                                checked={edit.actualValue === opt}
                                onChange={e => setEdits(prev => ({...prev, [task.id]: { ...prev[task.id], actualValue: e.target.value }}))}
                                className="sr-only"
                              />
                              <div className={`text-center py-2 rounded-xl border-2 transition-all font-medium ${edit.actualValue === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                                {opt}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">佐证附件上传</label>
                      <div className="relative group">
                        <input 
                          type="file"
                          multiple
                          onChange={e => {
                            const files = Array.from(e.target.files || []);
                            setEdits(prev => ({
                              ...prev, 
                              [task.id]: { 
                                ...prev[task.id], 
                                newFiles: [...prev[task.id].newFiles, ...files] 
                              }
                            }));
                            // Reset input
                            e.target.value = '';
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-dashed border-slate-300 rounded-xl group-hover:border-indigo-400 group-hover:bg-indigo-50 transition-all">
                          <Upload className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                          <span className="text-sm text-slate-500 truncate flex-1">
                            点击或拖拽上传多个文件
                          </span>
                        </div>
                      </div>

                      {/* File List */}
                      <div className="space-y-1.5 mt-2">
                        {/* Existing Attachments */}
                        {existingAttachments.map(att => (
                          <div key={att.id} className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 group">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-xs text-slate-600 truncate">{att.name}</span>
                            </div>
                            <button 
                              onClick={() => setEdits(prev => ({
                                ...prev,
                                [task.id]: {
                                  ...prev[task.id],
                                  deleteAttachmentIds: [...prev[task.id].deleteAttachmentIds, att.id]
                                }
                              }))}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        {/* New Files */}
                        {edit.newFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 px-3 py-1.5 bg-indigo-50/50 rounded-lg border border-indigo-100 group">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="text-xs text-indigo-600 truncate font-medium">{file.name}</span>
                              <span className="text-[10px] text-indigo-300 font-normal">(新上传)</span>
                            </div>
                            <button 
                              onClick={() => setEdits(prev => ({
                                ...prev,
                                [task.id]: {
                                  ...prev[task.id],
                                  newFiles: prev[task.id].newFiles.filter((_, i) => i !== idx)
                                }
                              }))}
                              className="text-indigo-300 hover:text-red-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Remarks Section */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      备注说明
                      <span className="text-[10px] font-normal text-slate-400">(选填，可填写完成情况、遇到的困难或未完成理由)</span>
                    </label>
                    <textarea
                      value={edit.remarks}
                      onChange={e => setEdits(prev => ({...prev, [task.id]: { ...prev[task.id], remarks: e.target.value }}))}
                      rows={2}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm resize-none"
                      placeholder="请输入备注说明..."
                    />
                  </div>
                </div>

                <div className="md:w-48 flex flex-col justify-center items-center gap-4 bg-slate-50/50 rounded-2xl p-4">
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="48" cy="48" r="40"
                        fill="none" stroke="currentColor" strokeWidth="8"
                        className="text-slate-100"
                      />
                      <circle
                        cx="48" cy="48" r="40"
                        fill="none" stroke="currentColor" strokeWidth="8"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * progress) / 100}
                        strokeLinecap="round"
                        className={`transition-all duration-1000 ${progress === 100 ? 'text-emerald-500' : 'text-indigo-600'}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-bold text-lg">
                      {progress}%
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">完成进度</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Global Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-2 text-slate-500 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>请确保所有数据填报准确后再提交</span>
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <AnimatePresence>
              {success && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2 text-emerald-600 font-bold"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>保存成功！</span>
                </motion.div>
              )}
            </AnimatePresence>
            
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-70"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>提交中...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>保存全部填报数据</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
