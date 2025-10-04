import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Eye, Clock } from 'lucide-react';
import { format } from 'date-fns';

const Approvals = () => {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [comments, setComments] = useState('');
  const [actionType, setActionType] = useState('');

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      const response = await api.get('/expenses/pending-approvals');
      setPendingApprovals(response.data);
    } catch (error) {
      toast.error('Failed to fetch pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenseDetails = async (expenseId) => {
    try {
      const response = await api.get(`/expenses/${expenseId}`);
      setSelectedExpense(response.data);
      setShowModal(true);
    } catch (error) {
      toast.error('Failed to fetch expense details');
    }
  };

  const handleApprove = async () => {
    try {
      await api.post(`/expenses/${selectedExpense.id}/approve`, { comments });
      toast.success('Expense approved successfully');
      setShowModal(false);
      setComments('');
      fetchPendingApprovals();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve expense');
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      await api.post(`/expenses/${selectedExpense.id}/reject`, { comments });
      toast.success('Expense rejected');
      setShowModal(false);
      setComments('');
      fetchPendingApprovals();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject expense');
    }
  };

  const openApprovalModal = (expense, action) => {
    fetchExpenseDetails(expense.id);
    setActionType(action);
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
        <h1 className="text-3xl font-bold text-gray-900">Pending Approvals</h1>
        <p className="text-gray-600 mt-1">Review and approve expense claims</p>
      </div>

      {pendingApprovals.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No pending approvals</p>
          <p className="text-sm text-gray-500 mt-1">All caught up!</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {pendingApprovals.map((expense) => (
            <div key={expense.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {expense.description}
                    </h3>
                    <span className="badge badge-in-review">
                      {expense.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Employee</p>
                      <p className="font-medium text-gray-900">
                        {expense.employee_first_name} {expense.employee_last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Amount</p>
                      <p className="font-medium text-gray-900">
                        {expense.currency_code} {parseFloat(expense.amount).toFixed(2)}
                      </p>
                      {expense.converted_amount && expense.currency_code !== expense.company_currency && (
                        <p className="text-xs text-gray-500">
                          ≈ {expense.company_currency} {parseFloat(expense.converted_amount).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="font-medium text-gray-900">
                        {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Category</p>
                      <p className="font-medium text-gray-900">
                        {expense.category_name || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {expense.merchant_name && (
                    <div className="mt-3 text-sm">
                      <span className="text-gray-500">Merchant: </span>
                      <span className="text-gray-900">{expense.merchant_name}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  <button
                    onClick={() => openApprovalModal(expense, 'view')}
                    className="btn btn-secondary text-sm flex items-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => openApprovalModal(expense, 'approve')}
                    className="btn btn-success text-sm flex items-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => openApprovalModal(expense, 'reject')}
                    className="btn btn-danger text-sm flex items-center space-x-2"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expense Details Modal */}
      {showModal && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Expense Details</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Employee
                  </label>
                  <p className="text-gray-900 font-medium">
                    {selectedExpense.employee_first_name} {selectedExpense.employee_last_name}
                  </p>
                  <p className="text-sm text-gray-500">{selectedExpense.employee_email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Amount
                  </label>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedExpense.currency_code} {parseFloat(selectedExpense.amount).toFixed(2)}
                  </p>
                  {selectedExpense.converted_amount && selectedExpense.currency_code !== selectedExpense.company_currency && (
                    <p className="text-sm text-gray-500">
                      Converted: {selectedExpense.company_currency} {parseFloat(selectedExpense.converted_amount).toFixed(2)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Expense Date
                  </label>
                  <p className="text-gray-900">
                    {format(new Date(selectedExpense.expense_date), 'MMMM dd, yyyy')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Category
                  </label>
                  <p className="text-gray-900">{selectedExpense.category_name || 'N/A'}</p>
                </div>

                {selectedExpense.merchant_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Merchant
                    </label>
                    <p className="text-gray-900">{selectedExpense.merchant_name}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Status
                  </label>
                  <span className={`badge ${selectedExpense.status === 'pending' ? 'badge-pending' : 'badge-in-review'}`}>
                    {selectedExpense.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Description
                </label>
                <p className="text-gray-900">{selectedExpense.description}</p>
              </div>

              {selectedExpense.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Notes
                  </label>
                  <p className="text-gray-900">{selectedExpense.notes}</p>
                </div>
              )}

              {/* Line Items */}
              {selectedExpense.lineItems && selectedExpense.lineItems.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Line Items
                  </label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Description</th>
                          <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">Qty</th>
                          <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedExpense.lineItems.map((item, index) => (
                          <tr key={item.id} className="border-t border-gray-200">
                            <td className="py-2 px-4 text-sm text-gray-900">{item.description}</td>
                            <td className="py-2 px-4 text-sm text-gray-900 text-right">{item.quantity}</td>
                            <td className="py-2 px-4 text-sm text-gray-900 text-right font-medium">
                              {parseFloat(item.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Approval History */}
              {selectedExpense.approvalHistory && selectedExpense.approvalHistory.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Approval History
                  </label>
                  <div className="space-y-3">
                    {selectedExpense.approvalHistory.map((history) => (
                      <div key={history.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          history.action === 'approved' ? 'bg-green-100' :
                          history.action === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'
                        }`}>
                          {history.action === 'approved' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : history.action === 'rejected' ? (
                            <XCircle className="w-4 h-4 text-red-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {history.first_name} {history.last_name}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">{history.action}</p>
                          {history.comments && (
                            <p className="text-sm text-gray-700 mt-1">{history.comments}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {format(new Date(history.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Receipt */}
              {selectedExpense.receipt_path && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Receipt
                  </label>
                  <a
                    href={`http://localhost:5000/${selectedExpense.receipt_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    View Receipt
                  </a>
                </div>
              )}

              {/* Action Section */}
              {actionType !== 'view' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comments {actionType === 'reject' && <span className="text-red-600">*</span>}
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="input"
                    rows="3"
                    placeholder="Add your comments here..."
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setComments('');
                  setActionType('');
                }}
                className="btn btn-secondary"
              >
                Close
              </button>
              {actionType === 'approve' && (
                <button onClick={handleApprove} className="btn btn-success">
                  Approve Expense
                </button>
              )}
              {actionType === 'reject' && (
                <button onClick={handleReject} className="btn btn-danger">
                  Reject Expense
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;
