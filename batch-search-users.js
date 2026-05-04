const fs = require('fs');
const path = require('path');

// 用户名单
const userNames = [
    "陶白", "艾琳", "阿六", "安澜", "百慕大", "白起", "半泽", "包小二",
    "毕方", "财神", "朝歌", "超群", "晨风", "宸希", "辰也", "楚川",
    "大海", "代代", "叮当", "东东", "冬阳", "豆包儿", "依然", "悠米",
    "元芳", "云帆", "云舒", "云嵩", "雨晴", "蔚然", "张骞", "震霆",
    "芷若", "知微", "栀夏", "钟乔", "周周", "庄周", "朱凌霄", "子泓",
    "子衿", "子叶", "紫竹", "左道", "文澜", "香香", "项羽", "晓戈",
    "萧何", "小满", "晓祺", "小乔", "小雅", "笑颜", "里熊峰", "熊丽雨",
    "轩辕", "许负", "杨宇哲", "燕青", "延昭", "叶成", "翼德", "翊鸿",
    "英吉利", "木槿", "木夕", "南星", "佩兰", "千里", "晴川", "清馨",
    "青云", "柒彦", "山屿", "少英", "诗琳", "舒言", "松月", "苏木",
    "唐瑞", "婉蓉", "丸子", "魏菜", "文静", "可妮", "孔德斯", "乐琪",
    "乐依", "梁伟", "莉娜", "林博", "林冲", "凌曦", "灵芝", "林珏",
    "刘悦", "李艳", "李志魁", "鲁班", "洛一", "罗莹", "明兰", "芈月",
    "摩卡", "沐辰", "沐风", "里多乐", "方道", "飞扬", "妃子", "高渐离",
    "高乐", "古洁", "浩克", "郝里", "衡川", "洪丽丽", "洪欣", "伽罗",
    "姜维", "嘉鑫", "杰可", "晶晶", "靖霖", "君澜", "凯歌", "柯蓝",
    "都灵", "豆小美", "豆小晴", "豆小越", "朵拉"
];

// 读取token
const tokenFile = path.join(__dirname, 'public/data/feishu-web-oauth-token.json');
const tokenData = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
const accessToken = tokenData.accessToken;

console.log('🔑 使用个人OAuth token:', accessToken.substring(0, 20) + '...');
console.log('📋 待搜索用户数:', userNames.length);
console.log('');

// 搜索单个用户
async function searchUser(name) {
    try {
        const response = await fetch(
            'https://open.feishu.cn/open-apis/contact/v3/users/search?user_id_type=open_id',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: name,
                    page_size: 50
                })
            }
        );

        if (response.ok) {
            const data = await response.json();
            if (data.code === 0 && data.data && data.data.items && data.data.items.length > 0) {
                const items = data.data.items;
                console.log(`✅ ${name} - 找到 ${items.length} 个匹配用户`);
                items.forEach((item, idx) => {
                    console.log(`   ${idx + 1}. ${item.display_info?.replace(/<[^>]*>/g, '') || name} - ID: ${item.id}`);
                });
                return items;
            } else {
                console.log(`❌ ${name} - 未找到`);
                return [];
            }
        } else {
            console.log(`❌ ${name} - API调用失败: ${response.status}`);
            return [];
        }
    } catch (error) {
        console.log(`❌ ${name} - 搜索错误:`, error.message);
        return [];
    }
}

// 主函数
async function main() {
    console.log('🚀 开始批量搜索飞书用户...');
    console.log('');

    const allFoundUsers = [];
    
    // 先测试搜索几个已知用户
    const testNames = ["高乐", "平阳", "晨忻", "君澜"];
    console.log('🧪 先测试搜索几个已知用户:');
    for (const name of testNames) {
        const found = await searchUser(name);
        if (found.length > 0) {
            allFoundUsers.push(...found);
        }
        await new Promise(resolve => setTimeout(resolve, 200)); // 避免过快请求
    }
    
    console.log('');
    console.log('📊 测试完成，开始搜索完整名单...');
    console.log('');

    // 搜索完整名单
    for (const name of userNames) {
        const found = await searchUser(name);
        if (found.length > 0) {
            allFoundUsers.push(...found);
        }
        await new Promise(resolve => setTimeout(resolve, 150)); // 避免过快请求
    }

    console.log('');
    console.log('🎉 搜索完成!');
    console.log('📊 总共找到用户数:', allFoundUsers.length);
    
    // 去重
    const uniqueUsers = [];
    const seenIds = new Set();
    for (const user of allFoundUsers) {
        if (!seenIds.has(user.id)) {
            seenIds.add(user.id);
            uniqueUsers.push(user);
        }
    }
    
    console.log('📊 去重后用户数:', uniqueUsers.length);
    
    // 保存结果
    const resultFile = path.join(__dirname, 'public/data/search-results.json');
    fs.writeFileSync(resultFile, JSON.stringify(uniqueUsers, null, 2), 'utf8');
    console.log('💾 结果已保存到:', resultFile);
    
    console.log('');
    console.log('👥 找到的用户:');
    uniqueUsers.forEach((user, idx) => {
        console.log(`${idx + 1}. ${user.display_info?.replace(/<[^>]*>/g, '') || '未知用户'} - ID: ${user.id}`);
    });
}

main().catch(console.error);
