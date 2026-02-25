<script setup>
import { reactive, ref, onMounted } from 'vue';
import AssetPrintLabel from './AssetPrintLabel.vue';
// Configuration
const API_URL = import.meta.env.VITE_API_Font;

// 2. Reactive State
const form = reactive({
    assetName: '',
    date: new Date().toISOString().split('T')[0], // Default เป็นวันปัจจุบัน
    assetCode: '',

    status: '',
    assetType: '',

    // Hardware Info
    brand: '',
    model: '',
    serialNum: '',
    cpu: '',
    ram: '',
    storage: '',

    // Software Info
    osName: '',
    osVersion: '',
    osBuild: '',

    // Purchase Info
    vendor: '',
    poNum: '',
    invNum: '',
    purchaseDate: '',
    warrantyExpire: '',

    // User & Location
    empName: '',
    department: '',
    location: '',
    site: '',

    // Misc
    note: ''
});

const inventoryList = ref([]);
// 2. สร้าง Ref สำหรับเข้าถึง Component ลูก
const printLabelRef = ref(null);

// 3. Methods
const clearForm = () => {
    // รีเซ็ตค่า form ทั้งหมด แต่เก็บวันที่ปัจจุบันไว้
    const currentDate = new Date().toISOString().split('T')[0];

    Object.keys(form).forEach(key => form[key] = '');

    // Set default values
    form.date = currentDate;
    form.status = '';
    form.assetType = '';
    form.site = '';
};

// [แก้ไข] ฟังก์ชันบันทึกข้อมูล (Save & Add)
const addItem = async () => {
    if (!form.assetName) { alert('Please enter an Asset Name.'); return; }
    if (!form.warrantyExpire) { alert('Please select a Warranty Date.'); return; }

    // 1. เตรียมข้อมูลสำหรับส่งไป Backend
    // (Vue form ใช้ camelCase, Server แปลงเข้า DB เองได้จากโค้ด server.js ที่เราแก้ไป)

    try {
        const response = await fetch(`${API_URL}/api/asset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(form)
        });

        if (response.ok) {
            // 2. ถ้าบันทึก DB สำเร็จ -> เพิ่มลง List หน้าจอ
            inventoryList.value.push({ ...form });

            // 3. เคลียร์ฟอร์ม
            clearForm();
            alert('Saved to Database & Added to list.');
        } else {
            const errText = await response.text();
            alert('Error saving to database: ' + errText);
        }
    } catch (error) {
        alert('Cannot connect to server: ' + error.message);
    }
};

const deleteItem = (index) => {
    if (confirm('Are you sure you want to delete this item from the list?')) {
        inventoryList.value.splice(index, 1);
    }
};

const deleteAllItems = () => {
    if (inventoryList.value.length === 0) return;
    if (confirm('WARNING: This will delete ALL items in the list.\nAre you sure you want to proceed?')) {
        inventoryList.value = [];
    }
};

// 3. แก้ไข function printPage ให้เรียกใช้ Component แทน
const printPage = () => {
    if (inventoryList.value.length === 0) {
        alert('Cannot Print: The list is empty.');
        return;
    }
    // เรียก function print() ใน AssetPrintLabel.vue
    printLabelRef.value.print();
};
</script>

<template>
    <div class="page-wrapper">
        <div class="container mx-auto p-8 max-w-[98%]">

            <div class="screen-view-only">
                <header class="mb-6 flex justify-between items-end border-b border-gray-800 pb-4">
                    <div>
                        <h1 class="text-3xl font-bold text-white tracking-wider">NEW ASSET</h1>
                    </div>
                </header>

                <div class="bg-gray-900/50 p-6 rounded-lg mb-8 border border-gray-800">

                    <div class="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">

                        <div class="md:col-span-1 relative">
                            <label class="block text-xs text-green-400 mb-1 font-bold">ASSET CODE</label>

                            <input v-model="form.assetCode" type="text"
                                class="input-minimal border-l-4 border-l-green-500" placeholder="Enter Asset Code...">
                        </div>

                        <div class="md:col-span-3 relative">
                            <label class="block text-xs text-gray-400 mb-1 font-bold">ASSET NAME</label>

                            <input v-model="form.assetName" type="text"
                                class="input-minimal border-l-4 border-l-green-500">
                        </div>

                        <div>
                            <label class="block text-xs text-gray-400 mb-1 font-bold">STATUS</label>
                            <select v-model="form.status" class="input-minimal cursor-pointer">
                                <option value="In Use">In Use</option>
                                <option value="Spare">Spare</option>
                                <option value="Repair">Repair</option>
                                <option value="Scap">Scap</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-xs text-yellow-400 mb-1 font-bold">DATE</label><input
                                v-model="form.date" type="text"
                                class="input-minimal bg-gray-800 text-gray-400 cursor-not-allowed" readonly>
                        </div>

                    </div>

                    <hr class="border-gray-800 mb-4">

                    <h3 class="text-xs text-gray-500 mb-2 uppercase tracking-widest font-bold">Hardware Specifications
                    </h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">ASSET TYPE</label>
                            <select v-model="form.assetType" class="input-minimal cursor-pointer">
                                <option value="PC">PC</option>
                                <option value="Laptop">Laptop</option>
                                <option value="Monitor">Monitor</option>
                                <option value="Thin Client">Thin Client</option>
                            </select>
                        </div>
                        <div><label class="block text-xs text-gray-400 mb-1">BRAND</label><input v-model="form.brand"
                                type="text" class="input-minimal"></div>
                        <div><label class="block text-xs text-gray-400 mb-1">MODEL</label><input v-model="form.model"
                                type="text" class="input-minimal"></div>
                        <div class="lg:col-span-2"><label class="block text-xs text-gray-400 mb-1">SERIAL
                                NO.</label><input v-model="form.serialNum" type="text" class="input-minimal"></div>
                        <div><label class="block text-xs text-gray-400 mb-1">CPU</label><input v-model="form.cpu"
                                type="text" class="input-minimal"></div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div><label class="block text-xs text-gray-400 mb-1">RAM / STORAGE</label>
                            <div class="flex gap-1">
                                <input v-model="form.ram" type="text" class="input-minimal" placeholder="RAM">
                                <input v-model="form.storage" type="text" class="input-minimal" placeholder="HDD">
                            </div>
                        </div>

                        <div><label class="block text-xs text-gray-400 mb-1">OS NAME</label><input v-model="form.osName"
                                type="text" class="input-minimal" placeholder="Windows 11"></div>
                        <div><label class="block text-xs text-gray-400 mb-1">OS
                                VERSION</label><input v-model="form.osVersion" type="text" class="input-minimal"
                                placeholder="22H2">
                        </div>
                        <div><label class="block text-xs text-gray-400 mb-1">OS BUILD</label><input
                                v-model="form.osBuild" type="text" class="input-minimal"></div>
                    </div>

                    <hr class="border-gray-800 mb-4">

                    <h3 class="text-xs text-gray-500 mb-2 uppercase tracking-widest font-bold">User Assignment</h3>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div><label class="block text-xs text-gray-400 mb-1">EMPLOYEE NAME</label><input
                                v-model="form.empName" type="text" class="input-minimal"></div>
                        <div><label class="block text-xs text-gray-400 mb-1">DEPARTMENT</label>
                            <select v-model="form.department" class="input-minimal cursor-pointer">
                                <option value="Account">Account</option>
                                <option value="BOI">BOI</option>
                                <option value="Design">Design</option>
                                <option value="EDP">EDP</option>
                                <option value="FG">FG</option>
                                <option value="Japanese">Japanese</option>
                                <option value="Mats">Mats</option>
                                <option value="Personnel">Personnel</option>
                                <option value="Planning">Planning</option>
                                <option value="Production">Production</option>
                                <option value="Purchase">Purchase</option>
                                <option value="QA">QA</option>
                                <option value="Sales">Sales</option>
                            </select>
                        </div>
                        <div><label class="block text-xs text-gray-400 mb-1">LOCATION</label><input
                                v-model="form.location" type="text" class="input-minimal"></div>

                        <div>
                            <label class="block text-xs text-gray-400 mb-1">SITE</label>
                            <select v-model="form.site" class="input-minimal cursor-pointer">
                                <option value="HET1">HET1</option>
                                <option value="HET2">HET2</option>
                            </select>
                        </div>
                    </div>

                    <hr class="border-gray-800 mb-4">

                    <h3 class="text-xs text-gray-500 mb-2 uppercase tracking-widest font-bold">Financial & Warranty</h3>
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        <div><label class="block text-xs text-gray-400 mb-1">VENDOR</label><input v-model="form.vendor"
                                type="text" class="input-minimal"></div>
                        <div><label class="block text-xs text-gray-400 mb-1">PO NO.</label><input v-model="form.poNum"
                                type="text" class="input-minimal"></div>
                        <div><label class="block text-xs text-gray-400 mb-1">INV. NO.</label><input
                                v-model="form.invNum" type="text" class="input-minimal"></div>
                        <div><label class="block text-xs text-gray-400 mb-1">PURC. DATE</label><input
                                v-model="form.purchaseDate" type="date" class="input-minimal"></div>
                        <div><label class="block text-xs text-green-500 mb-1">WARRANTY (Req)</label><input
                                v-model="form.warrantyExpire" type="date" class="input-minimal text-white"></div>
                    </div>

                    <div>
                        <label class="block text-xs text-gray-400 mb-1">REMARK</label>
                        <input v-model="form.note" @keyup.enter="addItem" type="text" class="input-minimal"
                            placeholder="Additional remarks...">
                    </div>

                </div>

                <div class="flex gap-4 mb-10">
                    <button @click="printPage" class="btn btn-print transition-all duration-300"
                        :class="{ 'opacity-50 cursor-not-allowed': inventoryList.length === 0, 'hover:scale-105': inventoryList.length > 0 }">
                        Print Labels
                    </button>
                    <button @click="clearForm" class="btn btn-clear">Clear Form</button>
                    <button v-if="inventoryList.length > 0" @click="deleteAllItems" class="btn btn-delete">Delete
                        All</button>
                    <div class="flex-grow"></div>
                    <button @click="addItem" class="btn btn-add flex items-center gap-2"><span>+ Save to DB &
                            List</span></button>
                </div>

                <div class="overflow-x-auto pb-10">
                    <table class="table-minimal text-left w-full whitespace-nowrap">
                        <thead>
                            <tr>
                                <th width="3%">#</th>
                                <th>Asset Name / Status</th>
                                <th>Type / Model</th>
                                <th>User / Location</th>
                                <th>Specs (CPU/RAM/HDD)</th>
                                <th>OS Info</th>
                                <th>Purchase Info</th>
                                <th>Warranty</th>
                                <th>Note</th>
                                <th class="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, index) in inventoryList" :key="index"
                                class="hover:bg-gray-900 transition-colors">
                                <td class="text-xs text-gray-500">{{ index + 1 }}</td>
                                <td>
                                    <div class="text-sm font-bold text-white">{{ item.assetName }}</div>
                                    <span class="text-[10px] px-2 py-0.5 rounded font-bold" :class="{
                                        'bg-green-900 text-green-300': item.status === 'In Use',
                                        'bg-yellow-900 text-yellow-300': item.status === 'Spare',
                                        'bg-red-900 text-red-300': item.status === 'Repair',
                                        'bg-gray-900 text-gray-300': item.status === 'Scap'
                                    }">
                                        {{ item.status }}
                                    </span>
                                </td>
                                <td>
                                    <div class="text-xs text-white font-mono">{{ item.assetType }}</div>
                                    <div class="text-[10px] text-gray-500">{{ item.brand }} {{ item.model }}</div>
                                    <div class="text-[10px] text-gray-600">SN: {{ item.serialNum }}</div>
                                </td>
                                <td>
                                    <div class="text-xs text-white">{{ item.empName }}</div>
                                    <div class="text-[10px] text-gray-500">{{ item.department }}</div>
                                    <div class="text-[10px] text-gray-500">{{ item.location }} ({{ item.site }})</div>
                                </td>
                                <td>
                                    <div class="text-xs">{{ item.cpu }}</div>
                                    <div class="text-[10px] text-gray-500">{{ item.ram }} | {{ item.storage }}</div>
                                </td>
                                <td>
                                    <div class="text-xs">{{ item.osName }}</div>
                                    <div class="text-[10px] text-gray-500">{{ item.osVersion }}</div>
                                </td>
                                <td>
                                    <div class="text-xs">{{ item.vendor }}</div>
                                    <div class="text-[10px] text-gray-500">PO: {{ item.poNum }}</div>
                                </td>
                                <td>
                                    <div class="text-[10px] text-red-400">{{ item.warrantyExpire }}</div>
                                </td>
                                <td class="text-xs text-gray-500 italic truncate max-w-[100px]">{{ item.note }}</td>
                                <td class=""><button @click="deleteItem(index)" class="btn-sm-delete">Del</button></td>
                            </tr>
                            <tr v-if="inventoryList.length === 0">
                                <td colspan="10"
                                    class="text-center py-12 text-gray-600 italic border-dashed border-gray-800">
                                    No items pending.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <AssetPrintLabel ref="printLabelRef" :inventoryList="inventoryList" />
        </div>
    </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600;700&family=Sarabun:wght@400;600;700&display=swap');

.page-wrapper {
    font-family: 'Kanit', sans-serif;
    background-color: #050505;
    color: #e5e5e5;
    min-height: 100vh;
    width: 100%;
}

/* Minimal Input & Select Styling */
.input-minimal {
    background-color: #151515;
    border: 1px solid #333;
    color: #fff;
    padding: 0.4rem 0.5rem;
    width: 100%;
    border-radius: 4px;
    outline: none;
    transition: all 0.2s ease;
    font-size: 0.85rem;
}

.input-minimal:focus {
    border-color: #00ff88;
    background-color: #222;
}

/* Style for Select Dropdown options */
select.input-minimal option {
    background-color: #151515;
    color: #fff;
}

.input-minimal::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
    opacity: 0.6;
}

.input-minimal::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
}

/* Buttons */
.btn {
    padding: 0.5rem 1.5rem;
    border-radius: 4px;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.8rem;
    letter-spacing: 0.5px;
}

.btn-add {
    background-color: #00ff88;
    color: #000;
}

.btn-add:hover {
    background-color: #00cc6a;
}

.btn-clear {
    background-color: #333;
    color: #fff;
}

.btn-clear:hover {
    background-color: #444;
}

.btn-delete {
    background-color: #cc2222;
    color: #fff;
}

.btn-delete:hover {
    background-color: #ff4444;
}

.btn-print {
    background-color: #00ccff;
    color: #000;
}

.btn-print:hover {
    background-color: #33eaff;
}

.btn-sm-delete {
    background-color: #333;
    color: #ff5555;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.7rem;
    border: 1px solid #ff5555;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-sm-delete:hover {
    background-color: #ff5555;
    color: white;
}

/* Table */
.table-minimal {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
}

.table-minimal th {
    text-align: left;
    padding: 12px 8px;
    border-bottom: 2px solid #333;
    color: #888;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.table-minimal td {
    padding: 10px 8px;
    border-bottom: 1px solid #1a1a1a;
    vertical-align: top;
}

/* --- PRINT CSS --- */
.print-view-only {
    display: none;
}

@page {
    size: 48.5mm 36mm !important;
    margin: 0;
}

@media print {

    html,
    body {
        margin: 0 !important;
        padding: 0 !important;
        width: 48.5mm !important;
        height: 36mm !important;
    }

    .screen-view-only {
        display: none !important;
    }

    .page-wrapper {
        background-color: transparent !important;
        color: black !important;
        display: block !important;
    }

    .print-view-only {
        display: block !important;
        position: absolute;
        top: 0;
        left: 0;
        width: 48.5mm;
    }


    .asset-sticker {
        width: 48.5mm;
        height: 36mm;
        box-sizing: border-box;
        padding: 2.5mm 0.5mm;
        background: #fff;
        page-break-after: always;
        break-after: page;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .asset-sticker:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
    }

    .header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-bottom: 0.5mm;
        flex-shrink: 0;
    }

    .device-name {
        font-family: 'Sarabun', sans-serif;
        font-weight: 800;
        font-size: 6pt;
        color: #000;
        white-space: nowrap;
        width: 15.5mm;
        text-align: center;
    }

    .header-text-thai {
        font-family: 'Sarabun', sans-serif;
        font-weight: bold;
        font-size: 6.5pt;
        text-align: center;
        white-space: nowrap;
        width: 40mm;
    }

    .body-row {
        display: flex;
        align-items: flex-start;
        gap: 1mm;
        margin: 0;
        overflow: hidden;
        flex-shrink: 0;
    }

    .qr-box {
        flex-shrink: 0;
    }

    .qr-code-img {
        width: 15.5mm;
        height: 15.5mm;
        display: block;
    }

    .address-thai {
        font-family: 'Sarabun', sans-serif;
        font-size: 4.8pt;
        line-height: 1.75;
        text-align: left;
        flex: 1;
        min-width: 0;
        padding-top: 0.5mm;
    }

    .divider-line {
        border-bottom: 1px solid #000;
        width: 100%;
        margin: 1mm 0;
        height: 0;
        flex-shrink: 0;
    }

    .footer-row {
        flex-shrink: 0;
    }

    .address-eng {
        font-family: 'Sarabun', sans-serif;
        font-size: 4.8pt;
        line-height: 1.75;
        text-align: left;
    }

    .address-thai div,
    .address-eng div {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
}
</style>