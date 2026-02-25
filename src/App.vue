<script setup>
import { ref, onMounted, onUnmounted } from 'vue'; // เพิ่ม import onMounted, onUnmounted
import AssetForm from './AssetForm.vue';
import AssetList from './AssetList.vue';
import EditAsset from './EditAsset.vue';

// --- ส่วนจัดการเวลา (Clock Logic) ---
const currentTime = ref('');
let timerInterval = null;

const updateTime = () => {
  const now = new Date();
  // จัดรูปแบบเวลาตามต้องการ (ตัวอย่างเป็นแบบไทย)
  currentTime.value = now.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).replace(/,/g, '');
};
onMounted(() => {
  updateTime(); // รันครั้งแรกทันที
  timerInterval = setInterval(updateTime, 1000); // อัปเดตทุก 1 วินาที
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval); // เคลียร์ memory เมื่อปิดหน้า
});
// -----------------------------------

const currentView = ref('list');
const assetToEdit = ref(null);

const handleEditRequest = (item) => {
  assetToEdit.value = item;
  currentView.value = 'edit';
};

const handleFinishEdit = (shouldRefresh) => {
  currentView.value = 'list';
  assetToEdit.value = null;
};
</script>

<template>
  <div class="main-app bg-[#050505] min-h-screen text-white font-kanit">
    <nav
      class="bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center sticky top-0 z-40 screen-only">

      <div class="flex items-center gap-3">


        <div class="flex flex-col">
          <span class="font-bold tracking-widest text-2xl leading-none">
            ASSET SYSTEM MANAGEMENT
          </span>
          <span class="text-xm text-gray-400 font-mono mt-0.5">
            {{ currentTime }}
          </span>
        </div>
      </div>

      <div class="flex gap-2">
        <button @click="currentView = 'list'" :class="['nav-btn', currentView === 'list' ? 'active' : '']">
          View All Assets
        </button>
        <button @click="currentView = 'form'" :class="['nav-btn', currentView === 'form' ? 'active' : '']">
          + ADD & Print
        </button>
      </div>
    </nav>

    <div class="content-area">
      <AssetForm v-if="currentView === 'form'" />
      <AssetList v-if="currentView === 'list'" @edit-asset="handleEditRequest" />
      <EditAsset v-if="currentView === 'edit'" :asset-data="assetToEdit" @back="handleFinishEdit" />
    </div>
  </div>
</template>

<style>
/* CSS เดิมของคุณ (คงไว้เหมือนเดิม) */
@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600;700&display=swap');

.font-kanit {
  font-family: 'Kanit', sans-serif;
}

.nav-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #888;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.nav-btn:hover {
  background-color: #222;
  color: #fff;
}

.nav-btn.active {
  background-color: #00ff88;
  color: black;
  font-weight: bold;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

@media print {
  .screen-only {
    display: none !important;
  }
}
</style>