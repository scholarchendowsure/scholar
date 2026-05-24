'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function TestDialogFileUploadPage() {
  const handleSimpleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`Dialog - 最简单的input: 选择了文件: ${file.name}`);
    }
  };

  const handleOnChangeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`Dialog - 带onchange的input: 选择了文件: ${file.name}`);
    }
  };

  const handleXlsxFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`Dialog - accept=".xlsx"的input: 选择了文件: ${file.name}`);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-8">带Dialog的React文件上传测试</h1>
      
      <p className="mb-4 text-lg">
        请点击下方按钮打开Dialog，测试Dialog中的文件上传功能：
      </p>
      
      <Dialog>
        <DialogTrigger asChild>
          <Button className="text-lg px-8 py-4">
            打开Dialog测试文件上传
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Dialog中的文件上传测试</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-8 py-4">
            <div>
              <h2 className="text-2xl font-bold mb-4">Dialog测试1: 最简单的input</h2>
              <input 
                type="file" 
                onChange={handleSimpleFileChange}
                className="text-lg p-2 border rounded"
              />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold mb-4">Dialog测试2: 带样式的input</h2>
              <input 
                type="file" 
                onChange={handleOnChangeFileChange}
                className="text-lg p-4 border-2 border-gray-300 rounded-lg bg-gray-50 w-full"
              />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold mb-4">Dialog测试3: accept=".xlsx"的input</h2>
              <input 
                type="file" 
                accept=".xlsx"
                onChange={handleXlsxFileChange}
                className="text-lg p-2 border rounded"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
