import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv} from 'vite'
import vue from '@vitejs/plugin-vue'
//import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // โหลดไฟล์ .env จาก Root Directory (ที่เดียวกับ package.json)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      // vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    server: {
      // ดึงค่าจาก F_PORT ใน .env ถ้าไม่มีให้ใช้ 6001 เป็น Default
      port: parseInt(env.F_PORT) || 6001,
      // เปิด host เป็น true เพื่อให้เข้าใช้งานผ่าน IP 192.168.101.96 ได้
      host: true, 
    },
  }
})
