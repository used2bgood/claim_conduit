
import React, { useState, useEffect, useCallback } from "react";
import { InspectionRequest } from "@/api/entities";
import { StatusOption } from "@/api/entities"; // New import
import { User } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, TrendingUp, CheckCircle, AlertTriangle, Phone, MapPin } from "lucide-react";
// Removed: import { statusColors, statusDisplayNames } from "../components/statusUtils";

const statusIcons = {
  'submitted': Clock,
  'in-progress': TrendingUp,
  'completed': CheckCircle,
  'needs revision': AlertTriangle
};

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]); // New state for dynamic status options
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);

  // Memoized map for quick color lookup
  const statusColorMap = React.useMemo(() => {
    return statusOptions.reduce((acc, option) => {
      // Assuming color_bg and color_text are Tailwind classes, e.g., "bg-green-100", "text-green-800"
      acc[option.label] = `${option.color_bg} ${option.color_text}`;
      return acc;
    }, {});
  }, [statusOptions]);

  const applyFilters = useCallback(() => {
    if (statusFilter === "all") {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter(req => req.status === statusFilter));
    }
  }, [requests, statusFilter]);

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const [data, user, statuses] = await Promise.all([ // Added statuses to Promise.all
        InspectionRequest.list("-created_date"),
        User.me(),
        StatusOption.filter({ type: 'inspection' }) // Fetch dynamic status options
      ]);
      
      setCurrentUser(user);
      setStatusOptions(statuses); // Set dynamic status options

      let relevantRequests = data;
      // If user is not an admin, filter requests by creation email
      if (user.role !== 'admin' && !user.is_manager) {
        relevantRequests = data.filter(request => request.created_by === user.email);
      }
      
      setRequests(relevantRequests);
    } catch (error) {
      console.error("Error loading requests:", error);
    }
    setIsLoading(false);
  };

  const updateRequestStatus = async (requestId, newStatus) => {
    try {
      await InspectionRequest.update(requestId, { status: newStatus });
      loadRequests(); // Reload requests to reflect the status change and reapply permissions/filters
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Inspection Requests</h1>
            <p className="text-gray-600 mt-1">Manage and track all property inspection requests</p>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((option) => ( // Dynamically render filter options
                <SelectItem key={option.id} value={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-500">Try changing the status filter to see other requests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const StatusIcon = statusIcons[request.status];
              return (
                <Card key={request.id} className="bg-white shadow-sm border-0 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <StatusIcon className="w-6 h-6 text-gray-600" />
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{request.client_name}</h3>
                            <div className="flex items-center gap-1 text-gray-600 mt-1">
                              <MapPin className="w-4 h-4" />
                              <span className="text-sm">{request.property_address}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>{request.client_contact_number}</span>
                            </div>
                          </div>

                          {request.memo && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm text-gray-700">{request.memo}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <Badge className={`${statusColorMap[request.status] || 'bg-gray-200 text-gray-800'}`}>
                          {request.status || 'Unknown'} {/* Display the status label directly */}
                        </Badge>

                        <Select
                          value={request.status}
                          onValueChange={(newStatus) => updateRequestStatus(request.id, newStatus)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((option) => ( // Dynamically render status update options
                              <SelectItem key={option.id} value={option.label}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
