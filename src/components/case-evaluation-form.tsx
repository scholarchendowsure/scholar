'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface CaseEvaluationFormProps {
  caseId: string;
}

// Helper to check if value is empty
const isEmpty = (v: any) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (typeof v === 'number' && isNaN(v));

// Cell component - renders either a label or an input
const Cell = ({
  value,
  isInput,
  inputKey,
  formData,
  onChange,
  className = '',
  colSpan = 1,
  rowSpan = 1,
}: {
  value: string;
  isInput: boolean;
  inputKey: string;
  formData: Record<string, string>;
  onChange: (key: string, val: string) => void;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
}) => {
  if (!isInput) {
    return (
      <td
        colSpan={colSpan}
        rowSpan={rowSpan}
        className={`border border-black px-2 py-1 text-sm ${className}`}
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      >
        {value}
      </td>
    );
  }

  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className="border border-black p-0"
    >
      <input
        type="text"
        value={formData[inputKey] || ''}
        onChange={(e) => onChange(inputKey, e.target.value)}
        className="w-full h-full px-2 py-1 text-sm outline-none bg-transparent"
      />
    </td>
  );
};

export default function CaseEvaluationForm({ caseId }: CaseEvaluationFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load saved data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/case-evaluation?caseId=${caseId}`);
        const result = await response.json();
        if (result.success && result.data) {
          // 数据可能直接保存在根级别或嵌套在formData中
          const loadedData = result.data.formData || result.data;
          // 排除系统字段
          const cleanData: Record<string, string> = {};
          Object.entries(loadedData).forEach(([key, value]) => {
            if (key !== 'updatedAt' && typeof value === 'string') {
              cleanData[key] = value;
            }
          });
          setFormData(cleanData);
        }
      } catch (error) {
        console.error('Failed to load evaluation data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (caseId) {
      loadData();
    }
  }, [caseId]);

  // Save data
  const saveData = useCallback(async (newData: Record<string, string>) => {
    try {
      setSaving(true);
      const response = await fetch('/api/case-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, formData: newData }),
      });
      const result = await response.json();
      if (!result.success) {
        toast.error('保存失败: ' + result.message);
      }
    } catch (error) {
      console.error('Failed to save evaluation data:', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  }, [caseId]);

  // Auto-save on change
  const handleChange = (key: string, value: string) => {
    const newData = { ...formData, [key]: value };
    setFormData(newData);
    // Debounce save
    setTimeout(() => {
      saveData(newData);
    }, 800);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
        <span className="ml-3">加载中...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Save indicator */}
      {saving && (
        <div className="fixed top-4 right-4 bg-gray-200 text-black px-3 py-1 rounded text-sm z-50 border border-black">
          保存中...
        </div>
      )}

      <table className="w-full border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
        <tbody>
          {/* Row 0: Title */}
          <tr>
            <td colSpan={10} className="border border-black text-center font-bold text-lg py-2">
              企业信用资产评估表
            </td>
          </tr>

          {/* Row 1: Section header */}
          <tr>
            <td colSpan={10} className="border border-black font-bold bg-gray-100 px-2 py-1">（一）企业信息</td>
          </tr>

          {/* Row 2 */}
          <tr>
            <Cell value="法人/实控人*" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r2c1" formData={formData} onChange={handleChange} />
            <Cell value="接待人/职位*" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r2c3" formData={formData} onChange={handleChange} />
            <Cell value="ID" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r2c5" formData={formData} onChange={handleChange} />
            <Cell value="最近还款日" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r2c7" formData={formData} onChange={handleChange} />
            <td className="border border-black"></td>
            <td className="border border-black"></td>
          </tr>

          {/* Row 3 */}
          <tr>
            <Cell value="性别*" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r3c1" formData={formData} onChange={handleChange} />
            <Cell value="年龄*" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r3c3" formData={formData} onChange={handleChange} />
            <Cell value="授信额度" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r3c5" formData={formData} onChange={handleChange} />
            <Cell value="逾期天数" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r3c7" formData={formData} onChange={handleChange} />
            <td className="border border-black"></td>
            <td className="border border-black"></td>
          </tr>

          {/* Row 4 */}
          <tr>
            <Cell value="籍贯*" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r4c1" formData={formData} onChange={handleChange} />
            <Cell value="婚姻情况" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r4c3" formData={formData} onChange={handleChange} />
            <Cell value="在贷余额" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r4c5" formData={formData} onChange={handleChange} />
            <Cell value="联系方式" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r4c7" formData={formData} onChange={handleChange} />
            <td className="border border-black"></td>
            <td className="border border-black"></td>
          </tr>

          {/* Row 5 */}
          <tr>
            <Cell value="房产情况" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r5c1" formData={formData} onChange={handleChange} />
            <Cell value="车辆情况" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r5c3" formData={formData} onChange={handleChange} />
            <Cell value="贷款日期" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r5c5" formData={formData} onChange={handleChange} />
            <Cell value="资金方" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r5c7" formData={formData} onChange={handleChange} />
            <td className="border border-black"></td>
            <td className="border border-black"></td>
          </tr>

          {/* Row 6 */}
          <tr>
            <Cell value="学历" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r6c1" formData={formData} onChange={handleChange} />
            <Cell value="从业经历" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r6c3" formData={formData} onChange={handleChange} />
            <Cell value="3PAR" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r6c5" formData={formData} onChange={handleChange} />
            <Cell value="产品名称" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r6c7" formData={formData} onChange={handleChange} />
            <td className="border border-black"></td>
            <td className="border border-black"></td>
          </tr>

          {/* Row 7 */}
          <tr>
            <Cell value="创业时长*" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r7c1" formData={formData} onChange={handleChange} />
            <Cell value="爱好" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r7c3" formData={formData} onChange={handleChange} />
            <Cell value="双锁" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r7c5" formData={formData} onChange={handleChange} />
            <Cell value="风险等级" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r7c7" formData={formData} onChange={handleChange} />
            <td className="border border-black"></td>
            <td className="border border-black"></td>
          </tr>

          {/* Row 8 */}
          <tr>
            <Cell value="借款企业名称" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r8c1" formData={formData} onChange={handleChange} colSpan={3} />
            <Cell value="香港或国内运营企业名称" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r8c5" formData={formData} onChange={handleChange} colSpan={5} />
          </tr>

          {/* Row 9 */}
          <tr>
            <Cell value="法人代表/董事" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r9c1" formData={formData} onChange={handleChange} colSpan={3} />
            <Cell value="法人代表/董事" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r9c5" formData={formData} onChange={handleChange} colSpan={5} />
          </tr>

          {/* Row 10 */}
          <tr>
            <Cell value="实控人" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r10c1" formData={formData} onChange={handleChange} />
            <Cell value="注册时间" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r10c3" formData={formData} onChange={handleChange} />
            <Cell value="实控人" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r10c5" formData={formData} onChange={handleChange} />
            <Cell value="注册时间" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r10c7" formData={formData} onChange={handleChange} />
            <td className="border border-black"></td>
            <td className="border border-black"></td>
          </tr>

          {/* Row 11 */}
          <tr>
            <Cell value="注册资本" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r11c1" formData={formData} onChange={handleChange} />
            <Cell value="关联公司数" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r11c3" formData={formData} onChange={handleChange} />
            <Cell value="注册资本" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r11c5" formData={formData} onChange={handleChange} />
            <Cell value="关联公司数" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r11c7" formData={formData} onChange={handleChange} />
            <td className="border border-black"></td>
            <td className="border border-black"></td>
          </tr>

          {/* Row 12 */}
          <tr>
            <Cell value="企业是否被执行" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r12c1" formData={formData} onChange={handleChange} />
            <Cell value="企业是否失信" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r12c3" formData={formData} onChange={handleChange} />
            <Cell value="企业是否被执行" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r12c5" formData={formData} onChange={handleChange} />
            <Cell value="企业是否失信" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r12c7" formData={formData} onChange={handleChange} />
            <td className="border border-black"></td>
            <td className="border border-black"></td>
          </tr>

          {/* Row 13 */}
          <tr>
            <Cell value="关联公司数" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r13c1" formData={formData} onChange={handleChange} />
            <Cell value="是否有股权代持" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r13c3" formData={formData} onChange={handleChange} />
            <Cell value="关联公司数" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r13c5" formData={formData} onChange={handleChange} />
            <Cell value="是否有股权代持" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r13c7" formData={formData} onChange={handleChange} />
            <td className="border border-black"></td>
            <td className="border border-black"></td>
          </tr>

          {/* Row 14: Section header */}
          <tr>
            <td colSpan={10} className="border border-black font-bold bg-gray-100 px-2 py-1">（二）访谈记录</td>
          </tr>

          {/* Row 15-26 */}
          {[
            { label: '表明身份', key: 'r15' },
            { label: '了解原因', key: 'r16' },
            { label: ' 店铺价值', key: 'r17' },
            { label: '团队规模', key: 'r18' },
            { label: ' 现金流', key: 'r19' },
            { label: '其他资产 ', key: 'r20' },
            { label: '库存与应收账款 ', key: 'r21' },
            { label: '固定资产', key: 'r22' },
            { label: '负债情况', key: 'r23' },
            { label: '逾期风险', key: 'r24' },
            { label: '还款计划 ', key: 'r25' },
            { label: '书面确认 ', key: 'r26' },
          ].map((item) => (
            <tr key={item.key}>
              <Cell value={item.label} isInput={false} inputKey="" formData={formData} onChange={handleChange} />
              <Cell value="" isInput inputKey={`${item.key}c1`} formData={formData} onChange={handleChange} colSpan={9} />
            </tr>
          ))}

          {/* Row 27: Section header */}
          <tr>
            <td colSpan={10} className="border border-black font-bold bg-gray-100 px-2 py-1">（三）经营情况</td>
          </tr>

          {/* Row 28 */}
          <tr>
            <Cell value="公司经营年限*" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r28c1" formData={formData} onChange={handleChange} colSpan={2} />
            <Cell value="公司所在地*" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r28c4" formData={formData} onChange={handleChange} colSpan={2} />
            <Cell value="地址有效性" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r28c7" formData={formData} onChange={handleChange} colSpan={4} />
          </tr>

          {/* Row 29 */}
          <tr>
            <Cell value="员工人数*" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r29c1" formData={formData} onChange={handleChange} />
            <Cell value="公司占地面积" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r29c3" formData={formData} onChange={handleChange} />
            <Cell value="店铺数量" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r29c5" formData={formData} onChange={handleChange} />
            <Cell value="场地租金" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r29c7" formData={formData} onChange={handleChange} />
            <td className="border border-black"></td>
            <td className="border border-black"></td>
          </tr>

          {/* Row 30 */}
          <tr>
            <Cell value="主营品类*" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r30c1" formData={formData} onChange={handleChange} />
            <Cell value="主营站点*" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r30c3" formData={formData} onChange={handleChange} />
            <Cell value="月支出" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r30c5" formData={formData} onChange={handleChange} />
            <Cell value="月回款" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r30c7" formData={formData} onChange={handleChange} />
            <td className="border border-black"></td>
            <td className="border border-black"></td>
          </tr>

          {/* Row 31 */}
          <tr>
            <Cell value="盈利能力" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r31c1" formData={formData} onChange={handleChange} />
            <Cell value="增长能力" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r31c3" formData={formData} onChange={handleChange} />
            <Cell value="现金流" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r31c5" formData={formData} onChange={handleChange} />
            <Cell value="淡旺季" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r31c7" formData={formData} onChange={handleChange} />
            <td className="border border-black"></td>
            <td className="border border-black"></td>
          </tr>

          {/* Row 32 */}
          <tr>
            <Cell value="经营平台规模\n及占比*" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r32c1" formData={formData} onChange={handleChange} colSpan={9} />
          </tr>

          {/* Row 33 */}
          <tr>
            <Cell value=" 年商品交易\n  总额合计：" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="                                 万人民币（等值）1USD=7CNY" isInput={false} inputKey="" formData={formData} onChange={handleChange} colSpan={9} />
          </tr>

          {/* Row 34-37: Photo records */}
          <tr>
            <Cell value="现场拍照*" isInput={false} inputKey="" formData={formData} onChange={handleChange} rowSpan={4} />
            <Cell value="1、门牌" isInput={false} inputKey="" formData={formData} onChange={handleChange} colSpan={9} />
          </tr>
          <tr>
            <Cell value="2、办公室" isInput={false} inputKey="" formData={formData} onChange={handleChange} colSpan={9} />
          </tr>
          <tr>
            <Cell value="3、仓库" isInput={false} inputKey="" formData={formData} onChange={handleChange} colSpan={9} />
          </tr>
          <tr>
            <Cell value="4、接待人" isInput={false} inputKey="" formData={formData} onChange={handleChange} colSpan={9} />
          </tr>

          {/* Row 38: Section header */}
          <tr>
            <td colSpan={10} className="border border-black font-bold bg-gray-100 px-2 py-1">（四）融资情况</td>
          </tr>

          {/* Row 39: Table header */}
          <tr>
            {['融资渠道', '融资类型', '授信额度', '在贷金额', '总利率', '期限', '支付公司', '锁定情况'].map((h, i) => (
              <td key={i} colSpan={i === 7 ? 4 : 1} className="border border-black bg-gray-200 font-bold text-center px-2 py-1">
                {h}
              </td>
            ))}
          </tr>

          {/* Row 40-45: Data rows */}
          {['r40', 'r41', 'r42', 'r43', 'r44', 'r45'].map((rowKey, idx) => (
            <tr key={rowKey}>
              <td className="border border-black p-0">
                <input
                  type="text"
                  value={formData[`${rowKey}c0`] || ''}
                  onChange={(e) => handleChange(`${rowKey}c0`, e.target.value)}
                  className="w-full h-full px-2 py-1 text-sm outline-none bg-transparent"
                />
              </td>
              <td className="border border-black px-2 py-1 text-sm">
                {idx === 0 ? '信用贷/ 企业贷' : ''}
              </td>
              {[1, 2, 3, 4, 5].map((colIdx) => (
                <td key={colIdx} className="border border-black p-0">
                  <input
                    type="text"
                    value={formData[`${rowKey}c${colIdx + 1}`] || ''}
                    onChange={(e) => handleChange(`${rowKey}c${colIdx + 1}`, e.target.value)}
                    className="w-full h-full px-2 py-1 text-sm outline-none bg-transparent"
                  />
                </td>
              ))}
              <td className="border border-black" colSpan={3}></td>
            </tr>
          ))}

          {/* Row 46 */}
          <tr>
            <Cell value="在贷合计：" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="                        万人民币（1USD:7CNY）" isInput={false} inputKey="" formData={formData} onChange={handleChange} colSpan={9} />
          </tr>

          {/* Row 47: Section header */}
          <tr>
            <td colSpan={10} className="border border-black font-bold bg-gray-100 px-2 py-1">（五）店铺数据</td>
          </tr>

          {/* Row 48 */}
          <tr>
            <Cell value="店铺主营经营品类" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r48c1" formData={formData} onChange={handleChange} />
            <Cell value="主要店铺数量" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r48c3" formData={formData} onChange={handleChange} />
            <Cell value="3PAR授权店铺数" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r48c5" formData={formData} onChange={handleChange} />
            <Cell value="双锁授权店铺数" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r48c7" formData={formData} onChange={handleChange} />
            <td className="border border-black"></td>
            <td className="border border-black"></td>
          </tr>

          {/* Row 49 */}
          <tr>
            <Cell value="近1年店铺销售额" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r49c1" formData={formData} onChange={handleChange} />
            <Cell value="近1年店铺销售同比增长" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r49c3" formData={formData} onChange={handleChange} />
            <Cell value="近1年店铺回款额" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r49c5" formData={formData} onChange={handleChange} />
            <Cell value="近1年店铺回款同比增长" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r49c7" formData={formData} onChange={handleChange} />
            <td className="border border-black"></td>
            <td className="border border-black"></td>
          </tr>

          {/* Row 50 */}
          <tr>
            <Cell value="退货率（均值）" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r50c1" formData={formData} onChange={handleChange} />
            <Cell value="近3月店铺销售额环比增长" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r50c3" formData={formData} onChange={handleChange} />
            <Cell value="近1年店铺回款率" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r50c5" formData={formData} onChange={handleChange} />
            <Cell value="近3月店铺回款额环比增长" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r50c7" formData={formData} onChange={handleChange} />
            <td className="border border-black"></td>
            <td className="border border-black"></td>
          </tr>

          {/* Row 51 */}
          <tr>
            <Cell value="FBA发货比例" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r51c1" formData={formData} onChange={handleChange} />
            <Cell value="月投入广告费用" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r51c3" formData={formData} onChange={handleChange} />
            <Cell value="月物流运输费用" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r51c5" formData={formData} onChange={handleChange} />
            <Cell value="店铺经营年限" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r51c7" formData={formData} onChange={handleChange} />
            <td className="border border-black"></td>
            <td className="border border-black"></td>
          </tr>

          {/* Row 52 */}
          <tr>
            <Cell value="FBA库存价值" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r52c1" formData={formData} onChange={handleChange} />
            <Cell value="FBA周转天数" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r52c3" formData={formData} onChange={handleChange} />
            <Cell value="店铺客单价" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r52c5" formData={formData} onChange={handleChange} />
            <Cell value="店铺毛利率" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r52c7" formData={formData} onChange={handleChange} />
            <td className="border border-black"></td>
            <td className="border border-black"></td>
          </tr>

          {/* Row 53 */}
          <tr>
            <Cell value="店铺经营数据图" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
            <Cell value="" isInput inputKey="r53c1" formData={formData} onChange={handleChange} colSpan={9} />
          </tr>

          {/* Row 54-57: Shop links */}
          {['r54', 'r55', 'r56', 'r57'].map((rowKey) => (
            <tr key={rowKey}>
              <Cell value="店铺链接" isInput={false} inputKey="" formData={formData} onChange={handleChange} />
              <Cell value="" isInput inputKey={`${rowKey}c1`} formData={formData} onChange={handleChange} colSpan={9} />
            </tr>
          ))}

          {/* Row 58: Section header */}
          <tr>
            <td colSpan={10} className="border border-black font-bold bg-gray-100 px-2 py-1">（六）企业资产评估资料真实性承诺及确认条款</td>
          </tr>

          {/* Row 59 */}
          <tr>
            <td colSpan={10} className="border border-black px-2 py-2 text-sm whitespace-pre-wrap" style={{ lineHeight: '1.6' }}>
              {'一、知悉及承诺内容\n 1.本企业/本人已完整阅读、充分理解本次实地尽调企业/本人资产评估表全部内容，清楚本次资产评估、尽职调查的目的、范围与用途。\n 2.本企业/本人承诺：向尽调评估方所提供的全部资料（含财务报表、经营数据、资产权属证明、租赁合同、进销存数据、征信资料、证照资质、店铺/场地经营信息、债权债务资料及其他辅助评估材料）均真实、合法、完整、有效、无隐瞒、无篡改、无遗漏，如实反映企业/本人实际经营状况、资产现状与负债情况。\n 3.本企业/本人保证不存在伪造、变造资料、虚构资产、隐瞒负债、虚报营收、隐匿经营风险等虚假申报行为。\n 4.若因本企/本人业提供虚假材料、隐瞒关键信息、填报不实数据，导致后续出现银行抽贷、信贷终止、账户/店铺冻结、合作违约、提前结清款项、法律诉讼、经济赔偿、行政处罚等一切不良后果及损失，均由本企业/本人及签字责任人自行承担全部法律责任、经济赔偿责任及一切连带责任，与尽调评估方无关。\n 5.本企业自愿配合后续复核、补充资料、现场核验等相关工作，如有信息变更将第一时间如实告知。'}
            </td>
          </tr>

          {/* Row 60 */}
          <tr>
            <td colSpan={5} className="border border-black px-2 py-2 text-sm whitespace-pre-wrap" style={{ lineHeight: '1.6' }}>
              {'二、签署栏\n\n企业名称（盖章）：\n\n法定代表人/授权代表签字：\n\n签署日期：________年________月________日'}
            </td>
            <td colSpan={5} className="border border-black px-2 py-2 text-sm whitespace-pre-wrap" style={{ lineHeight: '1.6' }}>
              {'\n签署人姓名：________ 职务：________\n\n身份证号：________________________\n\n联系电话：________________________\n\n签署日期：________年________月________日'}
            </td>
          </tr>

          {/* Row 61: Section header */}
          <tr>
            <td colSpan={10} className="border border-black font-bold bg-gray-100 px-2 py-1">（七）企业评估定级报告</td>
          </tr>

          {/* Row 62 */}
          <tr>
            <td colSpan={10} className="border border-black px-2 py-2 text-sm whitespace-pre-wrap" style={{ lineHeight: '1.6' }}>
              {'   本定级结论基于本次企业实地尽调、资产核验、经营数据核查、征信及风险排查结果综合评定，结合企业资产真实性、经营稳定性、负债情况、履约能力、合规经营状况等核心维度，客观出具最终评估等级、结论说明及后续合作风控建议。'}
            </td>
          </tr>

          {/* Row 63 */}
          <tr>
            <td colSpan={10} className="border border-black px-2 py-2 text-sm whitespace-pre-wrap" style={{ lineHeight: '1.6' }}>
              {'一、企业评估最终定级\n\n本次综合评估得分：______ 分\n\n评估等级：□ A级（无风险） □ B级（低风险） □ C级（高风险） □ D级（重风险）'}
            </td>
          </tr>

          {/* Row 64 */}
          <tr>
            <td colSpan={10} className="border border-black px-2 py-2 text-sm whitespace-pre-wrap" style={{ lineHeight: '1.6' }}>
              {'二、综合评估结论\n\n经实地核查企业经营场地、实物资产、财务数据、证照资料、债权债务及征信信息，结合本次尽调各项指标核验结果：该企业整体经营及资产状况评定为______等级。\n\n核心优势总结：________________________________________________________________________________________________\n\n现存风险及瑕疵总结：________________________________________________________________________________________________'}
            </td>
          </tr>

          {/* Row 65: Follow-up header */}
          <tr>
            <td colSpan={10} className="border border-black font-bold bg-gray-100 px-2 py-1">跟进记录表</td>
          </tr>

          {/* Row 66: Follow-up table header */}
          <tr>
            <td className="border border-black bg-gray-200 font-bold text-center px-2 py-1">跟进序列</td>
            <td className="border border-black bg-gray-200 font-bold text-center px-2 py-1">跟进人</td>
            <td className="border border-black bg-gray-200 font-bold text-center px-2 py-1">跟进日期</td>
            <td colSpan={8} className="border border-black bg-gray-200 font-bold text-center px-2 py-1">情况更新</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}