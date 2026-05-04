// 测试登录脚本
const https = require('http');
const crypto = require('crypto');

function getCaptcha() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/captcha',
      method: 'GET',
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success && json.data) {
            // 从SVG中提取验证码
            const image = json.data.image;
            const svg = Buffer.from(image.split(',')[1], 'base64').toString('utf-8');
            const codeMatch = svg.match(/>([a-z0-9]+)<\/text>/i);
            if (codeMatch) {
              resolve({
                id: json.data.id,
                code: codeMatch[1]
              });
            } else {
              reject(new Error('无法从SVG中提取验证码'));
            }
          } else {
            reject(new Error('获取验证码失败'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

function login(username, password, captchaId, captcha) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username,
      password,
      captchaId,
      captcha
    });
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  try {
    console.log('1. 获取验证码...');
    const captcha = await getCaptcha();
    console.log('   验证码ID:', captcha.id);
    console.log('   验证码:', captcha.code);
    
    console.log('\n2. 尝试登录...');
    const result1 = await login('admin', 'admin123', captcha.id, captcha.code);
    console.log('   登录结果 (admin/admin123):', JSON.stringify(result1, null, 2));
    
    console.log('\n3. 再次获取验证码...');
    const captcha2 = await getCaptcha();
    console.log('   验证码ID:', captcha2.id);
    console.log('   验证码:', captcha2.code);
    
    console.log('\n4. 再次尝试登录...');
    const result2 = await login('Scholar', '9469832.Qaz', captcha2.id, captcha2.code);
    console.log('   登录结果 (Scholar):', JSON.stringify(result2, null, 2));
    
  } catch (e) {
    console.error('错误:', e);
  }
}

main();
