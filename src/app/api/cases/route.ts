import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';
import { generateCaseNo, generateBatchNumber, formatCurrency, formatDate } from '@/lib/utils';
import { CASE_STATUS_CONFIG } from '@/lib/constants';

// Mock数据 - 模拟数据库
const mockUsers = [
  { id: '1', name: '张三', username: 'zhangsan', role: 'agent', department: '外访部', status: 'active', email: 'zhangsan@example.com' },
  { id: '2', name: '李四', username: 'lisi', role: 'agent', department: '外访部', status: 'active', email: 'lisi@example.com' },
  { id: '3', name: '王五', username: 'wangwu', role: 'manager', department: '管理部', status: 'active', email: 'wangwu@example.com' },
  { id: '4', name: '赵六', username: 'zhaoliu', role: 'admin', department: '管理部', status: 'active', email: 'admin@example.com' },
];

const mockCases = [
  { id: '1', caseNo: 'CASE20240001', borrowerName: '陈小明', borrowerIdCard: '310***********1234', borrowerPhone: '138****5678', address: '上海市浦东新区张江镇XX路123号', debtAmount: '150000.00', status: 'pending_assign', overdueDays: 45, riskLevel: '中', fundingSource: '银行A', assignedUser: null, createdAt: '2024-01-15T10:00:00Z' },
  { id: '2', caseNo: 'CASE20240002', borrowerName: '刘小红', borrowerIdCard: '320***********5678', borrowerPhone: '139****8765', address: '南京市玄武区XX街456号', debtAmount: '280000.00', status: 'pending_visit', overdueDays: 62, riskLevel: '高', fundingSource: '银行A', assignedUser: '1', createdAt: '2024-01-14T09:30:00Z' },
  { id: '3', caseNo: 'CASE20240003', borrowerName: '王小二', borrowerIdCard: '330***********9012', borrowerPhone: '136****2345', address: '杭州市西湖区XX路789号', debtAmount: '95000.00', status: 'following', overdueDays: 30, riskLevel: '低', fundingSource: '银行B', assignedUser: '1', createdAt: '2024-01-13T14:20:00Z' },
  { id: '4', caseNo: 'CASE20240004', borrowerName: '张小华', borrowerIdCard: '340***********3456', borrowerPhone: '137****6789', address: '苏州市姑苏区XX弄101号', debtAmount: '420000.00', status: 'closed', overdueDays: 90, riskLevel: '极高', fundingSource: '银行B', assignedUser: '2', createdAt: '2024-01-12T11:45:00Z' },
  { id: '5', caseNo: 'CASE20240005', borrowerName: '李大妹', borrowerIdCard: '350***********7890', borrowerPhone: '135****4321', address: '福州市鼓楼区XX大道202号', debtAmount: '185000.00', status: 'following', overdueDays: 55, riskLevel: '中', fundingSource: '银行A', assignedUser: '2', createdAt: '2024-01-11T16:00:00Z' },
  { id: '6', caseNo: 'CASE20240006', borrowerName: '周大壮', borrowerIdCard: '360***********0123', borrowerPhone: '158****7654', address: '武汉市江汉区XX路303号', debtAmount: '320000.00', status: 'pending_assign', overdueDays: 38, riskLevel: '中', fundingSource: '银行C', assignedUser: null, createdAt: '2024-01-10T08:30:00Z' },
  { id: '7', caseNo: 'CASE20240007', borrowerName: '吴小丽', borrowerIdCard: '370***********4567', borrowerPhone: '159****3456', address: '济南市历下区XX街404号', debtAmount: '78000.00', status: 'pending_visit', overdueDays: 28, riskLevel: '低', fundingSource: '银行C', assignedUser: '1', createdAt: '2024-01-09T13:15:00Z' },
  { id: '8', caseNo: 'CASE20240008', borrowerName: '郑老三', borrowerIdCard: '380***********8901', borrowerPhone: '186****9012', address: '青岛市市北区XX路505号', debtAmount: '560000.00', status: 'following', overdueDays: 75, riskLevel: '极高', fundingSource: '银行A', assignedUser: '3', createdAt: '2024-01-08T10:00:00Z' },
];

const mockFollowups = [
  { id: '1', caseId: '2', visitUser: '张三', visitTime: '2024-01-16T14:00:00Z', visitResult: '成功拜访', communicationContent: '借款人表示愿意还款，但目前资金紧张', repaymentIntention: '有', nextPlan: '两周后再联系', promiseRepaymentDate: '2024-02-01', promiseRepaymentAmount: '50000' },
  { id: '2', caseId: '3', visitUser: '张三', visitTime: '2024-01-17T10:30:00Z', visitResult: '成功拜访', communicationContent: '借款人承诺下周五还款', repaymentIntention: '有', nextPlan: '等待还款', promiseRepaymentDate: '2024-01-25', promiseRepaymentAmount: '30000' },
  { id: '3', caseId: '5', visitUser: '李四', visitTime: '2024-01-15T16:00:00Z', visitResult: '无人应答', communicationContent: '电话无人接听，上门发现家中无人', repaymentIntention: null, nextPlan: '联系邻居获取更多信息', promiseRepaymentDate: null, promiseRepaymentAmount: null },
];

// 获取案件列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const keyword = searchParams.get('keyword') || '';
    const status = searchParams.get('status');
    const showDeleted = searchParams.get('showDeleted') === 'true';

    let filteredCases = [...mockCases];

    // 筛选
    if (keyword) {
      filteredCases = filteredCases.filter(c =>
        c.caseNo.includes(keyword) ||
        c.borrowerName.includes(keyword) ||
        c.borrowerPhone.includes(keyword)
      );
    }
    if (status) {
      filteredCases = filteredCases.filter(c => c.status === status);
    }

    // 分页
    const total = filteredCases.length;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;
    const paginatedCases = filteredCases.slice(offset, offset + pageSize);

    // 格式化数据
    const formattedCases = paginatedCases.map(c => {
      const assignee = mockUsers.find(u => u.id === c.assignedUser);
      return {
        ...c,
        assigneeName: assignee?.name || null,
        createdAt: formatDate(c.createdAt),
      };
    });

    return NextResponse.json(successResponse({
      data: formattedCases,
      total,
      page,
      pageSize,
      totalPages,
    }));
  } catch (error) {
    console.error('Get cases error:', error);
    return NextResponse.json(errorResponse('获取案件列表失败'), { status: 500 });
  }
}

// 创建案件
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newCase = {
      id: String(mockCases.length + 1),
      caseNo: generateCaseNo(),
      ...body,
      status: 'pending_assign',
      createdAt: new Date().toISOString(),
    };
    mockCases.push(newCase);

    return NextResponse.json(successResponse(newCase));
  } catch (error) {
    console.error('Create case error:', error);
    return NextResponse.json(errorResponse('创建案件失败'), { status: 500 });
  }
}
