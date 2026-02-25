<script setup>
import { defineProps, defineExpose, nextTick } from 'vue';

// รับข้อมูลรายการที่จะพิมพ์เข้ามา
const props = defineProps({
    inventoryList: {
        type: Array,
        required: true,
        default: () => []
    }
});

// ฟังก์ชันสร้าง QR Code URL
const getQRUrl = (item) => {
    const dataString = [
        `ID:${item.ID || item.ID}`,
        `Asset Code:${item.assetCode || item.AssetCode}`,

    ].join('%');

    return `https://bwipjs-api.metafloor.com/?bcid=datamatrix&text=${encodeURIComponent(dataString)}&scale=3&padding=0`;
};

// --- แก้ไขฟังก์ชัน print ตรงนี้ ---
const print = async () => {
    if (props.inventoryList.length === 0) {
        alert('Cannot Print: The list is empty.');
        return;
    }

    // 1. รอให้ Vue update DOM ให้เสร็จก่อน เพื่อมั่นใจว่า tag <img> ถูกสร้างแล้ว
    await nextTick();

    // 2. ดึงรูปภาพ QR Code ทั้งหมดในหน้านั้นมา
    const images = Array.from(document.querySelectorAll('.qr-code-img'));

    // 3. สร้าง Promise เพื่อรอให้รูปทุกรูปโหลดเสร็จ (onload)
    const imageLoadPromises = images.map(img => {
        if (img.complete) return Promise.resolve(); // ถ้ารูปโหลดเสร็จแล้ว (cache) ก็ผ่านเลย
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve; // ถึง error ก็ให้ผ่านไปได้ (จะได้ไม่ค้าง)
        });
    });

    // 4. รอจนกว่าทุกรูปจะโหลดครบ แล้วค่อยสั่ง Print
    await Promise.all(imageLoadPromises);

    // (Optional) เพิ่ม delay เล็กน้อยเผื่อ Browser render ไม่ทัน
    setTimeout(() => {
        window.print();
    }, 500);
};

// เปิดให้ Component แม่เรียกใช้ฟังก์ชัน print ได้
defineExpose({ print });
</script>

<template>
    <div class="print-view-only">
        <div class="label-container">
            <div v-for="(item, index) in inventoryList" :key="index" class="asset-sticker">
                <div class="header-row">
                    <div class="device-name">{{ item.assetCode || item.AssetCode }}</div>
                    <div class="header-text-thai">คอมพิวเตอร์นี้เป็นสินทรัพย์ของ</div>
                </div>
                <div class="body-row">
                    <div class="qr-box">
                        <img :src="getQRUrl(item)" alt="Data Matrix" class="qr-code-img">
                    </div>
                    <div class="address-thai">
                        <div>บริษัทฮายากาว่า อิเล็กทรอนิกส์(ประเทศไทย)</div>
                        <div>จำกัด หากพบเห็น กรุณาส่งคืนที่บริษัท</div>
                        <div>เลขที่ 8/3 หมู่ 2 ต.บางวัว อ.บางปะกง</div>
                        <div>จ.ฉะเชิงเทรา 24130</div>
                        <div>โทร +66 038-086-999 #1281</div>
                    </div>
                </div>
                <div class="divider-line"></div>
                <div class="footer-row">
                    <div class="address-eng">
                        <div>This computer is the asset of Hayakawa electronic (Thailand)Ltd.</div>
                        <div>8/3 Moo.2 Bangwue Sub-District, Bangpakong District,</div>
                        <div>Chachoengsao Province 24130 </div>
                        <div>Tel +66 038-086-999 #1281 email: edp@hayakawa.co.th</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
/* ใช้ <style> ธรรมดา (ไม่ scoped) เพื่อให้ @media print 
   ทำงานกับหน้าจอรวมได้ถูกต้อง และซ่อน .screen-view-only ได้ 
*/
.print-view-only {
    display: none;
}

@media print {

    /* ซ่อนทุกอย่างที่มี class screen-view-only */
    .screen-view-only {
        display: none !important;
    }

    html,
    body {
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    .page-wrapper,
    .list-container {
        background-color: transparent !important;
        color: black !important;
        /* display: block !important; ลบออกเพื่อให้ screen-view-only ทำงานได้ */
    }

    .print-view-only {
        display: block !important;
        position: absolute;
        top: 0;
        left: 0;
        width: 48.5mm;
    }

    @page {
        size: 48.5mm 36mm landscape;
        margin: 0;
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

        color: #000 !important;
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
        color: #000 !important;
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
        color: #000 !important;
    }

    .address-thai div,
    .address-eng div {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
}
</style>