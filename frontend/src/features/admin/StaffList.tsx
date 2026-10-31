import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { User, Role } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { UserPlus, Shield, CheckCircle, Mail, AlertCircle, Users } from 'lucide-react';

export const StaffList: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'staff' | 'roles'>('staff');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_id: 2, // Default to Staff Admin or Sales
  });

  const { data: users = [], isLoading: isUsersLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/api/v1/users'),
  });

  const { data: roles = [], isLoading: isRolesLoading } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => api.get<Role[]>('/api/v1/users/roles'),
  });

  const staffMembers = (Array.isArray(users) ? users : []).filter((u) => !u.customer_id);

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/api/v1/users/staff', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsAddOpen(false);
      setFormData({ name: '', email: '', password: '', role_id: roles[0]?.id || 2 });
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to create staff member.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff & Access Control</h1>
          <p className="text-sm text-gray-500">Manage internal teammates, administrative roles, and permission levels</p>
        </div>
        <button
          onClick={() => {
            setErrorMsg('');
            if (roles.length > 0 && !formData.role_id) {
              setFormData((prev) => ({ ...prev, role_id: roles[0].id }));
            }
            setIsAddOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Staff Member
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('staff')}
          className={`py-2 px-4 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === 'staff'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Internal Staff ({staffMembers.length})
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`py-2 px-4 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === 'roles'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          Configured Roles ({roles.length})
        </button>
      </div>

      {activeTab === 'staff' ? (
        isUsersLoading ? (
          <div className="p-12 text-center text-gray-500">Loading staff members...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Member</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Assigned Roles</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Permissions Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {staffMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{member.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {member.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {member.roles.map((r) => (
                          <span
                            key={r.id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            {r.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={member.status === 'active' ? 'success' : 'default'}>
                        {member.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      {member.permissions?.length || 0} permissions active
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Roles Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div key={role.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  {role.name}
                </span>
                <Badge variant={role.is_system_role ? 'info' : 'default'}>
                  {role.is_system_role ? 'System' : 'Custom'}
                </Badge>
              </div>
              <p className="text-xs text-gray-500">{role.description || 'Standard role'}</p>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-mono">
                Code: {role.code}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Staff Account">
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              required
              placeholder="Min 8 chars, uppercase, lowercase, digit, symbol"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Assigned Role</label>
            <select
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: parseInt(e.target.value) })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating Account...' : 'Create Staff User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

