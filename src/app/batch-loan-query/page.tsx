'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

interface LoanResult {
  loan_code: string;
  application_code: string | null;
  offer_ids: string[];
  offer_dataset: string | null;
  update_time: string | null;
  绑定店铺数量: string | null;
  未来应收在贷金额: string | null;
  未来应收: string | null;
  在贷金额: string | null;
  未来应收库存在贷金额: string | null;
  库存金额: string | null;
}

export default function BatchLoanQueryPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<LoanResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const parseOfferDataset = (dataset: string | null) => {
    if (!dataset) {
      return {
        绑定店铺数量: '',
        未来应收在贷金额: '',
        未来应收: '',
        在贷金额: '',
        未来应收库存在贷金额: '',
        库存金额: '',
      };
    }

    try {
      const data = JSON.parse(dataset);
      return {
        绑定店铺数量: data.bind_shop_count?.toString() || '',
        未来应收在贷金额: data.future_receive_or_loan_amount?.toString() || '',
        未来应收: data.future_receive?.toString() || '',
        在贷金额: data.loan_amount?.toString() || '',
        未来应收库存在贷金额: data.future_receive_and_inventory_or_loan_amount?.toString() || '',
        库存金额: data.inventory_amount?.toString() || '',
      };
    } catch {
      return {
        绑定店铺数量: '',
        未来应收在贷金额: '',
        未来应收: '',
        在贷金额: '',
        在贷金额: '',
        未来应收库存在贷金额: '',
        库存金额: '',
      };
    }
  };

  const handleProcess = async () => {
    if (!file) {
      setError('请选择Excel文件');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      // 读取Excel文件
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // 提取loan_code列表（A列）
      const loanCodes: string[] = [];
      jsonData.forEach((row: any) => {
        if (row.loan_code) {
          loanCodes.push(row.loan_code.toString());
        }
      });

      if (loanCodes.length === 0) {
        setError('未找到loan_code列或列为空');
        setLoading(false);
        return;
      }

      console.log(`找到 ${loanCodes.length} 条loan_code`);

      // 分批处理，每批50个
      const batchSize = 50;
      const allResults: LoanResult[] = [];

      for (let i = 0; i < loanCodes.length; i += batchSize) {
        const batch = loanCodes.slice(i, i + batchSize);
        const batchIndex = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(loanCodes.length / batchSize);

        setProgress(Math.round((i / loanCodes.length) * 100));

        try {
          const response = await fetch('/api/batch-loan-query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loanCodes: batch }),
          });

          const data = await response.json();

          if (data.success) {
            allResults.push(...data.data);
            console.log(`批次 ${batchIndex}/${totalBatches} 完成`);
          } else {
            console.error(`批次 ${batchIndex} 失败:`, data.message);
          }
        } catch (e) {
          console.error(`批次 ${batchIndex} 请求失败:`, e);
        }
      }

      setProgress(100);
      setResults(allResults);

      // 生成更新后的Excel
      const updatedData = jsonData.map((row: any) => {
        const result = allResults.find((r) => r.loan_code === row.loan_code?.toString());
        if (result) {
          const parsed = parseOfferDataset(result.offer_dataset);
          return {
            ...row,
            application_code: result.application_code || '',
            offer_dataset: result.offer_dataset || '',
            update_time: result.update_time || '',
            offer_id: result.offer_ids.join(', ') || '',
            绑定店铺数量: parsed.绑定店铺数量,
            未来应收在贷金额: parsed.未来应收在贷金额,
            未来应收: parsed.未来应收,
            在贷金额: parsed.在贷金额,
            未来应收库存在贷金额: parsed.未来应收库存在贷金额,
            库存金额: parsed.库存金额,
          };
        }
        return row;
      });

      // 创建新的workbook并下载
      const newWorkbook = XLSX.utils.book_new();
      const newWorksheet = XLSX.utils.json_to_sheet(updatedData);
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');

      // 生成文件名（添加时间戳）
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const outputFileName = `贷款数据更新_${timestamp}.xlsx`;
      XLSX.writeFile(newWorkbook, outputFileName);

      console.log(`处理完成，共 ${allResults.length} 条记录`);
    } catch (e) {
      console.error('处理失败:', e);
      setError('处理文件失败: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">批量贷款数据查询</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">上传Excel文件</h2>
            <p className="text-sm text-gray-500 mb-4">
              请上传包含loan_code列的Excel文件，系统将自动查询并填充以下字段：
            </p>
            <ul className="text-sm text-gray-500 list-disc list-inside mb-4">
              <li>application_code</li>
              <li>offer_dataset</li>
              <li>update_time</li>
              <li>offer_id</li>
              <li>绑定店铺数量</li>
              <li>未来应收/在贷金额</li>
              <li>未来应收</li>
              <li>在贷金额</li>
              <li>未来应收+库存/在贷金额</li>
              <li>库存金额</li>
            </ul>
          </div>

          <div className="mb-6">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                已选择文件: {file.name}
              </p>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-6">
            <button
              onClick={handleProcess}
              disabled={!file || loading}
              className={`px-6 py-3 rounded-md font-medium text-white transition
                ${loading || !file
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {loading ? '处理中...' : '开始处理'}
            </button>
          </div>

          {loading && (
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-gray-600 text-center">
                进度: {progress}%
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                查询结果 ({results.length} 条记录)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">loan_code</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">application_code</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">offer数量</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">update_time</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">绑定店铺</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.slice(0, 20).map((result, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900 font-mono">{result.loan_code}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 font-mono">{result.application_code || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{result.offer_ids.length}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{result.update_time || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{result.绑定店铺数量 || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {results.length > 20 && (
                  <p className="mt-2 text-sm text-gray-500">
                    仅显示前20条记录...
                  </p>
                )}
              </div>
              <p className="mt-4 text-sm text-green-600">
                文件已自动下载！
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
