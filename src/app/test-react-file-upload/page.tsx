'use client';

import { useState } from 'react';

export default function TestReactFileUploadPage() {
  const handleFileChange1 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert('React测试1: 选择了文件 ' + file.name);
    }
  };

  const handleFileChange2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert('React测试2: 选择了文件 ' + file.name);
    }
  };

  const handleFileChange3 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert('React测试3: 选择了文件 ' + file.name);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>最简单的React文件上传测试</h1>

      <div style={{ marginBottom: '30px' }}>
        <h2>React测试1: 最简单的input</h2>
        <input type="file" onChange={handleFileChange1} />
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>React测试2: 带样式的input</h2>
        <input 
          type="file" 
          onChange={handleFileChange2}
          style={{ padding: '10px', border: '2px solid #ccc', borderRadius: '5px' }}
        />
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>React测试3: accept=".xlsx"的input</h2>
        <input type="file" accept=".xlsx" onChange={handleFileChange3} />
      </div>
    </div>
  );
}
