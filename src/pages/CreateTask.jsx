
import React, { useState, useEffect, useCallback } from "react";
import { Task } from "@/api/entities";
import { User } from "@/api/entities";
import { InspectionRequest } from "@/api/entities"; // Import InspectionRequest entity
import { StatusOption } from "@/api/entities"; // Import StatusOption entity
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, CheckSquare, User as UserIcon, Building2 } from "lucide-react";

export default function CreateTask() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]); // State to store clients, now derived from InspectionRequests
  const [statusOptions, setStatusOptions] = useState([]); // State to store status options
  const [isClientContext, setIsClientContext] = useState(false);

  const [formData, setFormData] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const clientParam = urlParams.get('client');
    const requestId = urlParams.get('requestId');
    return {
      description: "",
      status: "", // Will be set to first available status
      request_type: "Other",
      assigned_to: "",
      client_name: clientParam ? decodeURIComponent(clientParam) : "",
      related_request_id: requestId || ""
    };
  });

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleClientChange = useCallback((selectedClientName) => {
    handleInputChange('client_name', selectedClientName);
    const selectedClient = clients.find(c => c.name === selectedClientName);
    if (selectedClient) {
      handleInputChange('related_request_id', selectedClient.latestRequestId || ''); // Use empty string if latestRequestId is null/undefined
    } else {
      handleInputChange('related_request_id', ''); // Clear related request ID if no client or client not found
    }
  }, [clients, handleInputChange]);

  const loadData = useCallback(async () => {
    try {
      const [currentUser, userList, allRequests, taskStatuses] = await Promise.all([
        User.me(),
        User.list(),
        InspectionRequest.list("-created_date", 500), // Increased limit to fetch more clients
        StatusOption.filter({ type: 'task' }) // Fetch task status options
      ]);
      
      setUsers(userList);
      setStatusOptions(taskStatuses);
      
      // Set default status to first available option if not already set
      if (taskStatuses.length > 0 && !formData.status) {
        setFormData(prev => ({ ...prev, status: taskStatuses[0].label }));
      }
      
      // Filter requests based on user role to determine accessible clients
      let relevantRequests = allRequests;
      if (currentUser.role !== 'admin' && !currentUser.is_manager) {
        relevantRequests = allRequests.filter(request => request.created_by === currentUser.email);
      }
      
      const clientMap = {};
      relevantRequests.forEach(request => {
        const key = request.client_name;
        if (key && !clientMap[key]) { // Ensure unique client names and a valid client_name
          clientMap[key] = {
            name: request.client_name,
            latestRequestId: request.id, // Store the ID of the latest request for this client
            latestRequest: request // Store the full request object if needed later
          };
        }
      });
      
      setClients(Object.values(clientMap));
      
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('client')) {
        setIsClientContext(true);
      }

    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, [formData.status]); // Depend on formData.status to ensure default is set only once

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const clientDisplayName = formData.client_name || "General"; 
      const taskTitle = `${formData.request_type} Request for ${clientDisplayName}`;
      
      const taskData = {
        title: taskTitle,
        description: formData.description,
        status: formData.status,
        request_type: formData.request_type,
        assigned_to: formData.assigned_to,
        related_request_id: formData.related_request_id,
      };
      
      await Task.create(taskData);
      
      // Update the related inspection request to mark it as recently updated
      if (formData.related_request_id) {
        try {
          // Get the current request and update it to bump the updated_date
          const currentRequest = await InspectionRequest.get(formData.related_request_id);
          await InspectionRequest.update(formData.related_request_id, {
            ...currentRequest,
            // The updated_date will be automatically set by the system
          });
        } catch (error) {
          console.error("Error updating related inspection request:", error);
          // Don't fail the task creation if this update fails
        }
      }
      
      navigate(createPageUrl("Tasks"));
    } catch (error) {
      console.error("Error creating task:", error);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("Tasks"))}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {formData.client_name ? `New Task for ${formData.client_name}` : "New Task"}
            </h1>
            <p className="text-gray-600 mt-1">Create a task and assign it to a team member</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isClientContext && (
            <Card className="bg-white shadow-sm border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Select value={formData.client_name} onValueChange={handleClientChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client *" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.name} value={client.name}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">You must select a client for this task.</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the task in detail..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="request_type">Request Type</Label>
                  <Select value={formData.request_type} onValueChange={(value) => handleInputChange('request_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Photos">Photos</SelectItem>
                      <SelectItem value="Documents">Documents</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
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

          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <UserIcon className="w-5 h-5 text-blue-600" />
                Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assign To</Label>
                  <Select value={formData.assigned_to} onValueChange={(value) => handleInputChange('assigned_to', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Unassigned</SelectItem> {/* Use empty string for unassigned */}
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.email}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("Tasks"))}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (!isClientContext && !formData.client_name)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
