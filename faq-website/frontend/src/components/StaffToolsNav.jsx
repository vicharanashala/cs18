import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { Shield, ShieldCheck, Ticket } from 'lucide-react';

export default function StaffToolsNav({ close = () => {} }) {
  const navigate = useNavigate();
  const [pendingAssignedCount, setPendingAssignedCount] = useState(0);
  const role = localStorage.getItem('role');

  useEffect(() => {
    if (role === 'admin') {
      axiosClient.get('/admin/personal-tickets')
        .then(res => {
          const count = res.data.tickets.filter(t => t.status === 'pending' || t.status === 'assigned').length;
          setPendingAssignedCount(count);
        })
        .catch(err => {
          console.error('[Assigned Work Fetch Error]', err);
        });
    }
  }, [role]);

  if (!['admin', 'mentor'].includes(role)) {
    return null;
  }

  return (
    <div className="pt-3 space-y-2 border-t border-white/5 mt-3">
      <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-bricolage mb-1">Staff Tools</p>
      
      {['admin'].includes(role) && (
         <button onClick={() => { navigate('/admin'); close(); }} className="sidebar-button sidebar-button-normal w-full">
           <Shield size={18} className="text-amber-400" /> Admin Dashboard
         </button>
      )}



      {['admin'].includes(role) && (
         <button onClick={() => { navigate('/admin?section=personal'); close(); }} className="sidebar-button sidebar-button-normal flex justify-between w-full items-center">
           <div className="flex items-center gap-3"><Ticket size={18} className="text-emerald-400" /> Assigned Work</div>
           {pendingAssignedCount > 0 && (
             <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
               {pendingAssignedCount}
             </span>
           )}
         </button>
      )}
    </div>
  );
}
