<script setup>
import { reactive, onMounted, defineProps, defineEmits } from 'vue';

// 1. รับข้อมูลจาก Component แม่ (App.vue/AssetList.vue)
const props = defineProps({
    assetData: {
        type: Object,
        required: true,
        default: () => ({})
    }
});

const emit = defineEmits(['back', 'save']); // back=กลับ, save=บันทึกเสร็จแล้ว

const API_URL = import.meta.env.VITE_API_Font;

// 2. สร้างตัวแปร Form (โครงสร้างเดียวกับ AssetForm)
const form = reactive({
    assetName: '',
    date: '',
    assetCode: '',
    status: '',
    assetType: '',

    // Hardware
    brand: '',
    model: '',
    serialNum: '',
    cpu: '',
    ram: '',
    storage: '',

    // Software
    osName: '',
    osVersion: '',
    osBuild: '',

    // Purchase
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
    note: ''
});

// 3. ฟังก์ชันแปลงข้อมูลจาก Props (DB Keys) เข้าสู่ Form (Local Keys)
onMounted(() => {
    if (props.assetData) {
        const data = props.assetData;

        // Map Fields (ระวังตัวพิมพ์ใหญ่/เล็ก จาก Database SQL Server)
        form.id = data.id || data.ID || '';
        form.assetCode = data.AssetCode || '';
        form.assetName = data.AssetName || '';
        form.date = data.Date ? data.Date.split('T')[0] : '';
        form.status = data.Status || '';
        form.assetType = data.AssetType || '';

        form.brand = data.Brand || '';
        form.model = data.Model || '';
        form.serialNum = data.SerialNumber || '';
        form.cpu = data.CPU || '';
        form.ram = data.RAM || '';
        form.storage = data.Storage || '';

        form.osName = data.OSName || '';
        form.osVersion = data.OSVersion || '';
        form.osBuild = data.OSBuild || '';

        form.vendor = data.Vendor || '';
        form.poNum = data.PoNum || '';
        form.invNum = data.InvNum || '';

        // จัดการวันที่
        form.purchaseDate = data.PurchaseDate ? data.PurchaseDate.split('T')[0] : '';
        form.warrantyExpire = data.WarrantyExpire ? data.WarrantyExpire.split('T')[0] : '';

        form.empName = data.EmpName || '';
        form.department = data.Department || '';
        form.location = data.Location || '';
        form.site = data.Site || '';
        form.note = data.Note || '';
    }
});

// 4. ฟังก์ชันบันทึกการแก้ไข
const handleSave = async () => {
    console.log("Current Form Data:", form);
    if (!form.id) {
        alert('Error: Asset Code is missing! Cannot update.');
        return;
    }

    if (!confirm('Confirm Update?')) return;

    try {
        // ส่งข้อมูลไป Update ที่ Server (ใช้ AssetCode เป็น Key)
        // หมายเหตุ: ต้องตรวจสอบว่า server.js รองรับ PUT/PATCH ที่ endpoint นี้หรือไม่
        // ถ้าใช้ endpoint เดิมใน server.js อาจต้องปรับ logic ให้รองรับการ update
        const response = await fetch(`${API_URL}/api/asset/${form.id}`, {
            method: 'PUT', // หรือ POST แล้วแต่ Server
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });

        if (response.ok) {
            emit('back', true); // ส่ง true กลับไปเพื่อบอกให้ List รีเฟรชข้อมูล
        } else {
            const err = await response.text();
            alert('Update Failed: ' + err);
        }
    } catch (error) {
        console.error(error);
        alert('Error: ' + error.message);
    }
};

const handleCancel = () => {
    emit('back', false); // กลับโดยไม่รีเฟรช
};
</script>

<template>
    <div class="page-wrapper">
        <div class="container mx-auto p-8 max-w-[98%]">

            <div class="screen-view-only">
                <header class="mb-6 flex justify-between items-end border-b border-gray-800 pb-4">
                    <div>
                        <h1 class="text-3xl font-bold text-white tracking-wider">EDIT ASSET</h1>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-gray-500">System Status:</p>
                        <p class="text-xs text-green-400 font-mono">Backend Connected: {{ API_URL }}</p>
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

                        <div><label class="block text-xs text-yellow-400 mb-1 font-bold">DATE</label><input
                                v-model="form.date" type="text"
                                class="input-minimal bg-gray-800 text-gray-400 cursor-not-allowed" readonly></div>

                    </div>

                    <hr class="border-gray-800 mb-4">

                    <h3 class="text-xs text-gray-500 mb-2 uppercase tracking-widest font-bold">Hardware Specifications
                    </h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
                        <div>
                            <label class="block text-xs text-grey-400 mb-1">ASSET TYPE</label>
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
                            <label class="block text-xs text-grey-400 mb-1">SITE</label>
                            <select v-model="form.site" class="input-minimal cursor-pointer">
                                <option value="HET1">HET1</option>
                                <option value="HET2">HET2</option>
                            </select>
                        </div>
                    </div>

                    <hr class="border-gray-800 mb-4">

                    <h3 class="text-xs text-gray-500 mb-2 uppercase tracking-widest font-bold">Purchase & Vendor</h3>
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
                    <div class="flex-grow"></div>
                    <button @click="handleSave" class="btn btn-update"><span>Update</span></button>
                    <button @click="handleCancel" class="btn btn-cancel">Cancel</button>
                </div>


            </div>
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

.btn-update {
    background-color: #00ff88;
    color: #000;
}

.btn-update:hover {
    background-color: #00cc6a;
}

.btn-cancel {
    background-color: #333;
    color: #fff;
}

.btn-cancel:hover {
    background-color: #444;
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
</style>