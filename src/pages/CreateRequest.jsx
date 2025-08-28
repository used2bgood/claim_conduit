
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { InspectionRequest } from "@/api/entities";
import { StatusOption } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Building2, Phone, MapPin, User, Loader2, Shield, Hash, AlertTriangle } from "lucide-react";
import { debounce } from 'lodash';

export default function CreateRequest() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    client_name: "",
    property_address: "",
    client_contact_number: "",
    agent_contact_number: "",
    memo: "",
    urgent: false,
    claim_number: "",
    carrier: "",
    status: "" // Will be set to first available status
  });
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [statusOptions, setStatusOptions] = useState([]);

  useEffect(() => {
    async function fetchAndSetStatuses() {
      try {
        const options = await StatusOption.filter({ type: 'inspection' });
        setStatusOptions(options);
        
        // After fetching, if the current status isn't in the options, default to the first one.
        // If formData.status is initially an empty string, it will be set to the first option.
        if (options.length > 0 && !options.some(opt => opt.label === formData.status)) {
            setFormData(prev => ({ ...prev, status: options[0].label }));
        }
      } catch (error) {
        console.error("Error fetching status options:", error);
      }
    }
    fetchAndSetStatuses();
    // This effect should only run once on mount to fetch data.
    // The dependency on formData.status is removed to prevent re-fetching.
    // The logic inside handles setting a valid initial state.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const fetchAddressSuggestions = useCallback(async (query) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    setIsFetchingAddress(true);
    try {
      const response = await InvokeLLM({
        prompt: `Provide a list of up to 5 address suggestions for the query: "${query}". Prioritize addresses in Texas first, then other southern US states, then the rest of the US. Return a JSON object with a key "suggestions" which is an array of strings, where each string is a full, formatted address including city, state, and ZIP code.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
        },
      });

      if (response && Array.isArray(response.suggestions)) {
        setAddressSuggestions(response.suggestions);
      } else {
        setAddressSuggestions([]);
      }
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
      setAddressSuggestions([]);
    } finally {
      setIsFetchingAddress(false);
    }
  }, [setAddressSuggestions, setIsFetchingAddress]);

  const debouncedFetch = useMemo(() => debounce(fetchAddressSuggestions, 300), [fetchAddressSuggestions]);

  const handleAddressChange = (e) => {
    const value = e.target.value;
    handleInputChange('property_address', value);
    debouncedFetch(value);
  };

  const handleSuggestionClick = (suggestion) => {
    handleInputChange('property_address', suggestion);
    setAddressSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await InspectionRequest.create(formData);
      navigate(createPageUrl("Dashboard"));
    } catch (error) {
      console.error("Error creating request:", error);
      // Optionally show an error message to the user
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
            onClick={() => navigate(createPageUrl("Dashboard"))}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Inspection Request</h1>
            <p className="text-gray-600 mt-1">Fill in the details for the property inspection</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <User className="w-5 h-5 text-blue-600" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="client_name">Client Name *</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) => handleInputChange('client_name', e.target.value)}
                    placeholder="Enter client's full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_contact_number">Client Contact Number *</Label>
                  <Input
                    id="client_contact_number"
                    value={formData.client_contact_number}
                    onChange={(e) => handleInputChange('client_contact_number', e.target.value)}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="claim_number">Claim Number</Label>
                  <Input
                    id="claim_number"
                    value={formData.claim_number}
                    onChange={(e) => handleInputChange('claim_number', e.target.value)}
                    placeholder="Enter claim number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="carrier">Carrier</Label>
                  <Input
                    id="carrier"
                    value={formData.carrier}
                    onChange={(e) => handleInputChange('carrier', e.target.value)}
                    placeholder="Enter insurance carrier"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger id="status">
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

                <div className="space-y-2">
                  <Label>&nbsp;</Label> {/* This is for alignment */}
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="urgent"
                      checked={formData.urgent}
                      onCheckedChange={(checked) => handleInputChange('urgent', checked)}
                    />
                    <Label htmlFor="urgent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Mark as URGENT
                    </Label>
                  </div>
                  {formData.urgent && (
                    <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200 mt-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-orange-800">
                        For quickest response, we advise calling or messaging directly
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Building2 className="w-5 h-5 text-blue-600" />
                Property Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="property_address">Property Address *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="property_address"
                    value={formData.property_address}
                    onChange={handleAddressChange}
                    onBlur={() => setTimeout(() => setAddressSuggestions([]), 150)}
                    placeholder="Start typing a property address..."
                    required
                    autoComplete="off"
                    className="pl-10"
                  />
                  {isFetchingAddress && (
                    <Loader2 className="absolute right-3 top-3 w-4 h-4 text-gray-400 animate-spin" />
                  )}
                  {addressSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      <ul className="py-1">
                        {addressSuggestions.map((suggestion, index) => (
                          <li
                            key={index}
                            onMouseDown={() => handleSuggestionClick(suggestion)} // Use onMouseDown to prevent blur
                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                          >
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="memo">Property Notes & Comments</Label>
                <Textarea
                  id="memo"
                  value={formData.memo}
                  onChange={(e) => handleInputChange('memo', e.target.value)}
                  placeholder="Add any special instructions or notes..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("Dashboard"))}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
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
                  Create Request
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
