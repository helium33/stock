import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import DataTable from '../../components/tables/DataTable';
import { Staff, ActivityLog } from '../../lib/utils';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { LogOut, History, UserCog, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import FormModal from '../../components/modals/FormModal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

const StaffPage: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [loginTimes, setLoginTimes] = useState<Record<string, { lastLogin?: Date; lastLogout?: Date }>>({});
  const [dateFilter, setDateFilter] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    fetchStaffAndLogs();
  }, [dateFilter, selectedDate, selectedMonth]);

  const fetchStaffAndLogs = async () => {
    try {
      setLoading(true);
      
      // Fetch staff
      const staffQuery = query(
        collection(db, 'staff'),
        orderBy('name')
      );
      const staffSnapshot = await getDocs(staffQuery);
      const staffData = staffSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Staff));
      setStaff(staffData);

      // Fetch activity logs with date filtering
      let startDate: Date;
      let endDate: Date;

      if (dateFilter === 'daily') {
        startDate = startOfDay(new Date(selectedDate));
        endDate = endOfDay(new Date(selectedDate));
      } else {
        const [year, month] = selectedMonth.split('-');
        startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
        endDate = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      }

      const logsQuery = query(
        collection(db, 'activityLogs'),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate),
        orderBy('timestamp', 'desc')
      );

      const logsSnapshot = await getDocs(logsQuery);
      const logsData = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      } as ActivityLog));
      setActivityLogs(logsData);

      // Process login/logout times
      const times: Record<string, { lastLogin?: Date; lastLogout?: Date }> = {};
      logsData.forEach(log => {
        const staffId = log.staffId;
        if (!times[staffId]) {
          times[staffId] = {};
        }
        if (log.action === 'Login' && (!times[staffId].lastLogin || log.timestamp > times[staffId].lastLogin!)) {
          times[staffId].lastLogin = log.timestamp;
        }
        if (log.action === 'Logout' && (!times[staffId].lastLogout || log.timestamp > times[staffId].lastLogout!)) {
          times[staffId].lastLogout = log.timestamp;
        }
      });
      setLoginTimes(times);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLogs = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setShowLogs(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };

  const staffColumns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'role', header: 'Role' },
    { key: 'phone', header: 'Phone' },
    { key: 'store', header: 'Store', render: (row: Staff) => row.store.toUpperCase() },
    { 
      key: 'lastLogin', 
      header: 'Last Login',
      render: (row: Staff) => loginTimes[row.id]?.lastLogin 
        ? format(loginTimes[row.id].lastLogin!, 'PPp')
        : '-'
    },
    { 
      key: 'lastLogout', 
      header: 'Last Logout',
      render: (row: Staff) => loginTimes[row.id]?.lastLogout
        ? format(loginTimes[row.id].lastLogout!, 'PPp')
        : '-'
    },
    { 
      key: 'active', 
      header: 'Status', 
      render: (row: Staff) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          row.active 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {row.active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Staff) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleViewLogs(row)}
            className="flex items-center gap-1"
          >
            <History size={16} />
            View Logs
          </Button>
          {row.id === user?.uid && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="flex items-center gap-1"
            >
              <LogOut size={16} />
              Logout
            </Button>
          )}
        </div>
      ),
    },
  ];

  const logColumns = [
    { 
      key: 'timestamp', 
      header: 'Time',
      sortable: true,
      render: (row: ActivityLog) => format(row.timestamp, 'PPp'),
    },
    { key: 'action', header: 'Action' },
    { key: 'details', header: 'Details' },
    { key: 'note', header: 'Notes' },
  ];

  const filteredLogs = activityLogs.filter(
    log => !selectedStaff || log.staffId === selectedStaff?.id
  );

  if (!isAdmin) {
    return (
      <div className="p-4">
        <Header title="Staff Management" />
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <p className="text-yellow-800 dark:text-yellow-200">
            Only administrators can access staff management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <Header title="Staff Management" />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <UserCog size={24} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Staff Members
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <Select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              options={[
                { value: 'daily', label: 'Daily View' },
                { value: 'monthly', label: 'Monthly View' },
              ]}
            />

            {dateFilter === 'daily' ? (
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            ) : (
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            )}

            <div className="flex items-center gap-2">
              <Clock size={20} className="text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Last Updated: {format(new Date(), 'PPp')}
              </span>
            </div>
          </div>
        </div>
        
        <DataTable 
          data={staff} 
          columns={staffColumns} 
          filterKey="name"
          itemsPerPage={10}
        />
      </div>
      
      <FormModal
        isOpen={showLogs}
        onClose={() => setShowLogs(false)}
        title={`Activity Log - ${selectedStaff?.name}`}
      >
        <DataTable 
          data={filteredLogs} 
          columns={logColumns} 
          itemsPerPage={10}
        />
      </FormModal>
    </div>
  );
};

export default StaffPage;