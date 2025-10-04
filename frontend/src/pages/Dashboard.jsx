import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Receipt, DollarSign, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalExpenses: 0,
    pendingExpenses: 0,
    approvedExpenses: 0,
    rejectedExpenses: 0,
    totalAmount: 0,
    pendingApprovals: 0,
  });
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [expensesRes, approvalsRes] = await Promise.all([
        api.get('/expenses'),
        user.role !== 'employee' ? api.get('/expenses/pending-approvals') : Promise.resolve({ data: [] }),
      ]);

      const expenses = expensesRes.data;
      
      setStats({
        totalExpenses: expenses.length,
        pendingExpenses: expenses.filter(e => e.status === 'pending' || e.status === 'in_review').length,
        approvedExpenses: expenses.filter(e => e.status === 'approved').length,
        rejectedExpenses: expenses.filter(e => e.status === 'rejected').length,
        totalAmount: expenses.reduce((sum, e) => sum + parseFloat(e.converted_amount || e.amount), 0),
        pendingApprovals: approvalsRes.data.length,
      });

      setRecentExpenses(expenses.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-pending',
      approved: 'badge-approved',
      rejected: 'badge-rejected',
      in_review: 'badge-in-review',
    };
    return badges[status] || 'badge-pending';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600 mt-1">Here's what's happening with your expenses</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Expenses"
          value={stats.totalExpenses}
          icon={Receipt}
          color="bg-primary-500"
        />
        <StatCard
          title="Pending"
          value={stats.pendingExpenses}
          icon={Clock}
          color="bg-yellow-500"
        />
        <StatCard
          title="Approved"
          value={stats.approvedExpenses}
          icon={CheckCircle}
          color="bg-green-500"
        />
        <StatCard
          title="Total Amount"
          value={`${user?.companyCurrency} ${stats.totalAmount.toFixed(2)}`}
          icon={DollarSign}
          color="bg-purple-500"
        />
      </div>

      {user?.role !== 'employee' && stats.pendingApprovals > 0 && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-yellow-900">Pending Approvals</h3>
              <p className="text-sm text-yellow-700">
                You have {stats.pendingApprovals} expense{stats.pendingApprovals !== 1 ? 's' : ''} waiting for your approval
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Expenses */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Expenses</h2>
          <a href="/expenses" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View All
          </a>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No expenses yet</p>
            <a href="/expenses" className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block">
              Create your first expense
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Description</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Category</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{expense.description}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{expense.category_name || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">
                      {expense.currency_code} {parseFloat(expense.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`badge ${getStatusBadge(expense.status)}`}>
                        {expense.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
