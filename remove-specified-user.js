const fs = require('fs');
const path = require('path');

const FEISHU_USERS_FILE = path.join(__dirname, 'public/data/feishu-users.json');
const FEISHU_USERS_BACKUP = path.join(__dirname, 'public/data/feishu_users.json');
const USERS_V2_FILE = path.join(__dirname, 'public/data/users-v2.json');

// 指定要删除的用户
const USER_TO_REMOVE = 'ou_aa877f292fec75cd5415477d7c679249';

console.log('🔧 开始处理...');

// 读取飞书用户数据
let feishuUsers = [];
if (fs.existsSync(FEISHU_USERS_FILE)) {
    feishuUsers = JSON.parse(fs.readFileSync(FEISHU_USERS_FILE, 'utf8'));
    console.log(`📊 读取到飞书用户数据: ${feishuUsers.length} 个用户`);
}

// 删除指定用户
const originalCount = feishuUsers.length;
feishuUsers = feishuUsers.filter(u => u.id !== USER_TO_REMOVE);
const removedCount = originalCount - feishuUsers.length;
console.log(`🗑️  删除指定用户: ${removedCount} 个`);

// 保存到飞书用户数据
fs.writeFileSync(FEISHU_USERS_FILE, JSON.stringify(feishuUsers, null, 2), 'utf8');
console.log('💾 已保存到 feishu-users.json');

// 同时保存到备份文件
fs.writeFileSync(FEISHU_USERS_BACKUP, JSON.stringify(feishuUsers, null, 2), 'utf8');
console.log('💾 已保存备份到 feishu_users.json');

// 更新用户管理
let usersV2 = [];
if (fs.existsSync(USERS_V2_FILE)) {
    usersV2 = JSON.parse(fs.readFileSync(USERS_V2_FILE, 'utf8'));
    console.log(`👥 现有用户管理用户数: ${usersV2.length}`);
}

// 从用户管理中也删除指定用户
usersV2 = usersV2.filter(u => u.openId !== USER_TO_REMOVE && u.userId !== USER_TO_REMOVE);
console.log(`👥 用户管理用户数: ${usersV2.length}`);

// 保存到用户管理
fs.writeFileSync(USERS_V2_FILE, JSON.stringify(usersV2, null, 2), 'utf8');
console.log('💾 已保存到 users-v2.json');

console.log('\n🎉 删除完成！');
console.log(`\n📊 统计:`);
console.log(`   - 剩余飞书用户: ${feishuUsers.length}`);
console.log(`   - 剩余用户管理用户: ${usersV2.length}`);
console.log(`   - 删除用户ID: ${USER_TO_REMOVE}`);

console.log(`\n📁 保存的文件:`);
console.log(`   - public/data/feishu-users.json`);
console.log(`   - public/data/feishu_users.json (备份)`);
console.log(`   - public/data/users-v2.json`);

// 显示前10个用户
console.log(`\n👥 前10个用户列表:`);
feishuUsers.slice(0, 10).forEach((user, index) => {
    console.log(`   ${index + 1}. ${user.name}${user.enName ? ' | ' + user.enName : ''}${user.email ? ' - ' + user.email : ''} (ID: ${user.id})`);
});
if (feishuUsers.length > 10) {
    console.log(`   ... 还有 ${feishuUsers.length - 10} 个用户`);
}
