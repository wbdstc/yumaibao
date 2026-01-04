/**
 * MongoDB 数据导出脚本
 * 将所有集合导出为格式化的 JSON 文件
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// 数据库连接配置
const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'yumaobao';

// 输出目录
const OUTPUT_DIR = path.join(__dirname, 'database_export');

async function exportDatabase() {
    console.log('====================================');
    console.log('MongoDB 数据导出工具');
    console.log('====================================\n');

    // 创建输出目录
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log(`✓ 创建导出目录: ${OUTPUT_DIR}\n`);
    }

    let client;
    try {
        // 连接数据库
        console.log('正在连接 MongoDB...');
        client = new MongoClient(MONGO_URI);
        await client.connect();
        console.log('✓ 数据库连接成功\n');

        const db = client.db(DB_NAME);

        // 获取所有集合
        const collections = await db.listCollections().toArray();
        console.log(`发现 ${collections.length} 个集合:\n`);

        let totalDocuments = 0;

        // 遍历导出每个集合
        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;
            const collection = db.collection(collectionName);

            // 获取所有文档
            const documents = await collection.find({}).toArray();
            const count = documents.length;
            totalDocuments += count;

            // 导出为 JSON 文件
            const filePath = path.join(OUTPUT_DIR, `${collectionName}.json`);
            fs.writeFileSync(filePath, JSON.stringify(documents, null, 2), 'utf-8');

            console.log(`  ✓ ${collectionName}: ${count} 条记录 → ${collectionName}.json`);
        }

        console.log('\n====================================');
        console.log(`导出完成！共 ${collections.length} 个集合，${totalDocuments} 条记录`);
        console.log(`输出目录: ${OUTPUT_DIR}`);
        console.log('====================================');

    } catch (error) {
        console.error('导出失败:', error.message);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

exportDatabase();
