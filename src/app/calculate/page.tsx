'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getDaysInMonth, format, startOfMonth, addDays } from 'date-fns';
import { th } from 'date-fns/locale/th';
import {
  Save, Download, ImageIcon, Activity, Share2, Calculator, History, 
  Plus, ChevronLeft, ChevronRight, MapPin, Edit2, Trash2, X, Check,
  AlertCircle, Info, RefreshCw, Calendar
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import Link from 'next/link';

type HistoryRecord = {
  location: string;
  month: string;
  prevReading: string;
  currReading: string;
  totalUsage: string;
};

export default function CalculatePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'calculate' | 'history'>('calculate');

  // Calculate States
  const [location, setLocation] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [prevReading, setPrevReading] = useState<string>('');
  const [currReading, setCurrReading] = useState<string>('');

  // Locations Management
  const [locationsList, setLocationsList] = useState<string[]>([]);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [addValue, setAddValue] = useState('');
  const [editMode, setEditMode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Operation States
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  // History States
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [filterMonth, setFilterMonth] = useState<string>('');
  const itemsPerPage = 10;

  // Auto-fill & Latest Meter state
  const [latestMeter, setLatestMeter] = useState<HistoryRecord | null>(null);

  // Toast State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const exportSlipRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    setIsMounted(true);
    fetchLocations();
    fetchHistory();
  }, []);

  // Auto-fill logic
  useEffect(() => {
    if (location && historyData.length > 0) {
      const locHistory = historyData.filter(r => r.location === location);
      if (locHistory.length > 0) {
        const sorted = [...locHistory].sort((a, b) => b.month.localeCompare(a.month));
        const latest = sorted[0];
        setLatestMeter(latest);
        // Only auto-fill if prevReading is empty or we just changed location
        if (!prevReading || prevReading === latest.currReading) {
          setPrevReading(latest.currReading);
        }
      } else {
        setLatestMeter(null);
      }
    } else {
      setLatestMeter(null);
    }
  }, [location, historyData]);

  const fetchLocations = async () => {
    setIsLoadingLocations(true);
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      if (data.success) setLocationsList(data.data);
    } catch (e) {
      console.error(e);
      showToast('ไม่สามารถดึงข้อมูลสถานที่ได้', 'error');
    }
    setIsLoadingLocations(false);
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.success) {
        setHistoryData(data.data);
      }
    } catch (e) {
      console.error(e);
      showToast('ไม่สามารถดึงประวัติได้', 'error');
    }
    setIsLoadingHistory(false);
  };

  // Location CRUD Handlers
  const handleAddLocationSubmit = async () => {
    if (!addValue.trim()) return;
    setIsLoadingLocations(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: addValue.trim() }),
      });
      if (res.ok) {
        await fetchLocations();
        setLocation(addValue.trim());
        setIsAddingMode(false);
        setAddValue('');
        showToast('เพิ่มสถานที่สำเร็จ', 'success');
      } else {
        showToast('เกิดข้อผิดพลาดในการเพิ่มสถานที่', 'error');
      }
    } catch (e) {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    }
    setIsLoadingLocations(false);
  };

  const handleEditLocationSubmit = async (oldName: string) => {
    if (!editValue.trim() || editValue.trim() === oldName) {
      setEditMode(null);
      return;
    }
    setIsLoadingLocations(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName: editValue.trim() }),
      });
      if (res.ok) {
        await fetchLocations();
        if (location === oldName) setLocation(editValue.trim());
        setEditMode(null);
        showToast('แก้ไขสถานที่สำเร็จ', 'success');
      } else {
        showToast('เกิดข้อผิดพลาดในการแก้ไขสถานที่', 'error');
      }
    } catch (e) {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    }
    setIsLoadingLocations(false);
  };

  const handleDeleteLocation = async (locName: string) => {
    if (!confirm(`คุณต้องการลบสถานที่ "${locName}" ใช่หรือไม่?`)) return;
    setIsLoadingLocations(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: locName }),
      });
      if (res.ok) {
        await fetchLocations();
        if (location === locName) setLocation('');
        showToast('ลบสถานที่สำเร็จ', 'success');
      } else {
        showToast('เกิดข้อผิดพลาดในการลบสถานที่', 'error');
      }
    } catch (e) {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    }
    setIsLoadingLocations(false);
  };

  const handleLoadHistory = (record: HistoryRecord) => {
    setLocation(record.location);
    setSelectedDate(record.month);
    setPrevReading(record.prevReading);
    setCurrReading(record.currReading);
    setActiveTab('calculate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetFormAndGoNext = () => {
    setPrevReading(currReading); // curr becomes prev for next time
    setCurrReading('');
    setLocation('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isCalculable = selectedDate && prevReading && currReading && Number(currReading) >= Number(prevReading);

  const results = useMemo(() => {
    if (!isCalculable || !isMounted) return null;

    const prev = Number(prevReading);
    const curr = Number(currReading);

    const [year, month] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1);
    const daysInMonth = getDaysInMonth(dateObj);

    const totalUsage = Math.round(curr - prev);

    const start = startOfMonth(dateObj);
    let runningTotal = prev;
    let accumulatedVirtual = 0;
    let accumulatedActual = 0;

    const dailyList = Array.from({ length: daysInMonth }).map((_, i) => {
      const currentDayDate = addDays(start, i);

      accumulatedVirtual += totalUsage / daysInMonth;
      const targetActual = Math.round(accumulatedVirtual);
      const dailyUsage = targetActual - accumulatedActual;
      accumulatedActual += dailyUsage;

      const dayPrevReading = Math.round(runningTotal);
      runningTotal += dailyUsage;
      const dayCurrReading = Math.round(runningTotal);

      const buddhistYearShort = (currentDayDate.getFullYear() + 543).toString().slice(-2);
      const thaiMonthAbbr = format(currentDayDate, 'MMM', { locale: th });
      const dayNum = format(currentDayDate, 'd');
      const thaiDate = `${dayNum} ${thaiMonthAbbr} ${buddhistYearShort}`;

      return {
        date: format(currentDayDate, 'yyyy-MM-dd'),
        displayDate: format(currentDayDate, 'dd/MM/yyyy'),
        thaiDate,
        dailyUsage,
        meterReading: dayCurrReading,
        prevMeterReading: dayPrevReading
      };
    });

    return {
      totalUsage,
      dailyAverage: (totalUsage / daysInMonth),
      dailyList,
      prev,
      curr,
      month: selectedDate
    };
  }, [prevReading, currReading, selectedDate, isCalculable, isMounted]);

  const handleSaveToSheets = async () => {
    if (!results) return;
    
    // Duplicate check
    const isDuplicate = historyData.some(r => r.location === location && r.month === results.month);
    if (isDuplicate) {
      if (!confirm(`มีการบันทึกของสถานที่ "${location}" ในเดือน ${results.month} แล้ว คุณต้องการบันทึกอัปเดตข้อมูลทับหรือไม่?`)) {
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/meter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location.trim(),
          month: results.month,
          prevReading: results.prev,
          currReading: results.curr,
          totalUsage: results.totalUsage
        }),
      });

      if (res.ok) {
        showToast('บันทึกข้อมูลสำเร็จ', 'success');
        fetchHistory(); // Refresh history
      } else {
        showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
      }
    } catch (e) {
      showToast('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'error');
    }
    setIsSaving(false);
  };

  const handleExportPDF = async () => {
    if (!results || !exportSlipRef.current) return;
    setIsExporting(true);

    setTimeout(async () => {
      try {
        const dataUrl = await toPng(exportSlipRef.current!, { quality: 1, pixelRatio: 2 });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();

        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          const imgProps = pdf.getImageProperties(img);
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          pdf.addImage(img, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`meter-bill-${selectedDate || 'export'}.pdf`);
          setIsExporting(false);
          showToast('ส่งออก PDF สำเร็จ', 'success');
        };
      } catch (err) {
        console.error('Error exporting PDF', err);
        setIsExporting(false);
        showToast('เกิดข้อผิดพลาดในการสร้าง PDF', 'error');
      }
    }, 150);
  };

  const handleShare = async () => {
    if (!results || !exportSlipRef.current) return;
    setIsExporting(true);

    setTimeout(async () => {
      try {
        const dataUrl = await toPng(exportSlipRef.current!, { quality: 1, pixelRatio: 2 });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();

        const img = new Image();
        img.src = dataUrl;
        img.onload = async () => {
          try {
            const imgProps = pdf.getImageProperties(img);
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(img, 'PNG', 0, 0, pdfWidth, pdfHeight);

            const pdfBlob = pdf.output('blob');
            const file = new File([pdfBlob], `meter-bill-${selectedDate || 'export'}.pdf`, { type: 'application/pdf' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: 'บิลค่าน้ำประปา',
                text: `บิลค่าน้ำประจำเดือน ${selectedDate} ${location ? `(สถานที่: ${location})` : ''}`
              });
              showToast('เปิดการแชร์สำเร็จ', 'success');
            } else {
              showToast('อุปกรณ์ไม่รองรับการแชร์ไฟล์ PDF โดยตรง กรุณาใช้ปุ่ม Save as PDF แทน', 'info');
            }
          } catch (shareErr) {
            console.error('Error during sharing', shareErr);
            showToast('ถูกยกเลิก หรือเกิดข้อผิดพลาดในการแชร์', 'error');
          } finally {
            setIsExporting(false);
          }
        };
      } catch (err) {
        console.error('Error generating PDF for sharing', err);
        showToast('เกิดข้อผิดพลาดในการสร้างไฟล์สำหรับแชร์', 'error');
        setIsExporting(false);
      }
    }, 150);
  };

  const handleExportImage = async () => {
    if (!results || !exportSlipRef.current) return;
    setIsExporting(true);

    setTimeout(async () => {
      try {
        const dataUrl = await toPng(exportSlipRef.current!, { quality: 1, pixelRatio: 2 });
        const link = document.createElement('a');
        link.download = `meter-bill-${selectedDate || 'export'}.png`;
        link.href = dataUrl;
        link.click();
        setIsExporting(false);
        showToast('ส่งออกรูปภาพสำเร็จ', 'success');
      } catch (err) {
        console.error('Error exporting Image', err);
        setIsExporting(false);
        showToast('เกิดข้อผิดพลาดในการสร้างรูปภาพ', 'error');
      }
    }, 150);
  };

  const handleSetupSheet = async () => {
    if (!confirm('ระบบจะทำการตรวจสอบและสร้างหน้า WaterMeterLogs, Locations พร้อมเขียนหัวตารางให้ คุณต้องการดำเนินการต่อหรือไม่?')) return;
    setIsSettingUp(true);
    try {
      const res = await fetch('/api/setup-sheet');
      const data = await res.json();
      if (res.ok) {
        showToast('ตั้งค่า Google Sheets สำเร็จ', 'success');
        fetchLocations();
      } else {
        showToast('เกิดข้อผิดพลาด: ' + (data.error || 'ไม่สามารถตั้งค่าได้'), 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
    setIsSettingUp(false);
  };

  if (!isMounted) return null;

  // History Filter logic
  const availableMonths = Array.from(new Set(historyData.map(r => r.month))).sort().reverse();
  const filteredHistory = filterMonth ? historyData.filter(r => r.month === filterMonth) : historyData;
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const currentHistory = filteredHistory.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage);

  function formatThaiMonthSafe(monthStr: string): string {
    try {
      const d = new Date(monthStr + '-01');
      const m = format(d, 'MMM', { locale: th });
      const y = (d.getFullYear() + 543).toString().slice(-2);
      return `${m} ${y}`;
    } catch {
      return monthStr;
    }
  }

  return (
    <div className="min-h-screen pb-24 font-sans relative" style={{ background: 'linear-gradient(180deg, #e8edf5 0%, #f0f3fa 40%, #f8f9fc 100%)' }}>
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg border transition-all animate-in fade-in slide-in-from-top-5 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {toast.type === 'success' && <Check className="w-5 h-5 text-emerald-500" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="px-5 pt-8 pb-4 max-w-2xl mx-auto flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs font-medium">Meter Bill App</p>
          <h1 className="text-xl font-bold text-slate-800">จัดการค่าน้ำ</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 flex flex-col gap-5">
        
        {/* TAB SWITCHER */}
        <div className="flex bg-white/50 backdrop-blur rounded-2xl p-1.5 gap-1.5 shadow-sm border border-slate-100">
          <button
            onClick={() => setActiveTab('calculate')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'calculate'
                ? 'bg-white text-blue-600 shadow border border-slate-100'
                : 'text-slate-500 hover:bg-white/40'
            }`}
          >
            <Calculator className="w-4 h-4" /> คำนวณ
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'history'
                ? 'bg-white text-blue-600 shadow border border-slate-100'
                : 'text-slate-500 hover:bg-white/40'
            }`}
          >
            <History className="w-4 h-4" /> ประวัติ
          </button>
        </div>

        {/* CALCULATOR TAB */}
        <div className={activeTab === 'calculate' ? 'flex flex-col gap-5' : 'hidden'}>

          {/* Locations Manager */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100/80 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" /> สถานที่
              </label>
              {!isAddingMode && (
                <button
                  onClick={() => setIsAddingMode(true)}
                  className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> เพิ่มสถานที่
                </button>
              )}
            </div>

            {isAddingMode && (
              <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                <input
                  type="text"
                  placeholder="พิมพ์ชื่อสถานที่ใหม่..."
                  value={addValue}
                  onChange={e => setAddValue(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  autoFocus
                />
                <button onClick={handleAddLocationSubmit} disabled={isLoadingLocations} className="bg-blue-600 text-white px-3 rounded-xl hover:bg-blue-700 disabled:opacity-50">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setIsAddingMode(false)} className="bg-slate-100 text-slate-600 px-3 rounded-xl hover:bg-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {locationsList.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {locationsList.map((loc, idx) => (
                  <div key={idx} className="relative group">
                    {editMode === loc ? (
                      <div className="flex gap-1 bg-white border border-blue-400 rounded-xl p-1 shadow-sm">
                        <input
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="w-24 bg-transparent px-2 text-sm focus:outline-none"
                          autoFocus
                        />
                        <button onClick={() => handleEditLocationSubmit(loc)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={() => setEditMode(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setLocation(loc)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border flex items-center gap-1.5 ${
                            location === loc
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200/50'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <MapPin className={`w-3.5 h-3.5 ${location === loc ? 'text-white' : 'text-slate-400'}`} />
                          {loc}
                        </button>
                        {/* Edit/Delete Actions (visible on hover for desktop, always for selected on mobile) */}
                        <div className={`flex items-center gap-1 ${location === loc ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'} transition-opacity`}>
                          <button
                            onClick={() => { setEditMode(loc); setEditValue(loc); }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="แก้ไขชื่อ"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLocation(loc)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="ลบสถานที่"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">ยังไม่มีสถานที่ กดเพิ่มเพื่อเริ่มต้น</p>
            )}
          </div>

          {/* LATEST METER INFO (Auto-fill Hint) */}
          {latestMeter && (
            <div className="bg-blue-50/80 border border-blue-100 rounded-3xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-600">ข้อมูลล่าสุด ({formatThaiMonthSafe(latestMeter.month)})</p>
                  <p className="text-sm font-bold text-slate-700">เลขมิเตอร์หลังสุด: <span className="text-blue-700">{latestMeter.currReading}</span></p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-medium">ยอดใช้รวม</p>
                <p className="text-sm font-black text-slate-800">{latestMeter.totalUsage} <span className="text-[10px] font-normal text-slate-500">หน่วย</span></p>
              </div>
            </div>
          )}

          {/* INTERACTIVE UI PANEL */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100/80 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="month" className="text-sm font-bold text-slate-700">ประจำเดือน</label>
              <input
                id="month"
                type="month"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-base text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="prev" className="text-sm font-bold text-slate-700 flex justify-between items-center">
                  เลขเดือนก่อน
                  {prevReading && currReading && Number(currReading) < Number(prevReading) && (
                    <span className="text-[10px] text-red-500 font-normal">น้อยกว่าไม่ได้</span>
                  )}
                </label>
                <input
                  id="prev"
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={prevReading}
                  onChange={(e) => setPrevReading(e.target.value)}
                  className={`w-full bg-slate-50 border rounded-2xl px-4 py-3 text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 transition-all ${
                    prevReading && currReading && Number(currReading) < Number(prevReading)
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                      : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'
                  }`}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="curr" className="text-sm font-bold text-slate-700">เลขเดือนนี้</label>
                <input
                  id="curr"
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={currReading}
                  onChange={(e) => setCurrReading(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-lg font-semibold text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>
          </div>

          {/* RESULTS */}
          {results && (
            <div className="rounded-3xl p-6 text-white shadow-lg animate-in fade-in slide-in-from-bottom-4" style={{ background: 'linear-gradient(160deg, #1e293b 0%, #1a2340 100%)' }}>
              <div className="flex flex-col items-center gap-1 mb-5">
                <span className="text-slate-300 text-sm font-medium">ยอดใช้งานทั้งหมด</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black tracking-tight text-white">{results.totalUsage}</span>
                  <span className="text-lg font-medium text-slate-400">หน่วย</span>
                </div>
                <span className="text-blue-300 text-xs mt-2 font-medium bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
                  เฉลี่ยใช้วันละ {results.dailyAverage.toFixed(2)} หน่วย
                </span>
              </div>

              {!isExporting && (
                <div className="flex flex-col gap-3 mt-6">
                  <button
                    onClick={handleSaveToSheets}
                    disabled={isSaving}
                    className="w-full py-4 flex items-center justify-center gap-2 text-base font-bold rounded-2xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 text-white disabled:opacity-70 disabled:hover:translate-y-0"
                    style={{ background: 'linear-gradient(135deg, #4f7df5 0%, #6e5ce7 100%)' }}
                  >
                    {isSaving ? (
                      <><RefreshCw className="w-5 h-5 animate-spin" /> กำลังบันทึก...</>
                    ) : (
                      <><Save className="w-5 h-5" /> บันทึกลงระบบ</>
                    )}
                  </button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={resetFormAndGoNext}
                      className="bg-white/10 hover:bg-white/20 text-white font-medium rounded-2xl py-3 flex items-center justify-center gap-2 text-sm border border-white/10 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> บันทึกห้องถัดไป
                    </button>
                    <button
                      onClick={handleShare}
                      disabled={isSaving || isExporting}
                      className="bg-[#06C755] hover:bg-[#05b34c] text-white font-medium rounded-2xl py-3 flex items-center justify-center gap-2 text-sm shadow-md transition-colors disabled:opacity-50"
                    >
                      <Share2 className="w-4 h-4" /> แชร์ไปยังไลน์
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <button
                      onClick={handleExportImage}
                      disabled={isExporting}
                      className="bg-white text-slate-800 hover:bg-slate-50 font-medium rounded-2xl py-3 flex items-center justify-center gap-2 text-sm shadow-sm transition-colors disabled:opacity-50"
                    >
                      <ImageIcon className="w-4 h-4 text-blue-600" /> เป็นรูปภาพ
                    </button>
                    <button
                      onClick={handleExportPDF}
                      disabled={isExporting}
                      className="bg-white text-slate-800 hover:bg-slate-50 font-medium rounded-2xl py-3 flex items-center justify-center gap-2 text-sm shadow-sm transition-colors disabled:opacity-50"
                    >
                      <Download className="w-4 h-4 text-blue-600" /> เป็น PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DAILY BREAKDOWN */}
          {results && (
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100/80 mt-2 animate-in fade-in">
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" /> สรุปรายวัน
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                      <th className="p-3 font-semibold">วันที่</th>
                      <th className="p-3 font-semibold text-right">ครั้งก่อน</th>
                      <th className="p-3 font-semibold text-right">ครั้งหลัง</th>
                      <th className="p-3 font-semibold text-right">ใช้ไป (หน่วย)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {results.dailyList.map((day, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                        <td className="p-3 font-medium text-slate-700">{day.thaiDate}</td>
                        <td className="p-3 text-right text-slate-500">{day.prevMeterReading}</td>
                        <td className="p-3 text-right font-semibold text-slate-800">{day.meterReading}</td>
                        <td className="p-3 text-right font-bold text-blue-600">{day.dailyUsage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* HISTORY TAB */}
        <div className={activeTab === 'history' ? 'flex flex-col gap-5' : 'hidden'}>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100/80 min-h-[400px] flex flex-col gap-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" /> ประวัติ
              </h2>
              
              {/* MONTH FILTER */}
              {availableMonths.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-500">เดือน:</label>
                  <select
                    value={filterMonth}
                    onChange={(e) => {
                      setFilterMonth(e.target.value);
                      setHistoryPage(1); // Reset page on filter change
                    }}
                    className="bg-slate-50 border border-slate-200 text-sm text-slate-700 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  >
                    <option value="">ทั้งหมด</option>
                    {availableMonths.map((m, idx) => (
                      <option key={idx} value={m}>{formatThaiMonthSafe(m)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {isLoadingHistory ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-300" />
                กำลังโหลดข้อมูล...
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-3 mt-8">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                  <Activity className="w-8 h-8 text-slate-300" />
                </div>
                {filterMonth ? 'ไม่มีข้อมูลในเดือนที่เลือก' : 'ยังไม่มีประวัติการบันทึก'}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  {currentHistory.map((record, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">{record.location}</p>
                          <p className="text-sm font-bold text-blue-600 shrink-0">{record.totalUsage} <span className="text-[10px] font-normal text-slate-400">หน่วย</span></p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-slate-400 font-medium">เดือน {formatThaiMonthSafe(record.month)}</p>
                          <button
                            onClick={() => handleLoadHistory(record)}
                            className="text-[10px] bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg font-bold hover:bg-blue-600 hover:text-white transition-colors"
                          >
                            เปิดบิล
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-50 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                      หน้า {historyPage} จาก {totalPages}
                    </span>
                    <button
                      onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                      disabled={historyPage === totalPages}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-50 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-center pb-8">
          <button
            onClick={handleSetupSheet}
            disabled={isSettingUp}
            className="text-[11px] text-slate-400 hover:text-blue-600 font-medium transition-colors"
          >
            {isSettingUp ? 'กำลังเตรียม Google Sheets...' : 'ตั้งค่าหน้า Google Sheets ครั้งแรก'}
          </button>
        </div>

      </div>

      {/* HIDDEN PROFESSIONAL EXPORT SLIP */}
      {results && (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <div ref={exportSlipRef} className="w-[800px] bg-white p-8 text-black font-sans tracking-tight" style={{ lineHeight: '1.2' }}>
            <h1 className="text-center text-[19px] font-bold mb-5 mt-4">บันทึกสถิติการใช้น้ำประปา</h1>

            <div className="flex justify-center gap-6 mb-3 text-[14px]">
              <div>
                ประจำเดือน
                <span className="inline-block border-b border-dotted border-black w-32 text-center mx-1">
                  {(() => {
                    const d = new Date(results.month + '-01');
                    const m = format(d, 'MMM', { locale: th });
                    const y = (d.getFullYear() + 543).toString().slice(-2);
                    return `${m} ${y}`;
                  })()}
                </span>
              </div>
              <div>
                หน่วย
                <span className="inline-block border-b border-dotted border-black w-48 text-center mx-1">
                  พัน.บร.กบร.ศบบ.
                </span>
              </div>
            </div>

            <div className="flex justify-center gap-6 mb-4 text-[14px]">
              <div>
                ชื่ออาคาร
                <span className="inline-block border-b border-dotted border-black w-48 text-center mx-1">
                  {location}
                </span>
              </div>
              <div>
                หมายเลขอาคาร
                <span className="inline-block border-b border-dotted border-black w-32 text-center mx-1"></span>
              </div>
            </div>

            <div className="flex justify-center gap-2 mb-4 text-[14px]">
               <div>จำนวนผู้ปฏิบัติงาน กำลังพล<span className="inline-block border-b border-dotted border-black w-12 text-center mx-1"></span>นาย</div>
               <div>ทหารกองประจำการ<span className="inline-block border-b border-dotted border-black w-12 text-center mx-1"></span>นาย</div>
               <div>ยานพาหนะ<span className="inline-block border-b border-dotted border-black w-12 text-center mx-1"></span>คัน</div>
            </div>

            <table className="w-full border-collapse border border-black text-[13px] text-center mb-6">
              <thead>
                <tr>
                  <th className="border border-black p-1 font-semibold" rowSpan={2}>ว/ด/ป</th>
                  <th className="border border-black p-1 font-semibold" colSpan={3}>มิเตอร์น้ำประปาประจำอาคาร</th>
                  <th className="border border-black p-1 font-semibold" colSpan={2}>การใช้น้ำ</th>
                  <th className="border border-black p-1 font-semibold" colSpan={2}>ถังเก็บน้ำ</th>
                  <th className="border border-black p-1 font-semibold" colSpan={2}>ปั๊มน้ำอัตโนมัติ</th>
                  <th className="border border-black p-1 font-semibold" rowSpan={2}>สาเหตุ</th>
                  <th className="border border-black p-1 font-semibold" rowSpan={2}>การแก้ไข</th>
                  <th className="border border-black p-1 font-semibold" rowSpan={2}>ผู้บันทึก</th>
                </tr>
                <tr>
                  <th className="border border-black p-1 font-semibold w-[9%]">ครั้งก่อน</th>
                  <th className="border border-black p-1 font-semibold w-[9%]">ครั้งหลัง</th>
                  <th className="border border-black p-1 font-semibold w-[7%]">ใช้ไป</th>
                  <th className="border border-black p-1 font-semibold w-[6%]">ปกติ</th>
                  <th className="border border-black p-1 font-semibold w-[7%]">ผิดปกติ</th>
                  <th className="border border-black p-1 font-semibold w-[6%]">ปกติ</th>
                  <th className="border border-black p-1 font-semibold w-[6%]">ชำรุด</th>
                  <th className="border border-black p-1 font-semibold w-[6%]">ปกติ</th>
                  <th className="border border-black p-1 font-semibold w-[7%]">ผิดปกติ</th>
                </tr>
              </thead>
              <tbody>
                 {Array.from({ length: 31 }).map((_, i) => {
                   const dayData = results.dailyList[i];
                   return (
                     <tr key={i} className="h-[22px]">
                       <td className="border border-black p-0.5">{dayData ? dayData.thaiDate : ''}</td>
                       <td className="border border-black p-0.5">{dayData ? dayData.prevMeterReading : ''}</td>
                       <td className="border border-black p-0.5">{dayData ? dayData.meterReading : ''}</td>
                       <td className="border border-black p-0.5 font-bold">{dayData ? dayData.dailyUsage : ''}</td>
                       <td className="border border-black p-0.5"></td>
                       <td className="border border-black p-0.5"></td>
                       <td className="border border-black p-0.5"></td>
                       <td className="border border-black p-0.5"></td>
                       <td className="border border-black p-0.5"></td>
                       <td className="border border-black p-0.5"></td>
                       <td className="border border-black p-0.5"></td>
                       <td className="border border-black p-0.5"></td>
                       <td className="border border-black p-0.5"></td>
                     </tr>
                   )
                 })}
                 <tr className="h-[26px] bg-slate-50/50">
                   <td className="border border-black p-1 font-bold text-center" colSpan={3}>รวมทั้งสิ้น</td>
                   <td className="border border-black p-1 font-bold text-center">{results.totalUsage}</td>
                   <td className="border border-black p-1" colSpan={9}></td>
                 </tr>
              </tbody>
            </table>

            <div className="text-[12px] leading-6 mb-8 text-left">
              <div className="flex gap-2">
                <span className="font-bold underline min-w-fit">หมายเหตุ</span>
                <div className="flex-1">
                  <p>1. อาคารใช้น้ำประปา...........................................................................................(ใช้ผ่าน กปภ. โดยตรง / ผ่านถังเก็บน้ำ โดยใช้ปั๊มน้ำอัตโนมัติ / ใช้ผ่านทั้ง 2 ระบบ)</p>
                  <p>2. ถังเก็บน้ำ(บนดิน) ความจุ........................ลิตร สร้างเมื่อ.......................................เริ่มใช้งานตั้งแต่..........................................จนถึง..........................................</p>
                  <p>3. ถังเก็บน้ำ(ใต้ดิน) ความจุ........................ลิตร สร้างเมื่อ.......................................เริ่มใช้งานตั้งแต่..........................................จนถึง..........................................</p>
                  <p>4. ให้หน่วยจดบันทึกข้อมูลทุกวัน (เวลา 0900) ด้วยลายมือเท่านั้น</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between text-[14px] px-16 pb-12">
              <div className="text-center w-64">
                <p className="mb-10">ขอรับรองว่าถูกต้อง</p>
                <p>พ.ท......................................................</p>
                <p className="mt-2">(ฤชฎ  อารีราษฎร์)</p>
                <p className="mt-1">ผบ.พัน.บร.กบร.ศบบ.</p>
                <p className="mt-1">......../......../........</p>
              </div>
              <div className="text-center w-64">
                <p className="mb-10">ตรวจถูกต้อง</p>
                <p>ร.อ......................................................</p>
                <p className="mt-2">(ชัยพร  เผือกโสภา)</p>
                <p className="mt-1">ปฏิบัติหน้าที่ น.ส่งกำลัง พัน.บร.ฯ</p>
                <p className="mt-1">......../......../........</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
