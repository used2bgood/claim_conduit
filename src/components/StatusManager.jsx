import React, { useState, useEffect } from 'react';
import { StatusOption } from '@/api/entities';
import { InspectionRequest } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tag, Plus, Edit, Trash2, RotateCcw, AlertTriangle } from "lucide-react";

const colorOptions = [
  { bg: 'bg-blue-100', text: 'text-blue-800', name: 'Blue' },
  { bg: 'bg-green-100', text: 'text-green-800', name: 'Green' },
  { bg: 'bg-yellow-100', text: 'text-yellow-800', name: 'Yellow' },
  { bg: 'bg-red-100', text: 'text-red-800', name: 'Red' },
  { bg: 'bg-purple-100', text: 'text-purple-800', name: 'Purple' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800', name: 'Indigo' },
  { bg: 'bg-pink-100', text: 'text-pink-800', name: 'Pink' },
  { bg: 'bg-orange-100', text: 'text-orange-800', name: 'Orange' },
  { bg: 'bg-gray-100', text: 'text-gray-800', name: 'Gray' },
];

export default function StatusManager() {
    const [statuses, setStatuses] = useState([]);
    const [statusUsage, setStatusUsage] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [showRenameDialog, setShowRenameDialog] = useState(false);
    const [editingStatus, setEditingStatus] = useState(null);
    const [renameData, setRenameData] = useState({ oldStatus: null, newLabel: '' });
    const [isUpdating, setIsUpdating] = useState(false);

    const loadStatuses = async () => {
        setIsLoading(true);
        try {
            const [inspectionStatuses, allRequests] = await Promise.all([
                StatusOption.filter({ type: 'inspection' }),
                InspectionRequest.list()
            ]);
            
            setStatuses(inspectionStatuses);
            
            // Calculate usage statistics
            const usage = {};
            inspectionStatuses.forEach(status => {
                usage[status.label] = allRequests.filter(req => req.status === status.label).length;
            });
            setStatusUsage(usage);
        } catch (error) {
            console.error("Error fetching statuses:", error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadStatuses();
    }, []);

    const handleAddNew = () => {
        setEditingStatus({
            label: "",
            type: "inspection",
            color_bg: "bg-blue-100",
            color_text: "text-blue-800"
        });
        setShowDialog(true);
    };

    const handleEdit = (status) => {
        setEditingStatus({ ...status });
        setShowDialog(true);
    };

    const handleRename = (status) => {
        setRenameData({ oldStatus: status, newLabel: status.label });
        setShowRenameDialog(true);
    };

    const handleDelete = async (status) => {
        const usageCount = statusUsage[status.label] || 0;
        
        if (usageCount > 0) {
            alert(`Cannot delete "${status.label}" - it's being used by ${usageCount} inspection request(s). Please reassign those requests first.`);
            return;
        }

        if (window.confirm(`Are you sure you want to delete the status "${status.label}"? This cannot be undone.`)) {
            try {
                await StatusOption.delete(status.id);
                loadStatuses();
            } catch (error) {
                console.error("Error deleting status:", error);
            }
        }
    };

    const handleSave = async () => {
        if (!editingStatus || !editingStatus.label) return;

        try {
            if (editingStatus.id) {
                const { id, ...data } = editingStatus;
                await StatusOption.update(id, data);
            } else {
                await StatusOption.create(editingStatus);
            }
            setShowDialog(false);
            setEditingStatus(null);
            loadStatuses();
        } catch (error) {
            console.error("Error saving status:", error);
        }
    };

    const handleBulkRename = async () => {
        if (!renameData.oldStatus || !renameData.newLabel) return;

        setIsUpdating(true);
        try {
            // First, update all inspection requests that use this status
            const requestsToUpdate = await InspectionRequest.filter({ status: renameData.oldStatus.label });
            
            const updatePromises = requestsToUpdate.map(request => 
                InspectionRequest.update(request.id, { status: renameData.newLabel })
            );
            
            await Promise.all(updatePromises);

            // Then update the status option itself
            const { id, ...statusData } = renameData.oldStatus;
            await StatusOption.update(id, { ...statusData, label: renameData.newLabel });

            setShowRenameDialog(false);
            setRenameData({ oldStatus: null, newLabel: '' });
            loadStatuses();
        } catch (error) {
            console.error("Error renaming status:", error);
        }
        setIsUpdating(false);
    };

    const getColorOption = (bg, text) => {
        return colorOptions.find(opt => opt.bg === bg && opt.text === text) || colorOptions[0];
    };

    const handleColorChange = (colorOption) => {
        setEditingStatus(prev => ({
            ...prev,
            color_bg: colorOption.bg,
            color_text: colorOption.text
        }));
    };

    return (
        <Card className="bg-white shadow-sm border-0">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-blue-600" />
                        Inspection Request Statuses
                    </div>
                    <Button size="sm" onClick={handleAddNew}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add New
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                    Manage the status labels for inspection requests. Usage counts show how many requests currently use each status.
                </p>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-800 mb-2">These statuses are used in:</p>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Dashboard page (Recent Activity table)</li>
                        <li>• Client Management page (status badges)</li>
                        <li>• Client Profile pages (status badges)</li>
                        <li>• Create Request form (status dropdown)</li>
                        <li>• All Requests page (status filters and badges)</li>
                    </ul>
                </div>
                <div className="space-y-2">
                    {isLoading ? (
                        <p>Loading...</p>
                    ) : statuses.map(status => (
                        <div key={status.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                            <div className="flex items-center gap-3">
                                <Badge className={`${status.color_bg} ${status.color_text} text-base py-1 px-3`}>
                                    {status.label}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                    {statusUsage[status.label] || 0} request(s) using this status
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(status)} title="Edit colors">
                                    <Edit className="w-4 h-4 text-gray-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleRename(status)} title="Rename and update all records">
                                    <RotateCcw className="w-4 h-4 text-blue-500" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDelete(status)} 
                                    title="Delete status"
                                    disabled={statusUsage[status.label] > 0}
                                >
                                    <Trash2 className={`w-4 h-4 ${statusUsage[status.label] > 0 ? 'text-gray-300' : 'text-red-500'}`} />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>

            {/* Create/Edit Status Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingStatus?.id ? 'Edit' : 'Add'} Status</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="label">Status Label</Label>
                            <Input
                                id="label"
                                value={editingStatus?.label || ''}
                                onChange={(e) => setEditingStatus({ ...editingStatus, label: e.target.value })}
                                placeholder="e.g., In Progress, Completed"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Color Scheme</Label>
                            <Select 
                                value={getColorOption(editingStatus?.color_bg, editingStatus?.color_text).name}
                                onValueChange={(value) => {
                                    const selected = colorOptions.find(opt => opt.name === value);
                                    if (selected) handleColorChange(selected);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {colorOptions.map((option) => (
                                        <SelectItem key={option.name} value={option.name}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 rounded ${option.bg} border`}></div>
                                                {option.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Preview</Label>
                            <div>
                                <Badge className={`${editingStatus?.color_bg} ${editingStatus?.color_text} text-base py-1 px-3`}>
                                    {editingStatus?.label || 'Sample Status'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!editingStatus?.label}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rename Status Dialog */}
            <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Status</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            <div className="text-sm text-yellow-800">
                                This will rename the status and update all {statusUsage[renameData.oldStatus?.label] || 0} inspection requests that currently use this status.
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Current Status</Label>
                            <div>
                                <Badge className={`${renameData.oldStatus?.color_bg} ${renameData.oldStatus?.color_text} text-base py-1 px-3`}>
                                    {renameData.oldStatus?.label}
                                </Badge>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="new_label">New Status Name</Label>
                            <Input
                                id="new_label"
                                value={renameData.newLabel}
                                onChange={(e) => setRenameData({ ...renameData, newLabel: e.target.value })}
                                placeholder="Enter new status name"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRenameDialog(false)}>Cancel</Button>
                        <Button 
                            onClick={handleBulkRename} 
                            disabled={!renameData.newLabel || isUpdating}
                            className="bg-yellow-600 hover:bg-yellow-700"
                        >
                            {isUpdating ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Rename & Update All Records
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}