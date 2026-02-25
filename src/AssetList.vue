<script setup>
import { ref, computed, onMounted, watch, nextTick, provide } from 'vue';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import AssetPrintLabel from './AssetPrintLabel.vue';

// --- 1. เปลี่ยน Import เป็น ECharts ---
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, PieChart } from 'echarts/charts';
import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent // จำเป็นสำหรับ Bar Chart แกน X/Y
} from 'echarts/components';
import VChart, { THEME_KEY } from 'vue-echarts';

// --- 2. Register ECharts Components ---
use([
    CanvasRenderer,
    BarChart,
    PieChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent
]);

// (Optional) กำหนด Theme เป็น Dark (หรือลบออกถ้าอยากได้สีปกติ)
provide(THEME_KEY, 'dark');

// --- Config Variables ---

const API_URL = import.meta.env.VITE_API_Back;
const assets = ref([]);
const searchQuery = ref('');
const isLoading = ref(false);

// --- New State: Site Filter ---
const selectedSite = ref('All');
const selectedType = ref('All');

// --- Selection State ---
const selectedIds = ref([]);
const printData = ref([]);
const printLabelRef = ref(null);

// --- Modal & Detail State ---
const showDetailModal = ref(false);
const selectedAsset = ref({});
const emit = defineEmits(['edit-asset']);

// --- Pagination Variables ---
const currentPage = ref(1);
const itemsPerPage = 15;

// <--- 2. สร้างรายการตัวเลือก Type อัตโนมัติจากข้อมูลที่มี
const typeOptions = computed(() => {
    // ดึง AssetType ทั้งหมดออกมา ตัดค่าว่าง และหาค่าที่ไม่ซ้ำ (Unique)
    const types = new Set(assets.value.map(item => item.AssetType).filter(t => t));
    return ['All', ...Array.from(types).sort()];
});

// ==========================================
// FILTER LOGIC
// ==========================================
const assetsBySite = computed(() => {
    return assets.value.filter(item => {
        // 1. กรอง Soft Delete
        if (item.flag_remove == 1) return false;

        // 2. กรอง Site
        if (selectedSite.value !== 'All') {
            const itemSite = (item.Site || '').toUpperCase().trim();
            if (itemSite !== selectedSite.value) return false;
        }

        // 3. กรอง Type (เพิ่มใหม่) <--- 3. เพิ่ม Logic กรอง Type
        if (selectedType.value !== 'All') {
            // เช็ค key ให้ตรงกับ Database ของคุณ (AssetType หรือ Type)
            const itemType = (item.AssetType || '').trim();
            if (itemType !== selectedType.value) return false;
        }

        return true;
    });
});

const getGroupCount = (key) => {
    return assetsBySite.value.reduce((acc, item) => {
        const value = item[key] || 'Unknown';
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
};

// ==========================================
// DASHBOARD LOGIC (ECharts Options)
// ==========================================

// Helper: Common Style สำหรับ Dark Mode
const commonChartStyle = {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'Inter, sans-serif' },
    tooltip: {
        backgroundColor: '#111827',
        borderColor: '#374151',
        textStyle: { color: '#f3f4f6' },
        padding: 12
    }
};

// Stats Cards (Logic เดิม ไม่ต้องแก้)
const statsCards = computed(() => {
    const statusCounts = getGroupCount('Status');
    return [
        { title: 'Total Assets', value: assetsBySite.value.length, color: 'text-white', bg: 'bg-blue-600/20 border-blue-500/50' },
        { title: 'In Use', value: statusCounts['In Use'] || 0, color: 'text-green-400', bg: 'bg-green-600/20 border-green-500/50' },
        { title: 'Spare', value: statusCounts['Spare'] || 0, color: 'text-yellow-400', bg: 'bg-yellow-600/20 border-yellow-500/50' },
        { title: 'Repair', value: statusCounts['Repair'] || 0, color: 'text-red-400', bg: 'bg-red-600/20 border-red-500/50' },
    ];
});

// --- Chart 1: Status Distribution (Bar Chart) ---
const statusChartOption = computed(() => {
    const counts = getGroupCount('Status');
    const labels = Object.keys(counts);
    const data = Object.values(counts);

    return {
        ...commonChartStyle,
        tooltip: {
            ...commonChartStyle.tooltip,
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
        },
        grid: { top: 20, right: 20, bottom: 20, left: 40, containLabel: true },
        xAxis: {
            type: 'category',
            data: labels,
            axisLabel: { color: '#9ca3af' },
            axisLine: { show: false },
            axisTick: { show: false }
        },
        yAxis: {
            type: 'value',
            splitLine: { lineStyle: { type: 'dashed', color: '#374151' } },
            axisLabel: { color: '#9ca3af' }
        },
        series: [{
            name: 'Count',
            type: 'bar',
            data: data,
            barWidth: '40%',
            itemStyle: {
                borderRadius: [4, 4, 0, 0],
                color: (params) => {
                    const colors = ['#4ade80', '#facc15', '#f87171', '#9ca3af', '#3b82f6'];
                    return colors[params.dataIndex % colors.length];
                }
            }
        }]
    };
});

// --- Chart 2: Asset Type Distribution (Top 10 Bar) ---
const typeChartOption = computed(() => {
    const counts = getGroupCount('AssetType');
    const sortedKeys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 10);

    return {
        ...commonChartStyle,
        tooltip: {
            ...commonChartStyle.tooltip,
            trigger: 'axis'
        },
        grid: { top: 20, right: 20, bottom: 40, left: 40, containLabel: true },
        xAxis: {
            type: 'category',
            data: sortedKeys,
            axisLabel: {
                color: '#9ca3af',
                interval: 0,
                rotate: 45
            }
        },
        yAxis: {
            type: 'value',
            splitLine: { lineStyle: { type: 'dashed', color: '#374151' } },
            axisLabel: { color: '#9ca3af' }
        },
        series: [{
            name: 'Count',
            type: 'bar',
            data: sortedKeys.map(key => counts[key]),
            itemStyle: {
                borderRadius: [4, 4, 0, 0],
                // แก้ตรงนี้: เปลี่ยน color เป็น Function เพื่อเช็คเงื่อนไข
                color: (params) => {
                    const type = params.name; // ดึงชื่อประเภท (เช่น PC, Laptop)

                    // กำหนดสีตามเงื่อนไข
                    switch (type) {
                        case 'PC': return '#F4860C';
                        case 'Laptop': return '#00B050';
                        case 'Monitor': return '#A6A6A6';
                        case 'Thin Client': return '#ED1332';
                        default: return '#60a5fa'; // สี Default สำหรับประเภทอื่นๆ ที่ไม่ได้ระบุ
                    }
                }
            },
            barMaxWidth: 50
        }]
    };
});

// --- Chart 3: Site Comparison (Pie Chart HET1 vs HET2) ---
const siteComparisonOption = computed(() => {
    if (!assets.value) return {};

    const het1Count = assetsBySite.value.filter(item => item.Site?.toUpperCase().trim() === 'HET1').length;
    const het2Count = assetsBySite.value.filter(item => item.Site?.toUpperCase().trim() === 'HET2').length;

    return {
        ...commonChartStyle,
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)', // แสดง ชื่อ: ค่า (เปอร์เซ็นต์)
            backgroundColor: '#111827',
            borderColor: '#374151',
            textStyle: { color: '#f3f4f6' }
        },
        legend: {
            orient: 'vertical',
            right: 0,
            top: 'center',
            textStyle: { color: '#9ca3af' },
            itemWidth: 12,
            itemHeight: 12
        },
        series: [
            {
                name: 'Site Comparison',
                type: 'pie',
                radius: ['40%', '65%'], // ลดขนาดวงกลมลงนิดหน่อย เพื่อให้มีที่เหลือสำหรับเส้น Label
                center: ['50%', '55%'], // จัดให้อยู่กลางๆ (เพราะเราจะปิด Legend หรือย้าย Legend ไปข้างล่าง)
                avoidLabelOverlap: true, // เปลี่ยนเป็น true เพื่อไม่ให้ทับกัน
                itemStyle: {
                    borderRadius: 5,
                    borderColor: '#111827',
                    borderWidth: 2
                },
                // เปิด Label ให้แสดงค่า
                label: {
                    show: true,
                    formatter: '{b} \n {c}', // บรรทัดแรกชื่อ บรรทัดสองค่า
                    color: '#9ca3af'
                },
                data: [
                    { value: het1Count, name: 'HET1', itemStyle: { color: '#3b82f6' } },
                    { value: het2Count, name: 'HET2', itemStyle: { color: '#a855f7' } }
                ]
            }
        ]
    };
});
// ==========================================
// 3. DATA FETCHING & ACTIONS
// ==========================================

const fetchAssets = async () => {
    isLoading.value = true;
    try {
        const response = await fetch(`${API_URL}/api/asset`);
        if (response.ok) {
            const data = await response.json();
            assets.value = Array.isArray(data) ? data : [data];
        }
    } catch (error) {
        console.error('Error fetching assets:', error);
    } finally {
        isLoading.value = false;
    }
};

const exportAsset = async (item) => {
    try {
        const response = await fetch('src/Template/Book2.xlsx');
        if (!response.ok) throw new Error("ไม่พบไฟล์ Template");

        const buffer = await response.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const sheet = workbook.getWorksheet(1);
        const blackFont = { color: { argb: 'FF000000' } };

        const setDiagonalBorder = (cellId) => {
            const cell = sheet.getCell(cellId);
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
                diagonal: { up: true, style: 'thin' }
            };
        };

        const site = (item.Site || '').toString().trim().toUpperCase();
        if (site == 'HET1') {
            setDiagonalBorder('D4');
            setDiagonalBorder('L15');
        } else if (site == 'HET2') {
            setDiagonalBorder('J4');
            setDiagonalBorder('F15');
        }

        const headerCells = ['D9', 'D10', 'D11', 'D12', 'D33'];
        sheet.getCell('D9').value = item.AssetName || '-';
        sheet.getCell('D10').value = item.Model || '-';
        sheet.getCell('D11').value = item.SerialNumber || '-';
        sheet.getCell('D12').value = item.Location || '-';

        headerCells.forEach(cellId => {
            const cell = sheet.getCell(cellId);
            cell.alignment = { horizontal: 'middle', vertical: 'middle' };
            cell.font = blackFont;
        });

        const cellA26 = sheet.getCell('A26');
        cellA26.value = 1;
        cellA26.font = blackFont;

        const desc = `${item.AssetName || ''} / ${item.Brand || ''} / ${item.Model || ''}`;
        const cellB26 = sheet.getCell('B26');
        cellB26.value = desc;
        cellB26.alignment = { vertical: 'middle', wrapText: true };
        cellB26.font = blackFont;

        const cellE26 = sheet.getCell('E26');
        cellE26.value = 1;
        cellE26.font = blackFont;

        const cellE30 = sheet.getCell('E30');
        cellE30.value = 1;
        cellE30.font = blackFont;

        const cellH26 = sheet.getCell('H26');
        cellH26.value = item.InvNum || '-';
        cellH26.font = blackFont;

        const cellL26 = sheet.getCell('L26');
        cellL26.value = item.VendorName || item.Vendor || '-';
        cellL26.font = blackFont;

        sheet.getCell('D33').value = item.Location || '-';

        const outBuffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([outBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `FixedAsset_${item.AssetCode || 'Report'}.xlsx`);

    } catch (error) {
        console.error(error);
        alert('Export Failed: ' + error.message);
    }
};

onMounted(fetchAssets);

// ==========================================
// 4. SEARCH & PAGINATION
// ==========================================

const filteredAssets = computed(() => {
    // ใช้ assetsBySite แทน assets.value เพื่อให้ Table List กรองตาม Site ด้วย
    return assetsBySite.value.filter(item => {
        const query = searchQuery.value.toLowerCase();
        const searchTarget = `
            ${item.AssetCode || ''} 
            ${item.AssetName || ''}
            ${item.Type || ''}  
            ${item.EmpName || ''} 
            ${item.Department || ''}
            ${item.Location || ''}
            ${item.Site || ''}
            ${item.PurchaseDate || ''}
            ${item.WarrantyExpire || ''}
            ${item.Status || ''}
        `.toLowerCase();
        return searchTarget.includes(query);
    });
});

watch([searchQuery, selectedSite, selectedType], () => {
    currentPage.value = 1; // รีเซ็ตหน้าเมื่อค้นหาหรือเปลี่ยน Site
});

const paginatedAssets = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredAssets.value.slice(start, end);
});

const totalPages = computed(() => {
    return Math.ceil(filteredAssets.value.length / itemsPerPage);
});

const visiblePages = computed(() => {
    const total = totalPages.value;
    const current = currentPage.value;
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    range.push(1);
    for (let i = current - delta; i <= current + delta; i++) {
        if (i < total && i > 1) {
            range.push(i);
        }
    }
    if (total > 1) {
        range.push(total);
    }

    for (let i of range) {
        if (l) {
            if (i - l === 2) {
                rangeWithDots.push(l + 1);
            } else if (i - l !== 1) {
                rangeWithDots.push('...');
            }
        }
        rangeWithDots.push(i);
        l = i;
    }
    return rangeWithDots;
});

const changePage = (page) => {
    if (page === '...' || page < 1 || page > totalPages.value) return;
    currentPage.value = page;
};

// ==========================================
// 5. SELECTION LOGIC
// ==========================================

const toggleSelection = (id) => {
    if (selectedIds.value.includes(id)) {
        selectedIds.value = selectedIds.value.filter(sid => sid !== id);
    } else {
        selectedIds.value.push(id);
    }
};

const selectAllPage = () => {
    const pageIds = paginatedAssets.value.map(a => a.AssetCode);
    const newIds = pageIds.filter(id => !selectedIds.value.includes(id));
    selectedIds.value = [...selectedIds.value, ...newIds];
};

const clearSelection = () => {
    selectedIds.value = [];
};

const printLabels = () => {
    if (selectedIds.value.length === 0) return;
    const itemsToPrint = assets.value.filter(asset => selectedIds.value.includes(asset.AssetCode));
    printData.value = itemsToPrint;
    nextTick(() => {
        printLabelRef.value.print();
    });
};

// ==========================================
// 6. DELETE & MODAL ACTIONS
// ==========================================

const handleSoftDelete = async (item) => {
    if (!confirm(`Are you sure you want to DELETE "${item.AssetName}"?`)) return;
    try {
        const id = item.ID;
        const response = await fetch(`${API_URL}/api/asset/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, flag_remove: 1 })
        });

        if (response.ok) {
            const index = assets.value.findIndex(a => a.ID === item.ID);
            if (index !== -1) {
                assets.value[index].flag_remove = 1;
            }
            showDetailModal.value = false;
            if (selectedIds.value.includes(id)) toggleSelection(id);
            alert('Item deleted (Soft Delete).');
        } else {
            const errData = await response.text();
            alert('Failed to delete item: ' + errData);
        }
    } catch (error) {
        console.error(error);
        alert('Error: ' + error.message);
    }
};

const openEditPage = (item) => {
    emit('edit-asset', item);
};

const openDetailModal = (item) => {
    selectedAsset.value = { ...item };
    showDetailModal.value = true;
};
</script>

<template>
    <div class="screen-view-only">

        <div class="list-container p-6 bg-gray-950 min-h-screen text-gray-200 font-sans relative">

            <div
                class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-gray-800 pb-4 gap-4">
                <div>
                    <h2 class="text-2xl font-bold text-green-400 tracking-wide">ASSET LIST</h2>
                    <p class="text-[14px] text-gray-500 mt-1">Manage hardware inventory and status</p>
                </div>

                <div class="flex items-center gap-3 ">
                    <label class="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Site & Type:</label>
                    <select v-model="selectedSite"
                        class="bg-gray-800 text-white text-sm border border-gray-700 rounded px-3 py-1.5 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500">
                        <option value="All">All Sites</option>
                        <option value="HET1">HET1</option>
                        <option value="HET2">HET2</option>
                    </select>
                    <select v-model="selectedType"
                        class="bg-gray-800 text-white text-sm border border-gray-700 rounded px-3 py-1.5 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500">
                        <option value="All">All Type</option>
                        <option value="PC">PC</option>
                        <option value="Laptop">Laptop</option>
                        <option value="Monitor">Monitor</option>
                        <option value="Thin Client">Thin Client</option>
                    </select>
                </div>
            </div>

            <div v-if="!isLoading && assets.length > 0" class="mb-8">

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div v-for="(stat, index) in statsCards" :key="index"
                        class="p-4 rounded-xl border backdrop-blur-sm flex flex-row items-center justify-center shadow-lg transition hover:-translate-y-1 duration-300 gap-10"
                        :class="stat.bg">
                        <span
                            class="text-[16px] uppercase font-bold tracking-widest text-gray-300 mb-1 opacity-80 whitespace-nowrap truncate">{{
                                stat.title }} </span>
                        <span class="text-2xl font-black drop-shadow-md" :class="stat.color">{{ stat.value }}</span>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-gray-900 border border-gray-800 p-5 rounded-xl shadow-xl">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-green-500 shadow-green-500/50 shadow-sm"></span>
                                Total Asset in HET1 & HET2
                            </h3>
                            <span class="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400">{{ selectedSite
                                }}</span>
                        </div>
                        <div class="h-60 relative w-full flex justify-center">
                            <v-chart v-if="assets && assets.length > 0" class="chart" :option="siteComparisonOption"
                                autoresize />
                        </div>
                    </div>

                    <div class="bg-gray-900 border border-gray-800 p-5 rounded-xl shadow-xl">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-blue-500 shadow-blue-500/50 shadow-sm"></span>
                                Top Asset Types
                            </h3>
                            <span class="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400">{{ selectedSite
                                }}</span>
                        </div>
                        <div class="h-60 relative w-full">
                            <v-chart v-if="assets && assets.length > 0" class="chart" :option="typeChartOption"
                                autoresize />
                        </div>
                    </div>
                </div>

            </div>
            <div class="flex justify-between items-center mb-4 mt-8 border-t border-gray-800 pt-6">
                <div>
                    <p class="text-[14px] text-gray-400 flex items-center gap-1">
                        <svg fill="none" viewBox="0 0 24 24" stroke-width="4" stroke="currentColor"
                            class="w-3 h-3 text-blue-400">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" />
                        </svg>
                        Click row to select for printing
                    </p>
                </div>

                <div class="flex items-center gap-4">
                    <div class="relative w-64">
                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                            <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                                class="w-4 h-4">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                        </span>
                        <input v-model="searchQuery" type="text" placeholder="Search..."
                            class="w-full bg-gray-900 border border-gray-700 rounded-md pl-9 pr-4 py-2 text-sm text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition placeholder-gray-600">
                    </div>
                </div>
            </div>

            <div class="overflow-x-auto bg-gray-900 rounded-lg shadow-2xl border border-gray-800">
                <table class="w-full text-left border-collapse">
                    <thead
                        class="bg-gray-950 text-gray-400 uppercase font-bold text-[11px] tracking-wider border-b border-gray-800">
                        <tr>
                            <th class="p-4 w-[3%] text-gray-200">No.</th>
                            <th class="p-4 w-[15%] text-gray-200">Asset Code / Type</th>
                            <th class="p-4 w-[10%] text-gray-200">User / Dept</th>
                            <th class="p-4 w-[10%] text-gray-200">Location / Site</th>
                            <th class="p-4 w-[10%] text-gray-200">Remarks</th>
                            <th class="p-4 w-[8%] text-gray-200">Purchase</th>
                            <th class="p-4 w-[8%] text-gray-200">Warranty</th>
                            <th class="p-4 w-[5%] text-center text-gray-200">Status</th>
                            <th class="p-4 w-[5%] text-center text-gray-200">Details</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-800 text-sm">
                        <tr v-if="isLoading">
                            <td colspan="9" class="p-12 text-center text-green-400 animate-pulse">
                                <div class="flex flex-col items-center gap-2">
                                    <svg class="animate-spin h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                            stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                        </path>
                                    </svg>
                                    Loading Data...
                                </div>
                            </td>
                        </tr>
                        <tr v-else-if="paginatedAssets.length === 0">
                            <td colspan="9" class="p-8 text-center text-gray-500">
                                No data found.
                                <span v-if="selectedSite !== 'All'" class="block text-xs mt-1">Filter applied: {{
                                    selectedSite }}</span>
                            </td>
                        </tr>
                        <tr v-for="(item, index) in paginatedAssets" :key="item.AssetCode"
                            @click="toggleSelection(item.AssetCode)"
                            class="transition duration-150 group cursor-pointer select-none" :class="[
                                selectedIds.includes(item.AssetCode)
                                    ? 'bg-blue-900/20 border-l-4 border-l-blue-500'
                                    : 'hover:bg-gray-800/50 border-l-4 border-l-transparent'
                            ]">

                            <td class="p-4 align-top">
                                <div class="font-bold text-white text-sm mb-1 group-hover:text-green-300 transition">
                                    {{ (currentPage - 1) * itemsPerPage + index + 1 }}
                                </div>
                                <div v-if="selectedIds.includes(item.AssetCode)" class="text-green-400 mt-1">
                                    <svg fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor"
                                        class="w-4 h-4">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="m4.5 12.75 6 6 9-13.5" />
                                    </svg>
                                </div>
                            </td>
                            <td class="p-4 align-top">
                                <div class=" text-white text-sm mb-1 group-hover:text-green-300 transition font-medium">
                                    {{
                                        item.AssetCode }}</div>
                                <div class="flex items-center gap-2 text-center flex-wrap">

                                    <span
                                        class="text-[12px] text-gray-400 border border-gray-700 px-1 rounded bg-gray-800">{{
                                            item.AssetType }}</span>
                                </div>
                            </td>
                            <td class="p-4 align-top">
                                <div class="text-gray-300 text-sm">{{ item.EmpName || '-' }}</div>
                                <div class="text-sm text-gray-500 mt-0.5">{{ item.Department || '-' }}</div>
                            </td>
                            <td class="p-4 align-top">
                                <div class="text-gray-300 text-sm">{{ item.Location || '-' }}</div>
                                <div class="text-xs text-gray-500 mt-0.5 font-bold"
                                    :class="item.Site === 'HET1' ? 'text-purple-400' : 'text-orange-400'">{{ item.Site
                                        || '-' }}</div>
                            </td>
                            <td class="p-4 align-top">
                                <div class="text-gray-300 text-sm">{{ item.Note || '-' }}</div>
                            </td>
                            <td class="p-4 align-top">
                                <div class="text-sm text-gray-300">{{ item.PurchaseDate ?
                                    item.PurchaseDate.split('T')[0] :
                                    '-' }}</div>
                            </td>
                            <td class="p-4 align-top">
                                <div class="text-sm text-gray-300">{{ item.WarrantyExpire ?
                                    item.WarrantyExpire.split('T')[0] : '-' }}</div>
                            </td>
                            <td class="p-4 align-top text-center">
                                <span
                                    class="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border shadow-sm"
                                    :class="{
                                        'bg-green-900/30 text-green-400 border-green-800': item.Status === 'In Use',
                                        'bg-yellow-900/30 text-yellow-400 border-yellow-800': item.Status === 'Spare',
                                        'bg-red-900/30 text-red-400 border-red-800': item.Status === 'Repair',
                                        'bg-gray-300/20 text-gray-400 border-gray-700': item.Status === 'Scap',
                                        'bg-gray-800 text-gray-500 border-gray-700': !['In Use', 'Spare', 'Repair', 'Scap'].includes(item.Status)
                                    }">
                                    {{ item.Status || '-' }}
                                </span>
                            </td>
                            <td class="p-4 align-top text-center">
                                <div class="flex items-center justify-center gap-3">
                                    <button @click.stop="openDetailModal(item)"
                                        class="group p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none">
                                        <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                                            class="w-6 h-6">
                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div v-if="filteredAssets.length > 0"
                class="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
                <div class="text-sm text-gray-400 flex items-center gap-4">
                    <div>
                        Showing <span class="font-bold text-white">{{ (currentPage - 1) * itemsPerPage + 1 }}</span>
                        to <span class="font-bold text-white">{{ Math.min(currentPage * itemsPerPage,
                            filteredAssets.length)
                            }}</span>
                        of <span class="font-bold text-white">{{ filteredAssets.length }}</span>
                    </div>

                    <div v-if="selectedIds.length > 0 || paginatedAssets.length > 0"
                        class="flex items-center gap-3 pl-4 border-l border-gray-700">

                        <span v-if="selectedIds.length > 0" class="text-blue-400 font-bold text-sm">
                            {{ selectedIds.length }} Selected
                        </span>

                        <button @click="selectAllPage"
                            class="px-3 py-1.5 text-xs font-medium text-green-400 bg-gray-800 border border-gray-600 rounded hover:bg-green-900/30 hover:border-green-500 transition-colors">
                            Select All
                        </button>

                        <button v-if="selectedIds.length > 0" @click="clearSelection"
                            class="ml-2 px-3 py-1.5 text-xs font-medium text-red-400 bg-gray-800 border border-gray-600 rounded hover:bg-red-900/30 hover:border-red-500 transition-colors">
                            Clear
                        </button>

                    </div>
                </div>
                <div class="flex items-center justify-end gap-4">

                    <button v-if="selectedIds.length > 0" @click="printLabels"
                        class="btn btn-print shadow-lg shadow-cyan-500/20">
                        Print Label ({{ selectedIds.length }})
                    </button>


                    <div
                        class="flex items-center bg-gray-900 rounded-md border border-gray-800 overflow-hidden shadow-sm">
                        <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1"
                            class="px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed border-r border-gray-800">
                            Previous
                        </button>

                        <div class="flex">
                            <button v-for="(page, idx) in visiblePages" :key="idx" @click="changePage(page)"
                                class="px-3.5 py-2 text-sm border-r border-gray-800 last:border-r-0 transition min-w-[40px]"
                                :class="{
                                    'bg-blue-600 text-white font-bold': page === currentPage,
                                    'text-gray-400 hover:bg-gray-800 hover:text-white': page !== currentPage && page !== '...',
                                    'text-gray-600 cursor-default': page === '...'
                                }">
                                {{ page }}
                            </button>
                        </div>

                        <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages"
                            class="px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed border-l border-gray-800">
                            Next
                        </button>
                    </div>

                </div>
            </div>

            <Transition name="modal-fade">
                <div v-if="showDetailModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="showDetailModal = false"></div>

                    <div
                        class="relative bg-gray-900 border border-gray-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                        <div class="flex justify-between items-center p-5 border-b border-gray-800 bg-gray-950">
                            <div>
                                <h3 class="text-xl font-bold text-white flex items-center gap-2">
                                    <span class="text-green-500">
                                        <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
                                            class="w-6 h-6">
                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                        </svg>
                                    </span>
                                    Asset Details
                                </h3>
                            </div>
                            <button @click="showDetailModal = false" class="text-gray-500 hover:text-white transition">
                                <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
                                    class="w-6 h-6">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div class="p-6 overflow-y-auto custom-scrollbar">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="col-span-1 md:col-span-2">
                                    <h4
                                        class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b border-gray-800 pb-1">
                                        Identification</h4>
                                </div>
                                <div class="space-y-4">

                                    <div><span class="lbl">Asset Code</span>
                                        <div class="text-gray-300">{{ selectedAsset.AssetCode || '-' }}</div>
                                    </div>

                                    <div><span class="lbl">Fixed Asset</span>
                                        <div class="text-gray-300">{{ '-' }}</div>
                                    </div>

                                    <div><span class="lbl">Current Status</span>
                                        <span class="inline-block px-2 py-0.5 rounded text-xs font-bold uppercase mt-1"
                                            :class="{ 'bg-green-900 text-green-400': selectedAsset.Status === 'In Use', 'bg-yellow-900 text-yellow-400': selectedAsset.Status === 'Spare', 'bg-red-900 text-red-400': selectedAsset.Status === 'Repair', 'bg-gray-900 text-gray-400': selectedAsset.Status === 'Scap' }">{{
                                                selectedAsset.Status }}</span>
                                    </div>

                                </div>
                                <div class="space-y-4">
                                    <div><span class="lbl">Asset Name</span>
                                        <div class="text-gray-300 text-lg font-medium">{{ selectedAsset.AssetName }}
                                        </div>
                                    </div>

                                    <div><span class="lbl">Type</span>
                                        <div class="text-gray-300">{{ selectedAsset.AssetType }}</div>
                                    </div>

                                </div>

                                <div class="col-span-1 md:col-span-2">
                                    <h4
                                        class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b border-gray-800 pb-1">
                                        Hardware Specifications</h4>
                                </div>

                                <div class="space-y-4">
                                    <div><span class="lbl">Band / Model</span>
                                        <div class="text-gray-300">{{ selectedAsset.Brand || '-' }} / {{
                                            selectedAsset.Model
                                            || '-' }}</div>
                                    </div>
                                    <div><span class="lbl">Serial Number</span>
                                        <div class="text-gray-300">{{ selectedAsset.SerialNumber || '-' }}</div>
                                    </div>
                                    <div><span class="lbl">CPU / RAM / Storage</span>
                                        <div class="text-gray-300">{{ selectedAsset.CPU || '-' }} / {{ selectedAsset.RAM
                                            || '-' }} /
                                            {{
                                                selectedAsset.Storage || '-' }}</div>
                                    </div>
                                </div>

                                <div class="space-y-4">
                                    <div><span class="lbl">OS Name</span>
                                        <div class="text-gray-300">{{ selectedAsset.OSName || '-' }}</div>
                                    </div>
                                    <div><span class="lbl">OS Version</span>
                                        <div class="text-gray-300">{{ selectedAsset.OSVersion || '-' }}</div>
                                    </div>
                                    <div><span class="lbl">OS Build</span>
                                        <div class="text-gray-300">{{ selectedAsset.OSBuild || '-' }}</div>
                                    </div>

                                </div>

                                <div class="col-span-1 md:col-span-2 mt-2">
                                    <h4
                                        class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b border-gray-800 pb-1">
                                        User Assignment</h4>
                                </div>

                                <div class="space-y-4">
                                    <div><span class="lbl">Employee Name</span>
                                        <div class="text-gray-300">{{ selectedAsset.EmpName || '-' }}</div>
                                    </div>
                                    <div><span class="lbl">Department</span>
                                        <div class="text-gray-300">{{ selectedAsset.Department || '-' }}</div>
                                    </div>
                                </div>
                                <div class="space-y-4">
                                    <div><span class="lbl">Location</span>
                                        <div class="text-gray-300">{{ selectedAsset.Location || '-' }}</div>
                                    </div>
                                    <div><span class="lbl">Site</span>
                                        <div class="text-gray-300">{{ selectedAsset.Site || '-' }}</div>
                                    </div>
                                </div>

                                <div class="col-span-1 md:col-span-2 mt-2">
                                    <h4
                                        class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b border-gray-800 pb-1">
                                        Financial & Warranty</h4>
                                </div>

                                <div class="space-y-4">
                                    <div><span class="lbl">Vendor</span>
                                        <div class="text-gray-300">{{ selectedAsset.Vendor || '-' }}</div>
                                    </div>
                                    <div><span class="lbl">PO Number</span>
                                        <div class="text-gray-300">{{ selectedAsset.PoNum || '-' }}</div>
                                    </div>
                                    <div><span class="lbl">Invoice Number</span>
                                        <div class="text-gray-300">{{ selectedAsset.InvNum || '-' }}</div>
                                    </div>
                                </div>
                                <div class="space-y-4">
                                    <div><span class="lbl">Purchase Date</span>
                                        <div class="text-gray-300">{{ selectedAsset.PurchaseDate ?
                                            selectedAsset.PurchaseDate.split('T')[0] : '-' }}</div>
                                    </div>
                                    <div><span class="lbl">Warranty Expire</span>
                                        <div class="text-red-300">{{ selectedAsset.WarrantyExpire ?
                                            selectedAsset.WarrantyExpire.split('T')[0] : '-' }}</div>
                                    </div>
                                    <div>
                                        <span class="lbl">Remark</span>
                                        <div class="text-gray-300">{{ selectedAsset.Note || '-' }}</div>
                                    </div>
                                </div>
                                <div class="col-span-1 md:col-span-2 mt-2">
                                    <h4
                                        class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b border-gray-800 pb-1">
                                        Create & Update</h4>
                                </div>
                                <div class="space-y-4">
                                    <div><span class="lbl">Create By</span>
                                        <div class="text-gray-300">{{ selectedAsset.CreatedBy || '-' }}</div>
                                    </div>
                                    <div><span class="lbl">Create Date</span>
                                        <div class="text-gray-300">{{ selectedAsset.CreatedDate
                                            ? selectedAsset.CreatedDate.split('T')[0] : '-' }}</div>
                                    </div>
                                </div>
                                <div class="space-y-4">
                                    <div><span class="lbl">Update By</span>
                                        <div class="text-gray-300">{{ selectedAsset.UpdatedBy || '-' }}</div>
                                    </div>
                                    <div><span class="lbl">Update Date</span>
                                        <div class="text-gray-300">{{ selectedAsset.UpdatedDate
                                            ? selectedAsset.UpdatedDate.split('T')[0] : '-' }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="p-4 bg-gray-950 border-t border-gray-800 flex justify-end gap-3">
                            <button @click="exportAsset(selectedAsset)"
                                class="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-800 text-green-400 hover:bg-green-900/30 border border-transparent hover:border-green-800 transition text-sm font-medium">
                                <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                                    class="w-4 h-4">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                Export XLSX
                            </button>

                            <div class="flex-grow"></div>

                            <button @click="openEditPage(selectedAsset)"
                                class="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-800 text-blue-400 hover:bg-blue-900/30 border border-transparent hover:border-blue-800 transition text-sm font-medium">
                                <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                                    class="w-4 h-4">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                </svg>
                                Edit
                            </button>

                            <button @click="handleSoftDelete(selectedAsset)"
                                class="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-800 text-red-400 hover:bg-red-900/30 border border-transparent hover:border-red-800 transition text-sm font-medium">
                                <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                                    class="w-4 h-4">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                                Delete
                            </button>

                        </div>
                    </div>
                </div>
            </Transition>

        </div>

    </div>

    <AssetPrintLabel ref="printLabelRef" :inventoryList="printData" />
</template>

<style scoped>
/* Label Styling */
.lbl {
    display: block;
    font-size: 0.65rem;
    text-transform: uppercase;
    font-weight: 700;
    color: #6b7280;
    margin-bottom: 0.15rem;
    letter-spacing: 0.05em;
}

/* Scrollbar สำหรับ Modal Body */
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: #111827;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #374151;
    border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #4b5563;
}

/* Vue Transition: Modal Fade */
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: all 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
    transform: scale(0.95);
}

.btn {
    padding: 0.5rem 1.5rem;
    border-radius: 4px;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.8rem;
    letter-spacing: 0.5px;
}

.btn-print {
    background-color: #06b6d4;
    /* cyan-500 */
    color: #000;
}

.btn-print:hover {
    background-color: #22d3ee;
    /* cyan-400 */
}

@media print {

    /* ซ่อนหน้าจอ List ปกติเมื่อสั่ง Print */
    .screen-view-only {
        display: none !important;
    }

    /* บังคับให้หน้าเว็บไม่มี Margin เพื่อให้ Label ชิดขอบพอดี */
    html,
    body {
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
    }
}
</style>