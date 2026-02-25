import express from 'express';
import sql from 'mssql/msnodesqlv8.js';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// // 1. ตั้งค่าการเชื่อมต่อ SQL Server (Windows Auth)
// const config = {
//     server: 'localhost',    // <--- ถ้า localhost ไม่ได้ ให้ใส่ชื่อเครื่อง (เช่น DESKTOP-XXX\SQLEXPRESS)
//     database: 'ITSystemDB',
//     driver: 'msnodesqlv8', 
//     options: {
//         trustedConnection: true 
//     }
// };
// 1. ตั้งค่าการเชื่อมต่อ SQL Server (Windows Auth)
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  connectionTimeout: 60000,
  requestTimeout: 60000
};


// เชื่อมต่อ Database ครั้งเดียวตอนเริ่ม
sql.connect(config).then(pool => {
    
        console.log('Connected to SQL Server successfully!');
    return pool;
}).catch(err => {
    console.error('Database Connection Failed! Check config below:');
    console.error(err);
});

// API 1: Search Device
app.get('/api/asset/:assetName', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('name', sql.NVarChar, req.params.assetName)
            .query('SELECT * FROM IT_Asset WHERE AssetName = @name');
            
        res.send(result.recordset[0] || null);
    } catch (err) {
        console.log(err);
        res.status(500).send(err.message);
    }
});

// API 2: Add Item (แก้ไขเพิ่ม CreatedBy, UpdatedBy)
app.post('/api/asset', async (req, res) => {
    const data = req.body;
    console.log("Received Data:", data);

    try {
        const pool = await sql.connect(config);
        
        // ตรวจสอบวันที่ก่อนส่งเข้า DB (ถ้าไม่มีข้อมูลให้เป็น null)
        // **หมายเหตุ:** เช็คชื่อตัวแปรจากหน้าเว็บดีๆ ว่าส่งมาเป็น purchaseDate หรือ date เฉยๆ
        const pDate = data.purchaseDate ? new Date(data.purchaseDate) : null;
        // เช็คว่าหน้าเว็บส่งมาชื่อ warrantyDate หรือ warrantyExpire (ในโค้ดเก่าคุณใช้ warrantyDate)
        const wDate = (data.warrantyExpire || data.warrantyDate) ? new Date(data.warrantyExpire || data.warrantyDate) : null;

        const query = `
            INSERT INTO IT_Asset 
            (AssetCode ,AssetName, CreatedDate, Status, AssetType, Brand, Model, SerialNumber, 
            CPU, RAM, Storage, OSName, OSVersion, OSBuild, Vendor, PoNum, InvNum, 
            PurchaseDate, WarrantyExpire, EmpName, Department, Location, Site, Note,
            CreatedBy, UpdatedBy)  -- <--- เพิ่มคอลัมน์ตรงนี้
            VALUES 
            (@assetCode, @assetName, @date, @status, @assetType, @brand, @model, @serialNum, 
            @cpu, @ram, @storage, @osName, @osVersion, @osBuild, @vendor, @poNum, @invNum, 
            @purchaseDate, @warrantyExpire, @empName, @department, @location, @site, @note,
            @createdBy, @updatedBy) -- <--- เพิ่มตัวแปรตรงนี้
        `;

        await pool.request()
            .input('assetCode', sql.NVarChar, data.assetCode)
            .input('assetName', sql.NVarChar, data.assetName)
            .input('date', sql.DateTime, data.date) 
            .input('status', sql.NVarChar, data.status)
            .input('assetType', sql.NVarChar, data.assetType)
            .input('brand', sql.NVarChar, data.brand)
            .input('model', sql.NVarChar, data.model)
            .input('serialNum', sql.NVarChar, data.serialNum)
            .input('cpu', sql.NVarChar, data.cpu)
            .input('ram', sql.NVarChar, data.ram)
            .input('storage', sql.NVarChar, data.storage)
            .input('osName', sql.NVarChar, data.osName)
            .input('osVersion', sql.NVarChar, data.osVersion)
            .input('osBuild', sql.NVarChar, data.osBuild)
            .input('vendor', sql.NVarChar, data.vendor)
            .input('poNum', sql.NVarChar, data.poNum)
            .input('invNum', sql.NVarChar, data.invNum)
            .input('purchaseDate', sql.Date, pDate)
            .input('warrantyExpire', sql.Date, wDate)
            .input('empName', sql.NVarChar, data.empName)
            .input('department', sql.NVarChar, data.department)
            .input('location', sql.NVarChar, data.location)
            .input('site', sql.NVarChar, data.site)
            .input('note', sql.NVarChar, data.note)
            // --- เพิ่มการกำหนดค่า Default เป็น "B" ตรงนี้ ---
            .input('createdBy', sql.NVarChar, 'B')
            .input('updatedBy', sql.NVarChar, 'B')
            .query(query);

        res.send({ message: 'Saved successfully' });

    } catch (err) {
        console.error("SQL Error:", err);
        res.status(500).send('Error saving to SQL Server: ' + err.message);
    }
});

// 3. API ดึงข้อมูลทั้งหมด (สำหรับแสดงในตาราง)
// ==========================================
app.get('/api/asset', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        // เรียงตามวันที่ล่าสุด (CreatedDate)
        const result = await pool.request()
            .query('SELECT * FROM IT_Asset ORDER BY CreatedDate DESC'); 
            
        res.send(result.recordset);
    } catch (err) {
        console.log(err);
        res.status(500).send(err.message);
    }
});

// ==========================================
// 4. API สำหรับ Edit และ Soft Delete (PUT)
// ==========================================
app.put('/api/asset/:id', async (req, res) => {
    try {
        const id = req.params.id; // ตรงนี้จะได้รับ AssetCode
        const data = req.body;

        const pool = await sql.connect(config);
        

        if (data.flag_remove === 1) {
            // เช็ค Query ตรงนี้: ต้องแน่ใจว่าใน DB ชื่อคอลัมน์คือ AssetCode จริงๆ
            await pool.request()
                .input('id', sql.Int, id)
                .query('UPDATE IT_Asset SET flag_remove = 1 WHERE ID = @id');
            
            return res.send({ message: 'Item deleted (Soft Delete)' });
        }

        // กรณี Edit ข้อมูล (Update)
        const query = `
            UPDATE IT_Asset SET 
                AssetCode = @assetCode,
                AssetName = @assetName,
                Status = @status,
                AssetType = @assetType,
                Brand = @brand,
                Model = @model,
                SerialNumber = @serialNum,
                CPU = @cpu,
                RAM = @ram,
                Storage = @storage,
                OSName = @osName,
                OSVersion = @osVersion,
                OSBuild = @osBuild,
                Vendor = @vendor,
                PoNum = @poNum,
                InvNum = @invNum,
                PurchaseDate = @purchaseDate,
                WarrantyExpire = @warrantyExpire,
                EmpName = @empName,
                Department = @department,
                Location = @location,
                Site = @site,
                Note = @note,
                UpdatedDate = GETDATE()
            WHERE ID = @id
        `;

        await pool.request()
            .input('id', sql.Int, id)
            .input('assetCode', sql.NVarChar, data.assetCode)
            .input('assetName', sql.NVarChar, data.assetName)
            .input('status', sql.NVarChar, data.status)
            .input('assetType', sql.NVarChar, data.assetType)
            .input('brand', sql.NVarChar, data.brand)
            .input('model', sql.NVarChar, data.model)
            .input('serialNum', sql.NVarChar, data.serialNum)
            .input('cpu', sql.NVarChar, data.cpu)
            .input('ram', sql.NVarChar, data.ram)
            .input('storage', sql.NVarChar, data.storage)
            .input('osName', sql.NVarChar, data.osName)
            .input('osVersion', sql.NVarChar, data.osVersion)
            .input('osBuild', sql.NVarChar, data.osBuild)
            .input('vendor', sql.NVarChar, data.vendor)
            .input('poNum', sql.NVarChar, data.poNum)
            .input('invNum', sql.NVarChar, data.invNum)
            // เช็คว่า Date เป็น string ว่างหรือไม่ ถ้าว่างให้ส่ง null
            .input('purchaseDate', sql.Date, data.purchaseDate === '' ? null : data.purchaseDate)
            .input('warrantyExpire', sql.Date, data.warrantyExpire === '' ? null : data.warrantyExpire)
            .input('empName', sql.NVarChar, data.empName)
            .input('department', sql.NVarChar, data.department)
            .input('location', sql.NVarChar, data.location)
            .input('site', sql.NVarChar, data.site)
            .input('note', sql.NVarChar, data.note)
            .query(query);

        res.send({ message: 'Update success' });

    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

const PORT = process.env.B_PORT || 3000;
app.listen(PORT, () => {
    console.log('Server running on port', PORT);
});