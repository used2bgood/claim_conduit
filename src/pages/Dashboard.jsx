
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { InspectionRequest } from "@/api/entities";
import { StatusOption } from "@/api/entities";
import { User } from "@/api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  FileText,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'updated_date', direction: 'desc' });
  const [statusOptions, setStatusOptions] = useState([]);
  const [error, setError] = useState(null);

  // Modified to use option.label as key since that's what's stored in request.status
  const statusColorMap = useMemo(() => {
    return statusOptions.reduce((acc, option) => {
      acc[option.label] = `${option.color_bg} ${option.color_text}`;
      return acc;
    }, {});
  }, [statusOptions]);

  // Status labels map is not needed since request.status already contains the display label
  const userNameMap = useMemo(() => {
    return allUsers.reduce((acc, user) => {
      acc[user.email] = user.full_name;
      return acc;
    }, {});
  }, [allUsers]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await User.me();
      setCurrentUser(user);

      let userList = [];
      if (user.role === 'admin' || user.is_manager) {
        try {
          userList = await User.list();
        } catch (e) {
            console.error("Admin/Manager failed to load user list:", e);
            // Instead of setting a general error, just log it and continue with limited user list
            userList = [user]; // Fallback to just the current user
        }
      } else {
        // For non-admins, the user list is just themselves
        userList = [user];
      }

      const [data, statuses] = await Promise.all([
        InspectionRequest.list("-updated_date", 100),
        StatusOption.filter({ type: 'inspection' })
      ]);

      setRequests(data);
      setStatusOptions(statuses);
      setAllUsers(userList);

    } catch (error) {
      console.error("General error in loadData:", error);
      if (error?.message?.includes("401") || error?.message?.includes("Unauthorized")) {
         await User.login(); // This should handle redirection to login page
      } else {
        setError("Failed to load dashboard data. Please try refreshing the page.");
      }
    }
    
    setIsLoading(false);
  };

  const displayRequests = useMemo(() => {
    let filtered = [];
    if (currentUser) {
      if (currentUser.role === 'admin' || currentUser.is_manager) {
        filtered = [...requests];
      } else {
        filtered = requests.filter(req => req.created_by === currentUser.email);
      }
    }

    return filtered.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      if (sortConfig.key === 'updated_date' || sortConfig.key === 'created_date') {
        const dateA = new Date(aValue).getTime() || 0;
        const dateB = new Date(bValue).getTime() || 0;
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [requests, currentUser, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const statusCounts = useMemo(() => {
    // Initialize counts for each available status from statusOptions
    const counts = {};
    statusOptions.forEach(option => {
      counts[option.label] = 0;
    });
    
    displayRequests.forEach(r => {
      // Increment count only if the request status matches a known status option label
      if (r.status && counts.hasOwnProperty(r.status)) {
        counts[r.status]++;
      }
    });
    
    return counts;
  }, [displayRequests, statusOptions]);

  if (error && !isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold text-lg mb-2">Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <Button 
            onClick={loadData} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inspection Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your property inspection requests</p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl("CreateRequest")}>
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg">
                <Plus className="w-5 h-5 mr-2" />
                New Profile
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statusOptions.slice(0, 4).map((statusOption, index) => {
            // Assign icons, colors, and descriptions based on index for the first 4 statuses
            // This assumes a relatively consistent order for the primary statuses (e.g., initial, in-progress, complete, needs revision)
            const icons = [Clock, TrendingUp, CheckCircle, AlertTriangle];
            const IconComponent = icons[index] || Clock; // Default to Clock if index out of bounds
            
            // Note: If statusOption.color_text/color_bg can be used directly,
            // these colors might be redundant or overrideable.
            const colors = ['text-blue-600', 'text-yellow-600', 'text-green-600', 'text-red-600'];
            
            // Hardcoded descriptions for the first 4 cards, adjust as needed or fetch from statusOption if available
            const descriptions = [
              'Awaiting assignment', 
              'Being inspected', 
              'Finished inspections', 
              'Require attention'
            ];
            
            return (
              <Card key={statusOption.id} className="bg-white shadow-sm border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {statusOption.label}
                  </CardTitle>
                  <IconComponent className={`w-5 h-5 ${colors[index]}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {statusCounts[statusOption.label] || 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{descriptions[index]}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mt-8">
          <div className="lg:col-span-1">
            <Card className="bg-white shadow-sm border-0 h-full">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading requests...</p>
                  </div>
                ) : displayRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
                    <p className="text-gray-500 mb-4">Get started by creating your first inspection request</p>
                    <Link to={createPageUrl("CreateRequest")}>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                          <Plus className="w-4 h-4 mr-2" />
                          New Profile
                        </Button>
                      </Link>
                    </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer whitespace-nowrap" onClick={() => requestSort('client_name')}>
                            <div className="flex items-center">Client Name {getSortIndicator('client_name')}</div>
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer whitespace-nowrap" onClick={() => requestSort('property_address')}>
                            <div className="flex items-center">Address {getSortIndicator('property_address')}</div>
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer whitespace-nowrap" onClick={() => requestSort('created_by')}>
                            <div className="flex items-center">Submitted By {getSortIndicator('created_by')}</div>
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer whitespace-nowrap" onClick={() => requestSort('status')}>
                            <div className="flex items-center">Status {getSortIndicator('status')}</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayRequests.slice(0, 10).map((request) => (
                          <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4">
                              <div>
                                <Link 
                                  to={createPageUrl(`ClientProfile?client=${encodeURIComponent(request.client_name)}`)}
                                  className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {request.client_name}
                                </Link>
                                <p className="text-xs text-gray-500 mt-1">{request.client_contact_number}</p>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <p className="text-sm text-gray-600 max-w-xs">{request.property_address}</p>
                            </td>
                            <td className="py-4 px-4">
                              <p className="text-sm text-gray-600">{userNameMap[request.created_by] || request.created_by}</p>
                            </td>
                            <td className="py-4 px-4">
                              <Badge className={`${statusColorMap[request.status] || 'bg-gray-200 text-gray-800'}`}>
                                {request.status || 'Unknown'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
