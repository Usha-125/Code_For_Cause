import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, GitBranch, Users as UsersIcon } from 'lucide-react';

const ApprovalRules = () => {
  const [rules, setRules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    ruleType: 'percentage',
    percentageThreshold: '',
    requiresManagerApproval: true,
    approvers: [],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rulesRes, usersRes] = await Promise.all([
        api.get('/approval-rules'),
        api.get('/users/managers'),
      ]);
      setRules(rulesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (selectedRule) {
        await api.put(`/approval-rules/${selectedRule.id}`, formData);
        toast.success('Approval rule updated successfully');
      } else {
        await api.post('/approval-rules', formData);
        toast.success('Approval rule created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save approval rule');
    }
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this approval rule?')) return;

    try {
      await api.delete(`/approval-rules/${ruleId}`);
      toast.success('Approval rule deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete approval rule');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      ruleType: 'percentage',
      percentageThreshold: '',
      requiresManagerApproval: true,
      approvers: [],
    });
    setSelectedRule(null);
  };

  const openEditModal = (rule) => {
    setSelectedRule(rule);
    setFormData({
      name: rule.name,
      ruleType: rule.rule_type,
      percentageThreshold: rule.percentage_threshold || '',
      requiresManagerApproval: rule.requires_manager_approval,
      approvers: rule.approvers || [],
    });
    setShowModal(true);
  };

  const addApprover = () => {
    setFormData({
      ...formData,
      approvers: [
        ...formData.approvers,
        { userId: '', sequenceOrder: formData.approvers.length + 1, isAutoApprove: false }
      ]
    });
  };

  const removeApprover = (index) => {
    const newApprovers = formData.approvers.filter((_, i) => i !== index);
    // Reorder sequence
    newApprovers.forEach((approver, i) => {
      approver.sequenceOrder = i + 1;
    });
    setFormData({ ...formData, approvers: newApprovers });
  };

  const updateApprover = (index, field, value) => {
    const newApprovers = [...formData.approvers];
    newApprovers[index][field] = value;
    setFormData({ ...formData, approvers: newApprovers });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Approval Rules</h1>
          <p className="text-gray-600 mt-1">Configure expense approval workflows</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Create Rule</span>
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="card text-center py-12">
          <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No approval rules configured</p>
          <p className="text-sm text-gray-500 mt-1">Create your first approval rule to get started</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {rules.map((rule) => (
            <div key={rule.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <GitBranch className="w-6 h-6 text-primary-600" />
                    <h3 className="text-xl font-semibold text-gray-900">{rule.name}</h3>
                    <span className={`badge ${
                      rule.rule_type === 'percentage' ? 'bg-blue-100 text-blue-800' :
                      rule.rule_type === 'specific' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {rule.rule_type}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    {rule.requires_manager_approval && (
                      <div className="flex items-center text-gray-600">
                        <span className="font-medium mr-2">✓</span>
                        Manager approval required
                      </div>
                    )}

                    {(rule.rule_type === 'percentage' || rule.rule_type === 'hybrid') && (
                      <div className="flex items-center text-gray-600">
                        <span className="font-medium mr-2">📊</span>
                        {rule.percentage_threshold}% approval threshold
                      </div>
                    )}

                    {rule.approvers && rule.approvers.length > 0 && (
                      <div className="mt-3">
                        <p className="font-medium text-gray-700 mb-2">Approvers:</p>
                        <div className="space-y-1">
                          {rule.approvers.map((approver, index) => (
                            <div key={approver.id} className="flex items-center text-gray-600 pl-4">
                              <span className="text-primary-600 font-medium mr-2">
                                Step {approver.sequenceOrder}:
                              </span>
                              {approver.firstName} {approver.lastName}
                              {approver.isAutoApprove && (
                                <span className="ml-2 badge bg-yellow-100 text-yellow-800">
                                  Auto-approve
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => openEditModal(rule)}
                    className="text-primary-600 hover:text-primary-700"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="text-red-600 hover:text-red-700"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedRule ? 'Edit Approval Rule' : 'Create Approval Rule'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Standard Approval Flow"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rule Type *
                </label>
                <select
                  value={formData.ruleType}
                  onChange={(e) => setFormData({ ...formData, ruleType: e.target.value })}
                  className="input"
                  required
                >
                  <option value="percentage">Percentage Based</option>
                  <option value="specific">Specific Approvers</option>
                  <option value="hybrid">Hybrid (Percentage + Specific)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.ruleType === 'percentage' && 'Requires a certain percentage of approvers to approve'}
                  {formData.ruleType === 'specific' && 'Requires approval from specific approvers in sequence'}
                  {formData.ruleType === 'hybrid' && 'Combines percentage threshold with specific approvers'}
                </p>
              </div>

              {(formData.ruleType === 'percentage' || formData.ruleType === 'hybrid') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approval Percentage Threshold *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.percentageThreshold}
                    onChange={(e) => setFormData({ ...formData, percentageThreshold: e.target.value })}
                    className="input"
                    placeholder="e.g., 60"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Percentage of approvers required to approve the expense
                  </p>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requiresManager"
                  checked={formData.requiresManagerApproval}
                  onChange={(e) => setFormData({ ...formData, requiresManagerApproval: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="requiresManager" className="ml-2 text-sm text-gray-700">
                  Require manager approval first
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Approvers (Sequential)
                  </label>
                  <button
                    type="button"
                    onClick={addApprover}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    + Add Approver
                  </button>
                </div>

                {formData.approvers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                    No approvers added yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {formData.approvers.map((approver, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700 w-16">
                          Step {approver.sequenceOrder}
                        </span>
                        <select
                          value={approver.userId}
                          onChange={(e) => updateApprover(index, 'userId', e.target.value)}
                          className="input flex-1"
                          required
                        >
                          <option value="">Select User</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.first_name} {user.last_name}
                            </option>
                          ))}
                        </select>
                        <label className="flex items-center text-sm text-gray-700 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={approver.isAutoApprove}
                            onChange={(e) => updateApprover(index, 'isAutoApprove', e.target.checked)}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mr-2"
                          />
                          Auto-approve
                        </label>
                        <button
                          type="button"
                          onClick={() => removeApprover(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">How it works:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {formData.requiresManagerApproval && (
                    <li>• Manager approves first (if assigned)</li>
                  )}
                  {formData.approvers.length > 0 && (
                    <li>• Then moves through approvers in sequence</li>
                  )}
                  {(formData.ruleType === 'percentage' || formData.ruleType === 'hybrid') && formData.percentageThreshold && (
                    <li>• Or approved when {formData.percentageThreshold}% threshold is met</li>
                  )}
                  {formData.approvers.some(a => a.isAutoApprove) && (
                    <li>• Auto-approve users can approve immediately</li>
                  )}
                </ul>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {selectedRule ? 'Update' : 'Create'} Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalRules;
