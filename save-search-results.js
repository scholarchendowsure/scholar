const fs = require('fs');
const path = require('path');

// 读取搜索结果
const searchResultsFile = path.join(__dirname, 'public/data/search-results.json');
const searchResults = JSON.parse(fs.readFileSync(searchResultsFile, 'utf8'));

console.log('📊 读取到搜索结果:', searchResults.length, '个用户');

// 转换为飞书用户格式
const feishuUsers = [];

searchResults.forEach((item, index) => {
    // 清理名称，去除HTML标签和换行
    let name = item.display_info?.replace(/<[^>]*>/g, '').replace(/\n/g, ' ') || '未知用户';
    
    // 提取纯中文名（如果包含 | 分隔符）
    if (name.includes('|')) {
        name = name.split('|')[0].trim();
    }
    
    // 提取英文名
    let enName = '';
    if (item.display_info?.includes('|')) {
        enName = item.display_info.split('|')[1]?.split('\n')[0]?.trim() || '';
    } else if (item.meta_data?.i18n_names) {
        enName = item.meta_data.i18n_names.en_us || '';
    }
    
    feishuUsers.push({
        id: item.id,
        unionId: '',
        userId: item.id,
        openId: item.id,
        name: name,
        enName: enName,
        email: item.meta_data?.enterprise_mail_address || '',
        mobile: '',
        avatarUrl: '',
        company: '',
        chatId: item.meta_data?.chat_id || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
});

console.log('✅ 转换完成，准备保存', feishuUsers.length, '个用户');

// 保存到飞书用户数据
const feishuUsersFile = path.join(__dirname, 'public/data/feishu-users.json');
fs.writeFileSync(feishuUsersFile, JSON.stringify(feishuUsers, null, 2), 'utf8');
console.log('💾 已保存到 feishu-users.json');

// 同时更新备份文件
const feishuUsersBackupFile = path.join(__dirname, 'public/data/feishu_users.json');
fs.writeFileSync(feishuUsersBackupFile, JSON.stringify(feishuUsers, null, 2), 'utf8');
console.log('💾 已保存备份到 feishu_users.json');

// 读取现有的用户管理数据
const usersV2File = path.join(__dirname, 'public/data/users-v2.json');
let usersV2 = [];
if (fs.existsSync(usersV2File)) {
    usersV2 = JSON.parse(fs.readFileSync(usersV2File, 'utf8'));
}

console.log('👥 现有用户管理用户数:', usersV2.length);

// 将飞书用户同步到用户管理
const existingOpenIds = new Set(usersV2.map(u => u.openId).filter(Boolean));
let newUsersCount = 0;
let updatedUsersCount = 0;

feishuUsers.forEach(feishuUser => {
    // 查找现有用户
    const existingIndex = usersV2.findIndex(u => 
        u.openId === feishuUser.openId || 
        u.userId === feishuUser.userId ||
        u.unionId === feishuUser.unionId
    );
    
    if (existingIndex >= 0) {
        // 更新现有用户
        usersV2[existingIndex] = {
            ...usersV2[existingIndex],
            name: feishuUser.name,
            email: feishuUser.email,
            mobile: feishuUser.mobile,
            updatedAt: new Date().toISOString()
        };
        updatedUsersCount++;
    } else {
        // 新增用户
        const newUser = {
            id: feishuUser.id || `user_${Date.now()}_${Math.random()}`,
            username: feishuUser.name.replace(/\s/g, '').toLowerCase() || `user${Date.now()}`,
            password: 'admin123', // 默认密码
            name: feishuUser.name,
            email: feishuUser.email,
            mobile: feishuUser.mobile,
            role: 'field_officer', // 默认外访员
            status: 'active',
            openId: feishuUser.openId,
            unionId: feishuUser.unionId,
            userId: feishuUser.userId,
            avatar: feishuUser.avatarUrl,
            department: '',
            position: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: null
        };
        usersV2.push(newUser);
        newUsersCount++;
    }
});

console.log('📈 新增用户:', newUsersCount, '个');
console.log('📝 更新用户:', updatedUsersCount, '个');
console.log('👥 用户管理总用户数:', usersV2.length);

// 保存到用户管理
fs.writeFileSync(usersV2File, JSON.stringify(usersV2, null, 2), 'utf8');
console.log('💾 已保存到 users-v2.json');

console.log('');
console.log('🎉 保存完成！');
console.log('');
console.log('📊 统计:');
console.log('   - 搜索到的飞书用户:', feishuUsers.length);
console.log('   - 新增到用户管理:', newUsersCount);
console.log('   - 更新到用户管理:', updatedUsersCount);
console.log('   - 用户管理总用户:', usersV2.length);
console.log('');
console.log('📁 保存的文件:');
console.log('   - public/data/feishu-users.json');
console.log('   - public/data/feishu_users.json (备份)');
console.log('   - public/data/users-v2.json');

console.log('');
console.log('👥 前20个用户列表:');
feishuUsers.slice(0, 20).forEach((user, idx) => {
    console.log(`   ${idx + 1}. ${user.name}${user.enName ? ' | ' + user.enName : ''}${user.email ? ' - ' + user.email : ''} (ID: ${user.openId})`);
});
if (feishuUsers.length > 20) {
    console.log(`   ... 还有 ${feishuUsers.length - 20} 个用户`);
}
