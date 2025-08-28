import React, { useState, useEffect, useCallback, useMemo } from "react";
import { InspectionRequest } from "@/api/entities";
import { ClientDocument } from "@/api/entities";
import { Task } from "@/api/entities";
import { User } from "@/api/entities";
import { Note } from "@/api/entities";
import { ArchivedProfile } from "@/api/entities";
import { StatusOption } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Upload,
  FileText,
  Filter,
  ExternalLink,
  Phone,
  MapPin,
  Calendar,
  User as UserIcon,
  ArrowUp,
  ArrowDown,
  ShieldOff,
  Hash,
  Shield,
  Edit,
  Save,
  Plus,
  CheckSquare,
  Clock,
  TrendingUp,
  CheckCircle,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

export default function ClientProfile() {
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [requests, setRequests] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [taskStatusOptions, setTaskStatusOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [documentsToUpload, setDocumentsToUpload] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'created_date', direction: 'desc' });
  const [filterBy, setFilterBy] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editableInfo, setEditableInfo] = useState({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const inspectionStatusColorMap = useMemo(() => {
    return statusOptions.reduce((acc, option) => {
      acc[option.value] = option.color_class;
      return acc;
    }, {});
  }, [statusOptions]);

  const taskStatusColorMap = useMemo(() => {
    return taskStatusOptions.reduce((acc, option) => {
      acc[option.value] = option.color_class;
      return acc;
    }, {});
  }, [taskStatusOptions]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const clientName = decodeURIComponent(urlParams.get('client') || '');

      if (!clientName) {
        navigate(createPageUrl("Clients"));
        return;
      }
      setClient(clientName);

      const user = await User.me();
      setCurrentUser(user);

      const [requestsData, inspectionStatuses, taskStatuses] = await Promise.all([
        InspectionRequest.filter({ client_name: clientName }),
        StatusOption.filter({ type: 'inspection' }),
        StatusOption.filter({ type: 'task' })
      ]);

      setRequests(requestsData);
      setStatusOptions(inspectionStatuses);
      setTaskStatusOptions(taskStatuses);

      const userHasAccess = user.role === 'admin' || requestsData.some(r => r.created_by === user.email);
      setHasPermission(userHasAccess);

      if (userHasAccess && requestsData.length > 0) {
        const requestIds = requestsData.map(req => req.id);

        const [allDocs, allTasks] = await Promise.all([
          ClientDocument.filter({ inspection_request_id: { $in: requestIds } }, "-created_date"),
          Task.filter({ related_request_id: { $in: requestIds } }, "-created_date")
        ]);
        setDocuments(allDocs);
        setTasks(allTasks);
      } else {
        setRequests([]);
        setDocuments([]);
        setTasks([]);
      }
    } catch (error) {
      console.error("Error loading client data:", error);
      setHasPermission(false);
      setClient(null);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const filterAndSortDocuments = useCallback(() => {
    let filtered = [...documents];

    if (filterBy !== "all") {
      filtered = filtered.filter(doc => {
        if (filterBy === "pdf") return doc.file_type?.toLowerCase() === "pdf";
        if (filterBy === "doc") return ["doc", "docx"].includes(doc.file_type?.toLowerCase());
        if (filterBy === "image") return ["jpg", "jpeg", "png", "gif"].includes(doc.file_type?.toLowerCase());
        return doc.document_category === filterBy;
      });
    }

    if (sortConfig.key !== null) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }

        if (sortConfig.key === 'created_date') {
          const dateA = new Date(aValue);
          const dateB = new Date(bValue);
          return sortConfig.direction === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        }

        if (sortConfig.key === 'file_size') {
            aValue = aValue || 0;
            bValue = bValue || 0;
            return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredDocuments(filtered);
  }, [documents, sortConfig, filterBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    filterAndSortDocuments();
  }, [filterAndSortDocuments]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleMultipleFileSelection(files);
    }
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleMultipleFileSelection(files);
    }
  };

  const handleMultipleFileSelection = (files) => {
    const fileData = files.map(file => ({
      file,
      documentName: file.name.split('.').slice(0, -1).join('.'),
      documentCategory: "Other",
      id: Math.random().toString(36).substr(2, 9)
    }));

    setDocumentsToUpload(fileData);
    setShowUploadDialog(true);
  };

  const updateDocumentData = (id, field, value) => {
    setDocumentsToUpload(prev =>
      prev.map(doc =>
        doc.id === id ? { ...doc, [field]: value } : doc
      )
    );
  };

  const uploadDocuments = async () => {
    if (requests.length === 0 || documentsToUpload.length === 0) return;

    setIsUploading(true);
    try {
      for (const docData of documentsToUpload) {
        if (!docData.documentName.trim()) continue;

        const { file_url } = await UploadFile({ file: docData.file });
        const fileExtension = docData.file.name.split('.').pop()?.toLowerCase();

        await ClientDocument.create({
          inspection_request_id: requests[0].id,
          document_name: docData.documentName.trim(),
          original_filename: docData.file.name,
          file_url: file_url,
          document_category: docData.documentCategory,
          file_type: fileExtension,
          file_size: docData.file.size,
          created_by: currentUser?.email || "Unknown"
        });
      }

      setShowUploadDialog(false);
      setDocumentsToUpload([]);
      loadData();
    } catch (error) {
      console.error("Error uploading documents:", error);
    }
    setIsUploading(false);
  };

  const handleDeleteClient = async () => {
    if (!client || currentUser?.role !== 'admin') return;

    setIsDeleting(true);
    try {
        const clientName = client;

        const requestsToArchive = await InspectionRequest.filter({ client_name: clientName });
        const requestIds = requestsToArchive.map(r => r.id);

        const allDocuments = [];
        const allTasks = [];
        const allNotes = [];

        for (const requestId of requestIds) {
            const documents = await ClientDocument.filter({ inspection_request_id: requestId });
            allDocuments.push(...documents);

            const tasks = await Task.filter({ related_request_id: requestId });
            allTasks.push(...tasks);

            for (const task of tasks) {
                const notes = await Note.filter({ task_id: task.id });
                allNotes.push(...notes);
            }
        }

        await ArchivedProfile.create({
            client_name: clientName,
            archived_data: {
                requests: requestsToArchive,
                documents: allDocuments,
                tasks: allTasks,
                notes: allNotes
            },
            deleted_by: currentUser.email,
            original_created_date: requestsToArchive[0]?.created_date
        });

        for (const requestId of requestIds) {
            const documents = await ClientDocument.filter({ inspection_request_id: requestId });
            for (const doc of documents) {
                await ClientDocument.delete(doc.id);
            }

            const tasks = await Task.filter({ related_request_id: requestId });
            for (const task of tasks) {
                const notes = await Note.filter({ task_id: task.id });
                for (const note of notes) {
                    await Note.delete(note.id);
                }
                await Task.delete(task.id);
            }

            await InspectionRequest.delete(requestId);
        }

        setShowDeleteDialog(false);
        navigate(createPageUrl("Clients"));

    } catch (error) {
        console.error("Error archiving client profile:", error);
        alert("Error archiving profile. Please try again.");
    } finally {
        setIsDeleting(false);
    }
  };

  const handleEditInfo = () => {
    if (requests.length > 0) {
      setEditableInfo({
        ...requests[0]
      });
    }
    setIsEditingInfo(true);
  };

  const handleCancelEdit = () => {
    setIsEditingInfo(false);
    setEditableInfo({});
  };

  const handleInfoChange = (field, value) => {
    setEditableInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveInfo = async () => {
    if (requests.length === 0) return;

    const { id, created_date, updated_date, created_by, client_name, ...updateData } = editableInfo;

    setIsUploading(true);
    try {
      await InspectionRequest.update(requests[0].id, updateData);
      loadData();
      setIsEditingInfo(false);
    } catch (error) {
      console.error("Error updating client information:", error);
    }
    setIsUploading(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryColor = (category) => {
    const colors = {
      "Carrier Estimate": "bg-blue-100 text-blue-800",
      "Policy": "bg-green-100 text-green-800",
      "Contractor Estimate": "bg-orange-100 text-orange-800",
      "Other": "bg-gray-100 text-gray-800"
    };
    return colors[category] || colors["Other"];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading client profile...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <ShieldOff className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Permission Denied</h1>
          <p className="text-gray-500 mb-4">You do not have access to view this client's profile.</p>
          <Button onClick={() => navigate(createPageUrl("Clients"))}>
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  if (!client || requests.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Client Not Found or No Data</h1>
          <p className="text-gray-500 mb-4">The requested client profile could not be found or has no associated data.</p>
          <Button onClick={() => navigate(createPageUrl("Clients"))}>
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  const openTasks = tasks.filter(task => task.status !== 'Completed');
  const completedTasks = tasks.filter(task => task.status === 'Completed');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(createPageUrl("Clients"))}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-grow">
                <h1 className="text-3xl font-bold text-gray-900">{client}</h1>
                <p className="text-gray-600 mt-1">Client Profile & Document Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
                {requests[0]?.id && (
                    <Link to={createPageUrl(`CreateTask?client=${encodeURIComponent(client)}&requestId=${requests[0].id}`)}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Task
                    </Button>
                    </Link>
                )}
                {currentUser?.role === 'admin' && (
                    <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Profile
                    </Button>
                )}
            </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-white shadow-sm border-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-blue-600" />
                    Client Information
                  </div>
                  {!isEditingInfo && (
                    <Button variant="ghost" size="icon" onClick={handleEditInfo} className="text-gray-500 hover:text-blue-600">
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingInfo ? (
                  <>
                    <div>
                      <Label htmlFor="client_contact_number_edit">Contact Number</Label>
                      <Input
                        id="client_contact_number_edit"
                        value={editableInfo.client_contact_number || ''}
                        onChange={(e) => handleInfoChange('client_contact_number', e.target.value)}
                        placeholder="Contact number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="property_address_edit">Property Address</Label>
                      <Input
                        id="property_address_edit"
                        value={editableInfo.property_address || ''}
                        onChange={(e) => handleInfoChange('property_address', e.target.value)}
                        placeholder="Property address"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1">Contact Number</label>
                      <div className="flex items-center gap-2 text-gray-900">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {requests[0]?.client_contact_number || <span className="text-gray-500 italic">Not provided</span>}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1">Property Address</label>
                      <div className="flex items-start gap-2 text-gray-900">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{requests[0]?.property_address || <span className="text-gray-500 italic">Not provided</span>}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-0">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      Claim Information
                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  {isEditingInfo ? (
                      <>
                          <div>
                              <Label htmlFor="claim_number_edit">Claim Number</Label>
                              <Input id="claim_number_edit" value={editableInfo.claim_number || ''} onChange={(e) => handleInfoChange('claim_number', e.target.value)} placeholder="Claim number" />
                          </div>
                          <div>
                              <Label htmlFor="carrier_edit">Carrier</Label>
                              <Input id="carrier_edit" value={editableInfo.carrier || ''} onChange={(e) => handleInfoChange('carrier', e.target.value)} placeholder="Insurance carrier" />
                          </div>
                      </>
                  ) : (
                      <>
                          <div>
                              <label className="text-sm font-semibold text-gray-700 block mb-1">Claim Number</label>
                              <div className="flex items-center gap-2 text-gray-900">
                                  <Hash className="w-4 h-4 text-gray-400" />
                                  {requests[0]?.claim_number || <span className="text-gray-500 italic">Not provided</span>}
                              </div>
                          </div>
                          <div>
                              <label className="text-sm font-semibold text-gray-700 block mb-1">Carrier</label>
                              <div className="flex items-center gap-2 text-gray-900">
                                  <Shield className="w-4 h-4 text-gray-400" />
                                  {requests[0]?.carrier || <span className="text-gray-500 italic">Not provided</span>}
                              </div>
                          </div>
                      </>
                  )}
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-blue-600" />
                  Project Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditingInfo ? (
                  <div>
                    <Label htmlFor="companycam_url_edit">CompanyCam URL</Label>
                    <Input id="companycam_url_edit" value={editableInfo.companycam_url || ''} onChange={(e) => handleInfoChange('companycam_url', e.target.value)} placeholder="https://companycam.com/project/..." />
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">CompanyCam URL</label>
                    <div className="flex items-center gap-2 text-gray-900">
                      {requests[0]?.companycam_url ? (
                        <a href={requests[0].companycam_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate text-sm">
                          {requests[0].companycam_url}
                        </a>
                      ) : (
                        <span className="text-gray-500 italic text-sm">Not provided</span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {isEditingInfo && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                <Button onClick={handleSaveInfo} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white shadow-sm border-0">
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  <input
                    type="file"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    multiple
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-gray-400" />
                    <p className="text-gray-600">
                      Click to upload or drag and drop multiple files
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, DOC, DOCX, JPG, PNG up to 10MB each
                    </p>
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Open Tasks</CardTitle>
                  <CardDescription>
                    Track ongoing tasks for this client.
                  </CardDescription>
                </div>
                <Link to={createPageUrl(`CreateTask?client=${encodeURIComponent(client)}&requestId=${requests[0]?.id || ''}`)}>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    New Task
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {openTasks.length > 0 ? (
                  <div className="space-y-4">
                    {openTasks.map(task => (
                      <div key={task.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <Link to={createPageUrl(`TaskDetails?id=${task.id}`)}>
                              <h4 className="font-semibold text-gray-900 hover:text-blue-700">{task.title}</h4>
                            </Link>
                            {task.description && (
                              <p className="text-gray-600 text-sm mt-1 line-clamp-1">{task.description}</p>
                            )}
                            <div className="flex gap-4 text-xs text-gray-500 mt-2">
                              {task.assigned_to && <span>Assigned to: {task.assigned_to}</span>}
                              {task.due_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                             <Badge className={`${taskStatusColorMap[task.status] || 'bg-gray-100 text-gray-800'}`}>
                                {task.status || 'Unknown'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-6">
                    <p>No open tasks for this client.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {completedTasks.length > 0 && (
              <Card className="bg-white shadow-sm border-0">
                <CardHeader>
                  <CardTitle>Completed Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="completed-tasks">
                      <AccordionTrigger>
                        View {completedTasks.length} completed task(s)
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4">
                          {completedTasks.map(task => (
                            <div key={task.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <Link to={createPageUrl(`TaskDetails?id=${task.id}`)}>
                                    <h4 className="font-semibold text-gray-700 hover:text-blue-700 line-through">{task.title}</h4>
                                  </Link>
                                  {task.description && (
                                    <p className="text-gray-500 text-sm mt-1 line-clamp-1">{task.description}</p>
                                  )}
                                  <div className="flex gap-4 text-xs text-gray-400 mt-2">
                                    {task.assigned_to && <span>Assigned to: {task.assigned_to}</span>}
                                    {task.completed_date && (
                                      <div className="flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        <span>Completed: {format(new Date(task.completed_date), 'MMM d, yyyy')}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="ml-4">
                                   <Badge className={`${taskStatusColorMap[task.status] || 'bg-gray-100 text-gray-800'}`}>
                                      {task.status || 'Unknown'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            )}

            <Card className="bg-white shadow-sm border-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Documents ({filteredDocuments.length})</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <Select value={filterBy} onValueChange={setFilterBy}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Filter by type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="pdf">PDF Files</SelectItem>
                          <SelectItem value="doc">Word Documents</SelectItem>
                          <SelectItem value="image">Images</SelectItem>
                          <SelectItem value="Carrier Estimate">Carrier Estimates</SelectItem>
                          <SelectItem value="Policy">Policies</SelectItem>
                          <SelectItem value="Contractor Estimate">Contractor Estimates</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No documents found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => requestSort('document_name')}>
                            <div className="flex items-center">Name {getSortIndicator('document_name')}</div>
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => requestSort('document_category')}>
                            <div className="flex items-center">Category {getSortIndicator('document_category')}</div>
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => requestSort('file_type')}>
                            <div className="flex items-center">Type {getSortIndicator('file_type')}</div>
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => requestSort('file_size')}>
                            <div className="flex items-center">Size {getSortIndicator('file_size')}</div>
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => requestSort('created_by')}>
                            <div className="flex items-center">Uploaded By {getSortIndicator('created_by')}</div>
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => requestSort('created_date')}>
                            <div className="flex items-center">Upload Date {getSortIndicator('created_date')}</div>
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 bg-gray-50">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDocuments.map((doc) => (
                          <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <FileText className="w-6 h-6 text-blue-500 flex-shrink-0" />
                                <div>
                                  <div className="font-medium text-gray-900 truncate max-w-48" title={doc.document_name}>
                                    {doc.document_name}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate max-w-48" title={doc.original_filename}>
                                    {doc.original_filename}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <Badge className={`${getCategoryColor(doc.document_category)} text-xs`}>
                                {doc.document_category}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              <span className="font-mono uppercase bg-gray-100 px-2 py-1 rounded text-gray-700 font-semibold text-xs tracking-wider">
                                {doc.file_type || 'Unknown'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-600">
                              {formatFileSize(doc.file_size || 0)}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600 truncate max-w-32" title={doc.created_by || 'Unknown'}>
                                  {doc.created_by || 'Unknown'}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                  {format(new Date(doc.created_date), 'MMM d, yyyy')}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                                title="View document"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
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

        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Documents ({documentsToUpload.length} files)</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {documentsToUpload.map((docData, index) => (
                <div key={docData.id} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Document {index + 1}: {docData.file.name}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`document_name_${docData.id}`}>Document Name *</Label>
                      <Input
                        id={`document_name_${docData.id}`}
                        value={docData.documentName}
                        onChange={(e) => updateDocumentData(docData.id, 'documentName', e.target.value)}
                        placeholder="Enter document name"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor={`document_category_${docData.id}`}>Category</Label>
                      <Select
                        value={docData.documentCategory}
                        onValueChange={(value) => updateDocumentData(docData.id, 'documentCategory', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Other">Other</SelectItem>
                          <SelectItem value="Carrier Estimate">Carrier Estimate</SelectItem>
                          <SelectItem value="Policy">Policy</SelectItem>
                          <SelectItem value="Contractor Estimate">Contractor Estimate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mt-2">
                    <p><strong>Original file:</strong> {docData.file.name}</p>
                    <p><strong>Size:</strong> {formatFileSize(docData.file.size)}</p>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowUploadDialog(false);
                setDocumentsToUpload([]);
              }}>
                Cancel
              </Button>
              <Button
                onClick={uploadDocuments}
                disabled={isUploading || documentsToUpload.some(doc => !doc.documentName.trim())}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading {documentsToUpload.length} documents...
                  </>
                ) : (
                  `Upload ${documentsToUpload.length} Documents`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                        Confirm Profile Deletion
                    </DialogTitle>
                    <DialogDescription className="pt-4">
                        Are you sure you want to delete the profile for <strong>{client}</strong>?
                        This will move the profile to the archives where it can be restored by administrators if needed.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDeleteClient}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Yes, Delete Profile
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}